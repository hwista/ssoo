import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runnerEnvironment, runnerFixture } from '../ci/runner-fixture.mjs';

const fixtureEnv = runnerEnvironment();
const dockerFixture = `#!/usr/bin/env node
const fs = require('node:fs'), cp = require('node:child_process');
const args = process.argv.slice(2), mode = process.env.VERIFY_TEST_MODE;
fs.appendFileSync(process.env.VERIFY_TEST_LOG, JSON.stringify(args) + '\\n');
if (args[0] === 'build') process.exit(mode === 'build-fail' ? 41 : 0);
if (args[0] === 'run') {
  if (mode === 'term') process.kill(process.ppid, 'SIGTERM');
  if (mode === 'int') process.kill(process.ppid, 'SIGINT');
  process.exit(['run-fail', 'both-fail'].includes(mode) ? 42 : 0);
}
if (args[0] === 'image' && args[1] === 'rm') {
  // Cleanup must still own the same host lock as the verification run.
  const lock = cp.spawnSync('flock', ['-n', process.env.CI_APP_LOCK_FILE, 'true']);
  if (lock.status !== 1) process.exit(90);
  process.exit(['cleanup-fail', 'both-fail'].includes(mode) ? 43 : 0);
}
process.exit(91);
`;

for (const [mode, status] of [
  ['success', 0], ['run-fail', 42], ['cleanup-fail', 1], ['both-fail', 42],
  ['build-fail', 41], ['term', 143], ['int', 130],
]) test(`verify image lifecycle: ${mode}`, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-verify-job-'));
  try {
    const source = path.join(root, 'source'), bin = path.join(root, 'bin');
    fs.mkdirSync(path.join(source, 'scripts/ci'), { recursive: true });
    fs.writeFileSync(path.join(source, 'scripts/ci/release-job.sh'), 'exit 0\n');
    const git = (...args) => {
      const result = spawnSync('git', ['-C', source, ...args], { env: fixtureEnv, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
    };
    git('init', '-q'); git('add', '.');
    git('-c', 'user.name=CI Test', '-c', 'user.email=ci@example.invalid', 'commit', '-qm', 'fixture');
    fs.mkdirSync(bin); fs.writeFileSync(path.join(bin, 'docker'), dockerFixture, { mode: 0o755 });
    const sha = git('rev-parse', 'HEAD');
    const env = { ...fixtureEnv, PATH: `${bin}:${fixtureEnv.PATH}`, CI_PROJECT_DIR: source,
      CI_COMMIT_SHA: sha, APP_DIR: root, CI_RELEASE_STATE_DIR: path.join(root, 'state'),
      CI_APP_LOCK_FILE: path.join(root, 'lock'), VERIFY_TEST_MODE: mode, VERIFY_TEST_LOG: path.join(root, 'calls') };
    delete env.CI_VERIFY_TLS_CA_CERT_FILE;
    const result = spawnSync('bash', [runnerFixture(root), 'verify'], { env, encoding: 'utf8', timeout: 15_000 });
    assert.equal(result.status, status, result.stderr);
    const calls = fs.readFileSync(env.VERIFY_TEST_LOG, 'utf8').trim().split('\n').map(JSON.parse);
    const removals = calls.filter((args) => args[0] === 'image');
    assert.deepEqual(removals, mode === 'build-fail' ? [] : [['image', 'rm', `app-ci-verify:${sha}`]]);
    assert.deepEqual(calls.map((args) => args[0]), mode === 'build-fail' ? ['build'] : ['build', 'run', 'image']);
    if (mode.includes('cleanup') || mode === 'both-fail') assert.match(result.stderr, /verify image cleanup failed/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
