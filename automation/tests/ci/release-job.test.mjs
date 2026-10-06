import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { SERVICES, planRelease, stable } from '../../../scripts/ci/release-state.mjs';

const repo = path.resolve(import.meta.dirname, '../../..');
const dockerFixture = `#!/usr/bin/env node
const fs=require('node:fs'), cp=require('node:child_process'), path=require('node:path');
const a=process.argv.slice(2), root=process.env.FIXTURE_ROOT, scenario=process.env.FIXTURE_SCENARIO;
const dir=process.env.FIXTURE_RELEASE, config=JSON.parse(fs.readFileSync(root+'/fixture-config.json'));
const manifest=JSON.parse(fs.readFileSync(dir+'/release.json'));
const log=(event)=>fs.appendFileSync(root+'/events.jsonl',JSON.stringify(event)+'\\n');
const old=a.some(x=>x.includes('/1-'));
if(a[0]==='run' && a.includes('scripts/ci/release-state.mjs')) {
 const i=a.indexOf('scripts/ci/release-state.mjs');const r=cp.spawnSync(process.execPath,[path.join(process.env.APP_DIR,a[i]),...a.slice(i+1)],{stdio:'inherit'});process.exit(r.status??1);
}
if(a[0]==='run' && a.includes('scripts/ci/verify-platform-release.mjs')) {
 const i=a.indexOf('scripts/ci/verify-platform-release.mjs');const m=JSON.parse(fs.readFileSync(a[i+1]));const rollback=m.releaseId.startsWith('1-');
 log({event:'smoke',rollback});
 if((!rollback&&['smoke-fail','stale-evidence-fail','rollback-fail'].includes(scenario))||(rollback&&scenario==='rollback-fail')) process.exit(1);
 fs.writeFileSync(a[i+2],JSON.stringify({status:'passed',releaseId:m.releaseId}));process.exit(0);
}
if(a[0]==='image'&&a[1]==='inspect') {
 const service=SERVICES.find(s=>a[2].startsWith('app-'+s+':'));
 if(!service) process.exit(90);
 console.log(scenario==='wrong-image'?'sha256:'+'f'.repeat(64):manifest.services[service].imageId);process.exit(0);
}
if(a[0]==='info'){console.log('/tmp');process.exit(0);}
if(a[0]==='inspect') {
 const service=SERVICES.find(s=>a[1]==='ssoo-'+s||a[1]==='fixture-'+s);
 if(!service) process.exit(91);
 console.log(manifest.services[service].imageId);process.exit(0);
}
if(a[0]==='exec'){log({event:'core'});process.exit(scenario==='core-fail'?1:0);}
if(a[0]==='compose') {
 if(a.includes('config')){console.log(JSON.stringify(config));process.exit(0);}
 if(a.includes('ps')){console.log('fixture-'+a[a.length-1]);process.exit(0);}
 if(a.includes('stop')){log({event:'stop'});process.exit(0);}
 if(a.includes('run')) {
  const event=a.includes('node')?'config-check':a.includes('pnpm')?'db-verify':'db-apply';log({event,old});
  if(event==='db-apply'&&scenario==='db-kill'){process.kill(process.ppid,'SIGKILL');process.exit(1);}
  if(scenario===event+'-fail') process.exit(1);
  process.exit(0);
 }
 if(a.includes('up')){log({event:'up',old,services:a.slice(a.indexOf('--no-deps')+1)});process.exit(scenario==='web-fail'&&!old&&a[a.length-1]==='crm'?1:0);}
}
console.error('unhandled fixture Docker command',a);process.exit(92);
`.replace('const a=process.argv', `const SERVICES=${JSON.stringify(SERVICES)};\nconst a=process.argv`);

