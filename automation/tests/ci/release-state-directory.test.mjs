import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(import.meta.dirname, '../../..');
for (const explicit of [false, true]) test(`runner creates persistent state without /var/lib permission (explicit=${explicit})`, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-state-directory-'));
  try {
    const source = path.join(root, 'source');
    fs.mkdirSync(path.join(source, 'scripts/ci'), { recursive: true });
    fs.writeFileSync(path.join(source, 'scripts/ci/ai-review.sh'), 'printf "%s" "$PWD" > "$STATE_TEST_RESULT"\n');
    const git = (...args) => {
      const r = spawnSync('git', ['-C', source, ...args], { encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
    };
    git('init', '-q'); git('add', '.');
    git('-c', 'user.name=CI Test', '-c', 'user.email=ci@example.invalid', 'commit', '-qm', 'fixture');
    const sha = git('rev-parse', 'HEAD');
    const state = explicit ? path.join(root, 'configured') : path.join(root, 'state/ssoo/releases');
    const env = { ...process.env, CI_PROJECT_DIR: source, CI_COMMIT_SHA: sha, CI_PIPELINE_ID: '1',
      APP_DIR: path.join(root, 'runtime'), XDG_STATE_HOME: path.join(root, 'state'),
      CI_RELEASE_STATE_DIR: explicit ? state : '', CI_APP_LOCK_FILE: path.join(root, 'runner.lock'),
      STATE_TEST_RESULT: path.join(root, 'result') };
    const r = spawnSync('bash', [path.join(repo, 'scripts/ci/run-app-job.sh'), 'ai-review'], { env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(fs.readFileSync(env.STATE_TEST_RESULT, 'utf8'), path.join(state, 'sources', sha));
    assert.equal(fs.statSync(state).mode & 0o077, 0);

    // The direct release entrypoint resolves the same persistent root. Its
    // plan-only gate must still refuse deployment and never invoke an app.
    const bin = path.join(root, 'bin'); fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'docker'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    const direct = spawnSync('bash', [path.join(repo, 'scripts/ci/release-job.sh'), 'deploy'], {
      env: { ...env, PATH: `${bin}:${process.env.PATH}`, CI_DEPLOY_MODE: 'plan-only',
        CI_RELEASE_RUNTIME_DIR: root, CI_RELEASE_ENV_FILE: path.join(root, '.env'), CI_RELEASE_DMS_ENV_FILE: path.join(root, 'dms.env') },
      encoding: 'utf8',
    });
    assert.equal(direct.status, 1, direct.stderr);
    assert.match(direct.stdout, /plan-only.*no runtime changes/);
    assert.ok(fs.existsSync(path.join(state, `1-${sha}`)));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
