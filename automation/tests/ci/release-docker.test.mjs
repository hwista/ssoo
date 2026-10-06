#!/usr/bin/env node
// Opt-in, real Docker/Compose orchestration test. Uses purpose-built HTTP/DB
// fixtures and synthetic prerequisite evidence confined to its private /tmp
// directory. It is NOT application readiness, real auth, or backup validation.
// Run: node automation/tests/ci/release-docker.test.mjs --run
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { SERVICES, APPS, planRelease, cli, stable } from '../../../scripts/ci/release-state.mjs';

if (!process.argv.includes('--run')) {
  console.log('Opt-in real Docker fixture test; use --run. No Docker actions performed.');
  process.exit(0);
}
const repo = path.resolve(import.meta.dirname, '../../..');
const lab = fs.mkdtempSync(path.join(os.tmpdir(), 'ssoo-release-docker-'));
fs.chmodSync(lab, 0o700);
const root = path.join(lab, 'releases'), source = path.join(lab, 'source');
fs.mkdirSync(root); fs.mkdirSync(path.join(source, 'scripts/ci'), { recursive: true });
for (const file of ['release-job.sh', 'release-state.mjs', 'verify-platform-release.mjs', 'diagnose-runtime.sh']) {
  fs.copyFileSync(path.join(repo, 'scripts/ci', file), path.join(source, 'scripts/ci', file));
}
fs.writeFileSync(path.join(lab, '.env'), '');
fs.writeFileSync(path.join(lab, 'token'), 'docker-fixture-token', { mode: 0o600 });
const project = `ssoo-release-test-${path.basename(lab).split('-').at(-1).toLowerCase()}`;
const fixtureTags = [1, 2, 3].map(n => `${project}:${n}`), imageRefs = new Set();
const dbUrl = 'postgresql://fixture:fixture-only@postgres:5432/deploy_fixture_test';
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const report = { scope: 'actual Docker orchestration with protocol fixtures; synthetic prerequisites', project, lab, checks: [] };
async function command(bin, args, { env = process.env, allowFailure = false, timeout = 240_000 } = {}) {
  return await new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { env, cwd: source, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    proc.stdout.on('data', x => { stdout += x; }); proc.stderr.on('data', x => { stderr += x; });
    const timer = setTimeout(() => proc.kill('SIGTERM'), timeout);
    proc.on('error', e => { clearTimeout(timer); reject(e); });
    proc.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0 || allowFailure) resolve({ code, signal, stdout, stderr });
      else reject(new Error(`${bin} ${args.slice(0, 3).join(' ')} failed (${code}/${signal}): ${stderr.slice(-2500)}`));
    });
  });
}
const docker = (args, options) => command('docker', args, options);
const compose = file => ['compose', '-p', project, '-f', file];
let currentRuntime;
function config({ failAuth = false, failDb = false } = {}) {
  const services = {
    postgres: { image: 'pgvector/pgvector:pg17', environment: { POSTGRES_USER: 'fixture', POSTGRES_PASSWORD: 'fixture-only', POSTGRES_DB: 'deploy_fixture_test' }, volumes: ['database:/var/lib/postgresql/data'] },
  };
  for (const service of SERVICES) services[service] = {
    image: fixtureTags[0], build: { context: source },
    environment: { DATABASE_URL: dbUrl, FIXTURE_SERVICE: service, PORT: String(service === 'server' ? 4000 : 3000 + APPS.indexOf(service)),
      ...(service === 'crm' && failAuth ? { FIXTURE_AUTH_FAIL: 'true' } : {}),
      ...(service === 'db-init' && failDb ? { FIXTURE_DB_FAIL: 'true' } : {}) },
    ...(service === 'db-init' ? { entrypoint: ['bash', '/fixture/db-init.sh'] } : {}),
  };
  return { services, networks: { default: { internal: true } }, volumes: { database: {} } };
}
async function candidate(n, files, options = {}) {
  const sha = hash(`${lab}-${n}`).slice(0, 40), dir = path.join(root, `${n}-${sha}`);
  fs.mkdirSync(dir); write(path.join(source, 'compose.yaml'), config(options)); write(path.join(source, 'compose.staging.yaml'), { services: {} });
  cli('env-overlay', root, dir, path.join(lab, '.env'), path.join(lab, 'absent-dms.env'), source);
  const resolved = JSON.parse((await docker(['compose', '-p', project, '--project-directory', lab, '--env-file', path.join(lab, '.env'),
    '-f', path.join(source, 'compose.yaml'), '-f', path.join(source, 'compose.staging.yaml'), '-f', path.join(dir, 'compose.env.json'), 'config', '--format', 'json'])).stdout);
  const previous = fs.existsSync(path.join(root, 'last-successful.json')) ? read(path.join(root, 'last-successful.json')) : null;
  const plan = planRelease({ sha, pipeline: String(n), files, config: resolved, previous, key: 'fixture-key', baseImages: ['fixture-base'], incremental: true });
  for (const service of SERVICES) {
    const item = plan.services[service];
    if (item.action === 'build') {
      await docker(['tag', fixtureTags[n === 1 ? 0 : n === 3 ? 2 : 1], item.imageRef]); imageRefs.add(item.imageRef);
    }
  }
  write(path.join(dir, 'plan.json'), plan); write(path.join(dir, 'config.json'), resolved);
  write(path.join(dir, 'images.json'), JSON.parse((await docker(['image', 'inspect', ...SERVICES.map(s => plan.services[s].imageRef)])).stdout));
  cli('seal', root, dir);
  const manifest = read(path.join(dir, 'release.json'));
  // Only preconditions are synthetic. Never publish these files as release
  // evidence; the actual scripts, containers, SQL effects and results are tested.
  write(path.join(dir, 'rehearsal.json'), { testFixture: true, status: 'passed', manifestHash: hash(stable(manifest)), checkedAt: new Date().toISOString() });
  const archive = path.join(root, 'synthetic-fixture-backup'); fs.writeFileSync(archive, 'not a production backup');
  const backup = path.join(root, 'synthetic-backup.json');
  write(backup, { testFixture: true, status: 'passed', finishedAt: new Date().toISOString(), database: { status: 'passed', restoreTargetWasEphemeral: true, source: { host: 'postgres', port: '5432', name: 'deploy_fixture_test' } }, runtime: { sourceStableDuringSnapshot: true }, archive: { path: archive, sha256: hash(fs.readFileSync(archive)) } });
  currentRuntime = path.join(dir, 'compose.runtime.json');
  const env = { ...process.env, APP_DIR: source, CI_COMMIT_SHA: sha, CI_PIPELINE_ID: String(n), CI_RELEASE_STATE_DIR: root,
    CI_RELEASE_RUNTIME_DIR: lab, CI_RELEASE_ENV_FILE: path.join(lab, '.env'), CI_RELEASE_DMS_ENV_FILE: path.join(lab, 'absent-dms.env'),
    COMPOSE_PROJECT_NAME: project, CI_DEPLOY_MODE: 'apply', CI_BUILD_MIN_FREE_KB: '1', CI_SMOKE_TOKEN_FILE: path.join(lab, 'token'),
    CI_RELEASE_BACKUP_EVIDENCE: backup, CI_SMOKE_NETWORK: `${project}_default`, CI_SERVER_SMOKE_URL: 'http://server:4000/api' };
  for (const [i, app] of APPS.entries()) env[`CI_${app.toUpperCase()}_SMOKE_URL`] = `http://${app}:${3000 + i}`;
  return { dir, manifest, runtime: currentRuntime, async deploy() {
    const r = await command('bash', [path.join(source, 'scripts/ci/release-job.sh'), 'deploy'], { env, allowFailure: true });
    fs.writeFileSync(path.join(dir, 'deployment.log'), r.stdout + r.stderr, { mode: 0o600 });
    return { ...r, status: read(path.join(dir, 'state.json')).status };
  } };
}
async function containers() {
  const ids = (await docker(['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`])).stdout.trim().split('\n').filter(Boolean);
  const rows = ids.length ? JSON.parse((await docker(['inspect', ...ids])).stdout) : [];
  return Object.fromEntries(rows.map(x => [x.Config.Labels['com.docker.compose.service'], { id: x.Id, image: x.Image, running: x.State.Running, env: x.Config.Env }]));
}
async function sql(query) {
  return (await docker([...compose(currentRuntime), 'exec', '-T', 'postgres', 'psql', '-U', 'fixture', '-d', 'deploy_fixture_test', '-Atqc', query])).stdout.trim();
}
function passed(name, detail) { report.checks.push({ name, status: 'passed', detail }); console.log(`[release-docker] passed: ${name}`); write(path.join(lab, 'report.json'), report); }
try {
  for (const [i, tag] of fixtureTags.entries()) await docker(['build', '--pull=false', '--build-arg', `FIXTURE_REVISION=${i + 1}`, '-t', tag, path.join(repo, 'automation/fixtures/release-docker')]);
  const files = [{ path: 'apps/web/crm/fixture-input', hash: 'one' }, { path: 'packages/database/fixture-input', hash: 'one' }];
  const first = await candidate(1, files);
  await docker([...compose(first.runtime), 'up', '-d', 'postgres']);
  for (let n = 0; n < 30; n++) {
    const ready = await docker([...compose(first.runtime), 'exec', '-T', 'postgres', 'pg_isready', '-U', 'fixture', '-d', 'deploy_fixture_test'], { allowFailure: true });
    if (ready.code === 0) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const baseline = await first.deploy(); assert.equal(baseline.code, 0, baseline.stderr); assert.equal(baseline.status, 'committed');
  const before = await containers(); assert.equal(await sql('SELECT count(*) FROM deployment_fixture.events'), '1');
  passed('initial deploy', 'actual PostgreSQL apply, six containers, 24 protocol smoke checks, committed pointer');

  files[0].hash = 'two'; const second = await candidate(2, files);
  assert.deepEqual(SERVICES.filter(s => second.manifest.services[s].action === 'build'), ['crm']);
  const selected = await second.deploy(); assert.equal(selected.code, 0, selected.stderr);
  const after = await containers(); assert.notEqual(after.crm.id, before.crm.id); assert.notEqual(after.crm.image, before.crm.image);
  for (const service of ['server', 'admin', 'pms', 'dms', 'sns', 'postgres']) assert.equal(after[service].id, before[service].id);
  assert.equal(await sql('SELECT count(*) FROM deployment_fixture.events'), '1');
  passed('CRM-only replacement', 'only CRM container/image changed; other five apps and PostgreSQL IDs retained; DB init not replayed');

  files[0].hash = 'three'; const third = await candidate(3, files, { failAuth: true });
  assert.notEqual(third.manifest.services.crm.imageId, after.crm.image);
  const rollback = await third.deploy(); assert.notEqual(rollback.code, 0); assert.equal(rollback.status, 'rolled-back');
  const restored = await containers(); assert.equal(restored.crm.image, after.crm.image);
  assert.ok(!restored.crm.env.includes('FIXTURE_AUTH_FAIL=true'));
  assert.equal(read(path.join(root, 'last-successful.json')).releaseId, second.manifest.releaseId);
  assert.equal(await sql('SELECT count(*) FROM deployment_fixture.events'), '1');
  passed('failed smoke rolls back image and environment', 'failed pipeline; prior success pointer retained; old db-init never replayed');

  files[1].hash = 'two'; const fourth = await candidate(4, files, { failAuth: true });
  assert.equal(fourth.manifest.database.changed, true);
  const incompatible = await fourth.deploy(); assert.notEqual(incompatible.code, 0); assert.equal(incompatible.status, 'recovery-required');
  const remaining = await containers(); assert.ok(remaining.crm.env.includes('FIXTURE_AUTH_FAIL=true'));
  assert.equal(await sql('SELECT count(*) FROM deployment_fixture.events'), '2');
  assert.equal(read(path.join(root, 'last-successful.json')).releaseId, second.manifest.releaseId);
  passed('DB changed then app failure forbids rollback', 'new DB event remains; recovery-required; old success pointer unchanged');

  const fifth = await candidate(5, files, { failDb: true });
  const beforeMigrationFailure = await containers(); const partial = await fifth.deploy();
  assert.notEqual(partial.code, 0); assert.equal(partial.status, 'recovery-required');
  const stopped = await containers();
  for (const service of ['server', ...APPS]) { assert.equal(stopped[service].running, false); assert.equal(stopped[service].id, beforeMigrationFailure[service].id); }
  assert.equal(await sql("SELECT outcome FROM deployment_fixture.events ORDER BY id DESC LIMIT 1"), 'partial-failure');
  assert.equal(await sql('SELECT count(*) FROM deployment_fixture.events'), '3');
  passed('partial migration failure stops old writers', 'six existing app containers stopped, zero replacements, partial SQL state retained');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.message; process.exitCode = 1; console.error(`[release-docker] ${error.message}`);
} finally {
  if (currentRuntime) {
    const cleanup = await docker([...compose(currentRuntime), '--profile', 'operations', 'down', '--volumes', '--remove-orphans'], { allowFailure: true });
    report.cleanup = cleanup.code === 0 ? 'passed' : 'failed';
    if (cleanup.code !== 0) process.exitCode = 1;
  }
  for (const ref of [...imageRefs, ...fixtureTags]) await docker(['image', 'rm', ref], { allowFailure: true });
  write(path.join(lab, 'report.json'), report); console.log(`[release-docker] evidence: ${lab}/report.json`);
}