function fixture(scenario, { changedDb = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-release-job-test-'));
  const source = path.join(root, 'source'); fs.mkdirSync(path.join(source, 'scripts/ci'), { recursive: true });
  for (const file of ['release-job.sh', 'release-state.mjs']) fs.copyFileSync(path.join(repo, 'scripts/ci', file), path.join(source, 'scripts/ci', file));
  fs.writeFileSync(path.join(source, 'scripts/ci/diagnose-runtime.sh'), 'echo "diagnostics fixture"\n');
  const bin = path.join(root, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'docker'), dockerFixture, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const sha = 'b'.repeat(40), oldSha = 'a'.repeat(40);
  const config = { services: Object.fromEntries(SERVICES.map(s => [s, { build: { context: source }, environment: { DATABASE_URL: 'postgresql://fixture@postgres/fixture' } }])) };
  const old = planRelease({ sha: oldSha, pipeline: '1', files: [], config, key: 'test', baseImages: [] });
  for (const [i, s] of SERVICES.entries()) old.services[s].imageId = 'sha256:' + String(i).repeat(64);
  const manifest = planRelease({ sha, pipeline: '2', files: [], config, key: 'test', baseImages: [], previous: old, incremental: true });
  manifest.services.crm.deploy = true;
  manifest.database.changed = changedDb;
  const dir = path.join(root, manifest.releaseId); fs.mkdirSync(dir);
  const oldDir = path.join(root, old.releaseId); fs.mkdirSync(oldDir);
  const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value));
  for (const [target, value] of [[dir, manifest], [oldDir, old]]) {
    write(path.join(target, 'release.json'), value); write(path.join(target, 'plan.json'), value);
    write(path.join(target, 'compose.runtime.json'), config);
  }
  write(path.join(root, 'last-successful.json'), old);
  write(path.join(root, 'fixture-config.json'), config); write(path.join(dir, 'config.json'), config);
  write(path.join(dir, 'rehearsal.json'), { status: 'passed', manifestHash: createHash('sha256').update(stable(manifest)).digest('hex'), checkedAt: new Date().toISOString() });
  // Synthetic restore proof exists only inside this fake-engine unit fixture.
  const archive = path.join(root, 'fixture-archive'); fs.writeFileSync(archive, 'fixture');
  write(path.join(root, 'fixture-backup.json'), { status: 'passed', finishedAt: new Date().toISOString(), database: { status: 'passed', restoreTargetWasEphemeral: true, source: { host: 'postgres', port: '5432', name: 'fixture' } }, runtime: { sourceStableDuringSnapshot: true }, archive: { path: archive, sha256: createHash('sha256').update('fixture').digest('hex') } });
  fs.writeFileSync(path.join(root, 'token'), 'fixture-not-a-real-token');
  fs.writeFileSync(path.join(root, '.env'), '');
  if (scenario === 'stale-evidence-fail') write(path.join(dir, 'evidence.json'), { status: 'passed', releaseId: manifest.releaseId });
  if (scenario === 'stale') write(path.join(root, 'last-successful.json'), { ...old, releaseId: '3-' + oldSha });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, APP_DIR: source, CI_COMMIT_SHA: sha, CI_PIPELINE_ID: '2', CI_RELEASE_STATE_DIR: root,
    CI_RELEASE_RUNTIME_DIR: root, CI_RELEASE_ENV_FILE: path.join(root, '.env'), CI_RELEASE_DMS_ENV_FILE: path.join(root, 'dms.env'), CI_DEPLOY_MODE: 'apply',
    CI_SMOKE_TOKEN_FILE: path.join(root, 'token'), CI_RELEASE_BACKUP_EVIDENCE: path.join(root, 'fixture-backup.json'), FIXTURE_ROOT: root, FIXTURE_RELEASE: dir, FIXTURE_SCENARIO: scenario };
  return { root, dir, old, manifest, run: () => {
    const result = spawnSync('bash', [path.join(source, 'scripts/ci/release-job.sh'), 'deploy'], { cwd: source, env, encoding: 'utf8', timeout: 30_000 });
    const events = fs.existsSync(path.join(root, 'events.jsonl')) ? fs.readFileSync(path.join(root, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse) : [];
    const state = fs.existsSync(path.join(dir, 'state.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'state.json'))).status : null;
    const last = JSON.parse(fs.readFileSync(path.join(root, 'last-successful.json')));
    return { ...result, events, state, last };
  }, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}
function check(name, scenario, options, assertions) {
  test(name, () => { const f = fixture(scenario, options); try { assertions(f.run(), f); } finally { f.cleanup(); } });
}
check('unchanged DB deploy updates CRM alone and commits after smoke', 'success', {}, (r, f) => {
  assert.equal(r.status, 0, r.stderr); assert.equal(r.state, 'committed'); assert.equal(r.last.releaseId, f.manifest.releaseId);
  assert.deepEqual(r.events.filter(e => e.event === 'up').flatMap(e => e.services), ['crm']);
  assert.ok(!r.events.some(e => e.event === 'db-apply'));
});
for (const scenario of ['stale', 'wrong-image', 'config-check-fail']) check(`${scenario} leaves containers and DB untouched`, scenario, {}, r => {
  assert.notEqual(r.status, 0); assert.ok(!r.events.some(e => ['stop', 'db-apply', 'up'].includes(e.event)));
});
check('migration failure stops old writers, never replaces apps or runs old db-init', 'db-apply-fail', { changedDb: true }, (r, f) => {
  assert.notEqual(r.status, 0); assert.equal(r.state, 'recovery-required'); assert.equal(r.last.releaseId, f.old.releaseId);
  assert.ok(r.events.findIndex(e => e.event === 'stop') < r.events.findIndex(e => e.event === 'db-apply'));
  assert.ok(!r.events.some(e => e.event === 'up' || (e.event === 'db-apply' && e.old)));
});
check('DB contract failure blocks every app replacement', 'db-verify-fail', {}, r => {
  assert.notEqual(r.status, 0); assert.equal(r.state, 'recovery-required'); assert.ok(!r.events.some(e => e.event === 'up'));
});
check('core failure after a DB change cannot roll back old apps', 'core-fail', { changedDb: true }, r => {
  assert.notEqual(r.status, 0); assert.equal(r.state, 'recovery-required'); assert.ok(!r.events.some(e => e.old));
  assert.deepEqual(r.events.filter(e => e.event === 'up').flatMap(e => e.services), ['server']);
});
check('web start failure restores previous apps without running old db-init', 'web-fail', {}, (r, f) => {
  assert.notEqual(r.status, 0); assert.equal(r.state, 'rolled-back'); assert.equal(r.last.releaseId, f.old.releaseId);
  assert.ok(r.events.some(e => e.event === 'up' && e.old)); assert.ok(!r.events.some(e => e.event === 'db-apply'));
});
check('failed authenticated smoke cannot be swallowed by later successful image checks', 'smoke-fail', {}, (r, f) => {
  assert.notEqual(r.status, 0, r.stdout); assert.equal(r.state, 'rolled-back'); assert.equal(r.last.releaseId, f.old.releaseId);
});
check('failed rollback smoke keeps recovery-required and never advances success pointer', 'rollback-fail', {}, (r, f) => {
  assert.notEqual(r.status, 0); assert.equal(r.state, 'recovery-required'); assert.equal(r.last.releaseId, f.old.releaseId);
});
check('a stale successful smoke report cannot turn a new failed probe into success', 'stale-evidence-fail', {}, (r, f) => {
  assert.notEqual(r.status, 0); assert.equal(r.state, 'rolled-back'); assert.equal(r.last.releaseId, f.old.releaseId);
});
test('SIGKILL during DB application leaves a durable marker and refuses replay before any new mutation', () => {
  const f = fixture('db-kill', { changedDb: true });
  try {
    const first = f.run();
    assert.equal(first.signal, 'SIGKILL'); assert.equal(first.state, 'db-applying');
    const before = first.events.length;
    const next = f.run();
    assert.notEqual(next.status, 0); assert.match(next.stderr, /already attempted/);
    assert.equal(next.state, 'db-applying'); assert.equal(next.events.length, before);
  } finally { f.cleanup(); }
});
