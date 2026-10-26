import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(import.meta.dirname, '../../..');
const fixtureScript = `#!/usr/bin/env node
const fs = require('node:fs');
const a = process.argv.slice(2), root = process.env.FIXTURE_ROOT, scenario = process.env.FIXTURE_SCENARIO;
fs.appendFileSync(root + '/calls.jsonl', JSON.stringify(a) + '\\n');
const services = ['server','db-init','admin','crm','pms','dms','sns'];
if (a[0] === 'info') console.log('fixture-engine');
else if (a[0] === 'compose' && a.includes('config')) console.log(JSON.stringify({ name: 'ssoo', services: { server: { image: 'fixture-server:latest' } } }));
else if (a[0] === 'compose') { if (scenario === 'build-fail') process.exit(1); }
else if (a[0] === 'system') console.log('fixture disk usage');
else if (a[0] === 'ps') console.log(services.join('\\n'));
else if (a[0] === 'inspect') console.log(JSON.stringify(services.map((s,i) => ({ Image: 'sha256:'+String(i).repeat(64), Config: { Labels: { 'com.docker.compose.project': 'ssoo', 'com.docker.compose.service': s } }, State: { Status: s === 'db-init' ? 'exited' : 'running', ExitCode: 0, Running: s !== 'db-init', Health: { Status: scenario === 'unhealthy' && s === 'server' ? 'unhealthy' : 'healthy' } } }))));
else if (a[0] === 'image' && a[1] === 'ls') console.log('fixture-server:latest');
else if (a[0] === 'image' && a[1] === 'tag') {}
else if (a[0] === 'builder') { if (scenario === 'cleanup-fail') process.exit(1); }
else if (a[0] === 'run') console.log('Filesystem 1024-blocks Used Available Capacity Mounted on\\nfixture 99999999 0 '+(scenario==='disk-full'?1:99999999)+' 1% /');
else { console.error('Unexpected command', a); process.exit(90); }
`;
for (const scenario of ['success', 'build-fail', 'unhealthy', 'cleanup-fail', 'disk-full']) test(`local mandatory storage lifecycle: ${scenario}`, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-job-'));
  try {
    fs.cpSync(path.join(repo, 'scripts/storage'), path.join(root, 'scripts/storage'), { recursive: true });
    const script = path.join(root, 'scripts/storage/docker-job.mjs');
    fs.writeFileSync(script, fs.readFileSync(script, 'utf8').replace('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', '/nonexistent-fixture-windows'));
    fs.mkdirSync(path.join(root, 'bin'));
    fs.writeFileSync(path.join(root, 'bin/docker'), fixtureScript, { mode: 0o755 });
    const state = path.join(root, 'state');
    const result = spawnSync(process.execPath, [script, 'local', 'up'], { cwd: root, encoding: 'utf8', timeout: 20_000,
      env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, FIXTURE_ROOT: root, FIXTURE_SCENARIO: scenario, SSOO_STORAGE_STATE_DIR: state } });
    const report = JSON.parse(fs.readFileSync(path.join(state, fs.readdirSync(state)[0], 'latest-report.json')));
    const calls = fs.readFileSync(path.join(root, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(result.status, scenario === 'success' ? 0 : 1, result.stderr);
    assert.equal(report.status, scenario === 'success' ? 'passed' : 'failed');
    assert.ok(report.after);
    assert.ok(!calls.some((a) => ['rm', 'volume'].includes(a[0]) || a.includes('--force') && a[0] !== 'builder'), 'no container/volume/forced image deletion');
    if (scenario === 'success') {
      assert.equal(report.deployment, 'verified');
      const up = calls.findIndex((a) => a[0] === 'compose' && a.includes('up'));
      assert.ok(calls.slice(0, up).some((a) => a[0] === 'builder'));
      assert.ok(calls.slice(up + 1).some((a) => a[0] === 'builder'));
    }
    if (['disk-full', 'cleanup-fail'].includes(scenario)) assert.ok(!calls.some((a) => a.includes('up')), 'precheck failure must block deployment');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('all six public build/up commands use the shared locked wrapper', () => {
  const { scripts } = JSON.parse(fs.readFileSync(path.join(repo, 'package.json')));
  for (const prefix of ['docker', 'docker:local-test', 'docker:production']) {
    for (const op of ['build', 'up']) assert.match(scripts[`${prefix}:${op}`], /scripts\/storage\/docker-job\.sh/);
  }
  const ci = fs.readFileSync(path.join(repo, 'scripts/ci/release-job.sh'), 'utf8');
  assert.match(ci, /state state committed\s+[^]*deploy_started=false\s+storage_cleanup/);
});

test('six repeated local deployments converge to current plus three previous image sets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-repeat-'));
  try {
    fs.cpSync(path.join(repo, 'scripts/storage'), path.join(root, 'scripts/storage'), { recursive: true });
    const script = path.join(root, 'scripts/storage/docker-job.mjs');
    fs.writeFileSync(script, fs.readFileSync(script, 'utf8').replace('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', '/nonexistent-fixture-windows'));
    fs.mkdirSync(path.join(root, 'bin'));
    const fake = fixtureScript
      .replace("const services =", "const version = Number(fs.readFileSync(root+'/version')); const tags = JSON.parse(fs.readFileSync(root+'/tags')); const services =")
      .replace("String(i).repeat(64)", "(i+version*10).toString(16).padStart(64,'0')")
      .replace("if (scenario === 'build-fail') process.exit(1);", "if (a.includes('up')) fs.writeFileSync(root+'/version', String(version+1));")
      .replace("console.log('fixture-server:latest');", "console.log(a.includes('--no-trunc') ? (tags[a.at(-1)] || '') : 'fixture-server:latest');")
      .replace("else if (a[0] === 'image' && a[1] === 'tag') {}", "else if(a[0]==='image' && a[1]==='tag'){ tags[a[3]]=a[2]; fs.writeFileSync(root+'/tags',JSON.stringify(tags)); }\nelse if(a[0]==='image' && a[1]==='rm'){ delete tags[a[2]]; fs.writeFileSync(root+'/tags',JSON.stringify(tags)); }");
    fs.writeFileSync(path.join(root, 'bin/docker'), fake, { mode: 0o755 });
    fs.writeFileSync(path.join(root, 'version'), '1');
    fs.writeFileSync(path.join(root, 'tags'), '{}');
    for (let n = 0; n < 6; n++) {
      const r = spawnSync(process.execPath, [script, 'local', 'up'], { cwd: root, encoding: 'utf8', timeout: 20_000,
        env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, FIXTURE_ROOT: root, FIXTURE_SCENARIO: 'success', SSOO_STORAGE_STATE_DIR: path.join(root, 'state') } });
      assert.equal(r.status, 0, r.stderr);
    }
    const historyDir = path.join(root, 'state', fs.readdirSync(path.join(root, 'state'))[0]);
    const history = JSON.parse(fs.readFileSync(path.join(historyDir, 'history.json')));
    assert.equal(history.length, 4);
    const tags = JSON.parse(fs.readFileSync(path.join(root, 'tags')));
    assert.equal(Object.keys(tags).length, 28);
    assert.ok(Object.keys(tags).every((tag) => tag.startsWith('ssoo-retained-')));
    assert.ok(Object.values(tags).every((id) => parseInt(id.slice(7), 16) >= 40), 'oldest three generations removed');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
