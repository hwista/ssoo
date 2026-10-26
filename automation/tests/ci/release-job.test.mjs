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
if(a[0]==='image'&&a[1]==='inspect'&&a[2]==='node:22') process.exit(0);
if(a[0]==='image'&&(a[1]==='ls'||a[1]==='prune')) process.exit(0);
if(a[0]==='system'&&a[1]==='df') { console.log('fixture storage'); process.exit(0); }
if(a[0]==='image'&&a[1]==='inspect') {
 const service=SERVICES.find(s=>a[2].startsWith('app-'+s+':'));
 if(!service) process.exit(90);
 console.log(scenario==='wrong-image'?'sha256:'+'f'.repeat(64):manifest.services[service].imageId);process.exit(0);
}
if(a[0]==='info'){console.log('/tmp');process.exit(0);}
if(a[0]==='run'&&a.includes('df')) {
 if(scenario==='layer-disk-full') {console.log('Filesystem 1024-blocks Used Available Capacity Mounted on\\ncontainerd 33554432 0 1024 100% /');process.exit(0);}
 const result=cp.spawnSync('df',['-Pk','/'],{stdio:'inherit'});process.exit(result.status??1);
}
if(a[0]==='builder'&&a[1]==='prune') {
 if(a.includes('--filter')) { log({event:'scheduled-cache-prune'}); if(scenario==='cleanup-fail') process.exit(1); process.exit(0); }
 log({event:'cache-prune'});fs.writeFileSync(root+'/cache-pruned','1');process.exit(0);
}
if(a[0]==='inspect' && a.some(x=>x.includes('State.Health'))){console.log(scenario==='staging-unhealthy'?'unhealthy':'healthy');process.exit(0);}
if(a[0]==='inspect' && a.some(x=>x.includes('Config.Image'))){console.log('pgvector/pgvector:pg17');process.exit(0);}
if(a[0]==='network'||a[0]==='rm'){log({event:'dbcheck-'+a[0]+'-'+a[1]});process.exit(0);}
if(a[0]==='run' && a[1]==='-d'){log({event:'dbcheck-postgres',alias:a[a.indexOf('--network-alias')+1]});console.log('fixture-dbcheck');process.exit(0);}
if(a[0]==='run' && a.join(' ').includes('db-check-only')){log({event:'dbcheck-init',compat:a.includes('DB_INIT_BASELINE_MODE=compat')});process.exit(scenario==='dbcheck-fail'?1:0);}
if(a[0]==='exec' && a.includes('pg_isready')){process.exit(0);}
if(a[0]==='exec' && a.includes('pg_restore')){log({event:'dbcheck-restore'});process.exit(0);}
if(a[0]==='inspect') {
 const service=SERVICES.find(s=>a[1]==='ssoo-'+s||a[1]==='fixture-'+s);
 if(!service) process.exit(91);
 console.log(manifest.services[service].imageId);process.exit(0);
}
if(a[0]==='exec' && a.join(' ').includes('pg_dump')){log({event:'backup-db'});process.stdout.write('fixture dump');process.exit(0);}
if(a[0]==='exec' && a.join(' ').includes('tar -czf')){log({event:'backup-runtime'});process.stdout.write('fixture runtime');process.exit(0);}
if(a[0]==='exec'){log({event:'core'});process.exit(scenario==='core-fail'?1:0);}
if(a[0]==='compose') {
 if(a.includes('config')){console.log(JSON.stringify(config));process.exit(0);}
 if(a.includes('ps')){console.log('fixture-'+a[a.length-1]);process.exit(0);}
 if(a.includes('stop')){log({event:'stop'});process.exit(0);}
 if(a.includes('run')) {
  const event=a.includes('node')?'config-check':a.includes('pnpm')?'db-verify':'db-apply';log({event,old,compat:a.includes('DB_INIT_BASELINE_MODE=compat')});
  if(event==='db-apply'&&scenario==='db-kill'){process.kill(process.ppid,'SIGKILL');process.exit(1);}
  if(scenario===event+'-fail') process.exit(1);
  process.exit(0);
 }
 if(a.includes('up')){log({event:'up',old,services:a.slice(a.indexOf('--no-deps')+1)});process.exit(scenario==='web-fail'&&!old&&a[a.length-1]==='crm'?1:0);}
}
console.error('unhandled fixture Docker command',a);process.exit(92);
`.replace('const a=process.argv', `const SERVICES=${JSON.stringify(SERVICES)};\nconst a=process.argv`);

function fixture(scenario, { changedDb = false, mode = 'apply', dbCheck = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-release-job-test-'));
  const source = path.join(root, 'source'); fs.mkdirSync(path.join(source, 'scripts/ci'), { recursive: true });
  for (const file of ['release-job.sh', 'release-state.mjs']) fs.copyFileSync(path.join(repo, 'scripts/ci', file), path.join(source, 'scripts/ci', file));
  fs.cpSync(path.join(repo, 'scripts/storage'), path.join(source, 'scripts/storage'), { recursive: true });
  fs.writeFileSync(path.join(source, 'scripts/ci/diagnose-runtime.sh'), 'echo "diagnostics fixture"\n');
  const bin = path.join(root, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'docker'), dockerFixture, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  // All engine inputs must belong to the fixture, including disk capacity.
  // Reading the runner's real /tmp made success depend on concurrent builds.
  fs.writeFileSync(path.join(bin, 'df'), `#!/bin/sh
