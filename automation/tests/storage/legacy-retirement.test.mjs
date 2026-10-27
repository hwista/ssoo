import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { planLegacyRetirement } from '../../../scripts/storage/legacy-image-retirement.mjs';
import { SERVICES } from '../../../scripts/ci/release-state.mjs';

const repo = path.resolve(import.meta.dirname, '../../..');
const approved = JSON.parse(fs.readFileSync(path.join(repo, 'scripts/storage/legacy-image-retirement.json'))).images;
const images = () => approved.map(item => ({ Id: item.imageId, RepoTags: [item.imageRef], Created: '2026-07-01T00:00:00Z' }));
const manifest = imageId => ({ schemaVersion: 1, releaseId: `1-${'a'.repeat(40)}`, targetCommit: 'a'.repeat(40),
  services: Object.fromEntries(SERVICES.map(service => [service, { imageRef: `app-${service}:${'a'.repeat(40)}`,
    imageId, sourceCommit: 'a'.repeat(40), inputHash: 'a'.repeat(64), runtimeHash: 'b'.repeat(64) }])) });

test('only the 13 audited legacy identities can be selected; interrupted cleanup is resumable', () => {
  assert.equal(approved.length, 13);
  assert.deepEqual(planLegacyRetirement(images(), [], [], approved), approved);
  assert.deepEqual(planLegacyRetirement(images().slice(2), [], [], approved), approved.slice(2));
});
test('all container references and all supplied release manifests protect images', () => {
  for (const Running of [true, false]) {
    assert.throws(() => planLegacyRetirement(images(), [{ Image: approved[0].imageId, State: { Running } }], [], approved), /protects/);
  }
  assert.throws(() => planLegacyRetirement(images(), [], [manifest(approved[0].imageId)], approved), /protects/);
  assert.throws(() => planLegacyRetirement(images(), [], [{}], approved));
});
test('changed identity, backup aliases, unknown age and young images block deletion', () => {
  for (const change of [item => { item.Id = `sha256:${'f'.repeat(64)}`; },
    item => { item.RepoTags.push('app-server:ci-backup-protected'); },
    item => { item.Created = 'unknown'; }, item => { item.Created = new Date().toISOString(); }]) {
    const candidate = images(); change(candidate[0]);
    assert.throws(() => planLegacyRetirement(candidate, [], [], approved));
  }
  assert.throws(() => planLegacyRetirement(images(), [], [], [{ imageRef: 'postgres:latest', imageId: approved[0].imageId }]));
});

const dockerFixture = `#!/usr/bin/env node
const fs=require('node:fs'), cp=require('node:child_process');
const a=process.argv.slice(2), root=process.env.LEGACY_FIXTURE_ROOT;
const data=JSON.parse(fs.readFileSync(root+'/inventory.json'));
fs.appendFileSync(root+'/calls.jsonl',JSON.stringify(a)+'\\n');
if(a[0]==='system') {console.log('fixture storage');process.exit(0);}
if(a[0]==='image' && a[1]==='ls') {console.log(data.images.map(x=>x.Id).join('\\n'));process.exit(0);}
if(a[0]==='image' && a[1]==='inspect') {
 if(a.includes('--format')) console.log(data.images.find(x=>x.RepoTags.includes(a[2])).Id);
 else console.log(JSON.stringify(data.images));process.exit(0);
}
if(a[0]==='ps') {if(!a.includes('--filter')) console.log('fixture-running');process.exit(0);}
if(a[0]==='inspect') {
 console.log(a.includes('--format')?'fixture-running '+data.containers[0].Image+' running fixed-start healthy':JSON.stringify(data.containers));process.exit(0);
}
if(a[0]==='run') {
 const i=a.findIndex(x=>x.endsWith('/legacy-image-retirement.mjs'));
 if(i<0) process.exit(90);
 const r=cp.spawnSync(process.execPath,a.slice(i),{stdio:'inherit'});process.exit(r.status??1);
}
if(a[0]==='image' && a[1]==='rm') {
 if(a.length!==3 || a.includes('--force')) process.exit(91);
 if(process.env.LEGACY_FIXTURE_SCENARIO==='rm-fail') process.exit(1);
 data.images=data.images.filter(x=>!x.RepoTags.includes(a[2]));fs.writeFileSync(root+'/inventory.json',JSON.stringify(data));process.exit(0);
}
process.exit(92);
`;
for (const scenario of ['success', 'container', 'manifest', 'changed', 'alias', 'rm-fail']) {
  test(`locked legacy cleanup execution: ${scenario}`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-retirement-'));
    try {
      const source = path.join(root, 'source'), state = path.join(root, 'state'), bin = path.join(root, 'bin');
      fs.mkdirSync(path.join(source, 'scripts'), { recursive: true }); fs.mkdirSync(state); fs.mkdirSync(bin);
      for (const dir of ['ci', 'storage']) fs.cpSync(path.join(repo, 'scripts', dir), path.join(source, 'scripts', dir), { recursive: true });
      const gate = path.join(source, 'scripts/storage/windows-gate.sh');
      fs.writeFileSync(gate, fs.readFileSync(gate, 'utf8').replace('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', '/nonexistent-fixture-windows'));
      const data = { images: images(), containers: [{ Image: `sha256:${'8'.repeat(64)}` }] };
      if (scenario === 'container') data.containers[0].Image = approved[0].imageId;
      if (scenario === 'changed') data.images[0].Id = `sha256:${'9'.repeat(64)}`;
      if (scenario === 'alias') data.images[0].RepoTags.push('app-server:ci-backup-protected');
      fs.writeFileSync(path.join(root, 'inventory.json'), JSON.stringify(data));
      fs.writeFileSync(path.join(state, 'last-successful.json'), JSON.stringify(manifest(scenario === 'manifest' ? approved[0].imageId : `sha256:${'8'.repeat(64)}`)));
      fs.writeFileSync(path.join(bin, 'docker'), dockerFixture, { mode: 0o755 });
      const result = spawnSync('bash', [path.join(source, 'scripts/storage/ci-cleanup-legacy.sh')], { encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CI_JOB_ID: '1', CI_RELEASE_STATE_DIR: state,
          CI_APP_LOCK_FILE: path.join(root, 'lock'), LEGACY_FIXTURE_ROOT: root, LEGACY_FIXTURE_SCENARIO: scenario }, timeout: 20_000 });
      const calls = fs.readFileSync(path.join(root, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      const removed = calls.filter(a => a[0] === 'image' && a[1] === 'rm');
      assert.equal(result.status === 0, scenario === 'success', result.stderr);
      assert.equal(removed.length, scenario === 'success' ? 13 : scenario === 'rm-fail' ? 1 : 0);
      assert.ok(!calls.some(a => ['rm', 'volume', 'stop', 'restart', 'builder'].includes(a[0]) || a.includes('prune') || a.includes('--force')));
      if (scenario === 'success') assert.match(result.stdout, /health unchanged/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
}