free=16777216
case "$FIXTURE_SCENARIO" in
  disk-full) free=1024 ;;
  verify-tight) free=9437184 ;;
  disk-recovered) [ -f "$FIXTURE_ROOT/cache-pruned" ] || free=1024 ;;
esac
printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\\nfixture 33554432 0 %s 0%% /tmp\\n' "$free"
`, { mode: 0o755 });
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
    CI_RELEASE_RUNTIME_DIR: root, CI_RELEASE_ENV_FILE: path.join(root, '.env'), CI_RELEASE_DMS_ENV_FILE: path.join(root, 'dms.env'), CI_DEPLOY_MODE: mode,
    CI_BUILD_MIN_FREE_KB: '8388608', CI_SMOKE_TOKEN_FILE: path.join(root, 'token'), CI_RELEASE_BACKUP_EVIDENCE: path.join(root, 'fixture-backup.json'), FIXTURE_ROOT: root, FIXTURE_RELEASE: dir, FIXTURE_SCENARIO: scenario };
  if (mode === 'staging') {
    // Staging needs neither a smoke token, verified backup evidence nor a rehearsal proof.
    delete env.CI_SMOKE_TOKEN_FILE; delete env.CI_RELEASE_BACKUP_EVIDENCE;
    fs.rmSync(path.join(dir, 'rehearsal.json'));
    if (dbCheck) write(path.join(dir, 'db-check.json'), { status: 'passed', releaseId: manifest.releaseId, checkedAt: new Date().toISOString() });
  }
  return { root, dir, old, manifest, run: (job = 'deploy') => {
    const result = spawnSync('bash', [path.join(source, 'scripts/ci/release-job.sh'), job], { cwd: source, env, encoding: 'utf8', timeout: 30_000 });
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
check('insufficient disk after cache cleanup blocks deployment without touching apps or DB', 'disk-full', {}, (r, f) => {
  assert.notEqual(r.status, 0); assert.match(r.stderr, /insufficient disk space/);
  assert.equal(r.last.releaseId, f.old.releaseId);
  assert.deepEqual(r.events, [{ event: 'cache-prune' }]);
});
check('capacity is rechecked after cache cleanup before allowing deployment', 'disk-recovered', {}, r => {
  assert.equal(r.status, 0, r.stderr); assert.equal(r.state, 'committed');
  assert.equal(r.events[0].event, 'cache-prune');
  assert.equal(r.events.filter(e => e.event === 'cache-prune').length, 1);
  assert.deepEqual(r.events.filter(e => e.event === 'up').flatMap(e => e.services), ['crm']);
});
check('full containerd layer storage blocks deployment even when DockerRootDir has capacity', 'layer-disk-full', {}, (r, f) => {
  assert.notEqual(r.status, 0); assert.match(r.stderr, /insufficient disk space/);
  assert.equal(r.last.releaseId, f.old.releaseId);
  assert.deepEqual(r.events, [{ event: 'cache-prune' }]);
});
test('verify prepare needs 10 GiB free while plan keeps the 8 GiB build threshold', () => {
  for (const scenario of ['success', 'verify-tight']) {
    const f = fixture(scenario);
    try {
      const r = f.run('prepare');
      assert.match(r.stdout, /required_kb=10485760/);
      if (scenario === 'success') {
        assert.equal(r.status, 0, r.stderr); assert.ok(!r.events.some(e => e.event === 'cache-prune'));
      } else {
        assert.notEqual(r.status, 0); assert.match(r.stderr, /insufficient disk space/);
        assert.equal(r.events.filter(e => e.event === 'cache-prune').length, 2);
      }
    } finally { f.cleanup(); }
  }
  const f = fixture('verify-tight');
  try {
    // 9 GiB passes plan's own capacity check; the fixture's existing plan.json then stops it.
    const r = f.run('plan');
    assert.match(r.stdout, /required_kb=8388608/); assert.doesNotMatch(r.stderr, /insufficient disk space/);
    assert.match(r.stderr, /plan exists/);
  } finally { f.cleanup(); }
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
check('staging mode dumps first, runs compat db-init without stopping apps and commits on healthy images', 'success', { changedDb: true, mode: 'staging' }, (r, f) => {
  assert.equal(r.status, 0, r.stderr); assert.equal(r.state, 'committed'); assert.equal(r.last.releaseId, f.manifest.releaseId);
  const names = r.events.map(e => e.event);
  assert.ok(names.indexOf('backup-db') >= 0 && names.indexOf('backup-runtime') >= 0);
  assert.ok(names.indexOf('backup-runtime') < names.indexOf('db-apply'));
  assert.ok(r.events.find(e => e.event === 'db-apply').compat);
  assert.ok(!names.includes('stop') && !names.includes('db-verify') && !names.includes('smoke'));
  assert.deepEqual(r.events.filter(e => e.event === 'up').flatMap(e => e.services), ['server', 'admin', 'crm', 'pms', 'dms', 'sns']);
  assert.ok(fs.existsSync(path.join(f.dir, 'staging-backup', 'SHA256SUMS')));
});
check('staging db-init failure keeps the previous apps running', 'db-apply-fail', { changedDb: true, mode: 'staging' }, (r, f) => {
  assert.notEqual(r.status, 0); assert.equal(r.state, 'recovery-required'); assert.equal(r.last.releaseId, f.old.releaseId);
  assert.ok(!r.events.some(e => e.event === 'stop' || e.event === 'up'));
});
check('staging deploy refuses to touch anything without a passed db_check', 'success', { changedDb: true, mode: 'staging', dbCheck: false }, (r, f) => {
  assert.notEqual(r.status, 0); assert.match(r.stderr, /Run db_check/);
  assert.equal(r.events.length, 0); assert.equal(r.last.releaseId, f.old.releaseId);
});
for (const [name, scenario, passes] of [['db_check runs db-init twice on a copy of the live DB and records the pass', 'success', true],
  ['a failed db_check records nothing and cleans up', 'dbcheck-fail', false]]) {
  test(name, () => {
    const f = fixture(scenario, { changedDb: true, mode: 'staging', dbCheck: false });
    try {
      const r = f.run('db-check');
      const names = r.events.map(e => e.event);
      if (passes) {
        assert.equal(r.status, 0, r.stderr);
        assert.equal(r.events.filter(e => e.event === 'dbcheck-init' && e.compat).length, 2);
        assert.equal(JSON.parse(fs.readFileSync(path.join(f.dir, 'db-check.json'))).status, 'passed');
      } else {
        assert.notEqual(r.status, 0);
        assert.ok(!fs.existsSync(path.join(f.dir, 'db-check.json')));
      }
      assert.equal(r.events.find(e => e.event === 'dbcheck-postgres').alias, 'ssoo-postgres');
      assert.ok(names.indexOf('backup-db') < names.indexOf('dbcheck-restore'));
      assert.ok(names.includes('dbcheck-network-rm'));
      assert.ok(!names.some(n => ['stop', 'up', 'db-apply', 'config-check'].includes(n)));
    } finally { f.cleanup(); }
  });
}
check('staging never commits a release whose containers are unhealthy', 'staging-unhealthy', { mode: 'staging' }, (r, f) => {
  assert.notEqual(r.status, 0); assert.notEqual(r.state, 'committed'); assert.equal(r.last.releaseId, f.old.releaseId);
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

check('post-deploy cleanup failure fails job but preserves committed deployment', 'cleanup-fail', {}, (r, f) => {
  assert.notEqual(r.status, 0); assert.equal(r.state, 'committed');
  assert.equal(r.last.releaseId, f.manifest.releaseId);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.dir, 'storage-status.json'))).status, 'failed');
});
