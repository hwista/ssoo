import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { planRelease, SERVICES, APPS, validateManifest, runtimeCompose, rehearsalCompose, assertCurrent, affected, stable, cli, retirementCandidates, sourceHash } from '../../../scripts/ci/release-state.mjs';
import { verifyPlatform } from '../../../scripts/ci/verify-platform-release.mjs';
const sha = 'a'.repeat(40);
const config = { services: Object.fromEntries(SERVICES.map((s) => [s, { build: { context: '/source', dockerfile: `${s}/Dockerfile`, args: { SSOO_RELEASE_SHA: sha } }, environment: { PASSWORD: 'p$a', DATABASE_URL: 'postgresql://user:secret@postgres/db' } }])), secrets: {} };
config.services.postgres = { image: 'pgvector/pgvector:pg17', volumes: ['production:/var/lib/postgresql/data'] };
config.services.server.depends_on = { postgres: { condition: 'service_healthy' }, 'db-init': { condition: 'service_completed_successfully' } };
config.services.server.volumes = ['/production/documents:/var/lib/ssoo/documents'];
const base = { sha, pipeline: '10', files: [{ path: 'apps/web/crm/page.tsx', hash: 'one' }], config, key: 'local-key', baseImages: ['base-digest'] };
function sealed(plan = planRelease(base)) {
  for (const [i, service] of SERVICES.entries()) plan.services[service].imageId = `sha256:${String(i).repeat(64)}`;
  return plan;
}
test('first release builds all seven services', () => {
  const plan = planRelease(base);
  assert.equal(Object.values(plan.services).filter((x) => x.action === 'build').length, 7);
  assert.equal(plan.database.changed, true);
});
test('unchanged sources preserve source identity across deployment SHAs', () => {
  const previous = sealed();
  const plan = planRelease({ ...base, sha: 'b'.repeat(40), pipeline: '11', previous, incremental: true });
  assert.equal(Object.values(plan.services).filter((x) => x.action === 'reuse').length, 7);
  assert.equal(plan.services.crm.sourceCommit, sha);
  assert.equal(plan.database.changed, false);
});
test('CRM source changes rebuild and deploy CRM alone', () => {
  const plan = planRelease({ ...base, sha: 'b'.repeat(40), previous: sealed(), incremental: true, files: [{ path: 'apps/web/crm/page.tsx', hash: 'two' }] });
  assert.deepEqual(Object.keys(plan.services).filter((s) => plan.services[s].action === 'build'), ['crm']);
  assert.deepEqual(Object.keys(plan.services).filter((s) => plan.services[s].deploy), ['crm']);
});
test('shared browser packages affect all five apps; lockfile and unknown files fail safe', () => {
  assert.deepEqual(affected('packages/web-ui/src/button.tsx'), APPS);
  assert.deepEqual(affected('pnpm-lock.yaml'), SERVICES);
  assert.deepEqual(affected('unknown-input'), SERVICES);
  assert.deepEqual(affected('docs/common/guide.md'), []);
});
test('runtime secret changes redeploy without rebaking', () => {
  const next = structuredClone(config); next.services.crm.environment.PASSWORD = 'new';
  const plan = planRelease({ ...base, config: next, previous: sealed(), incremental: true });
  assert.equal(plan.services.crm.action, 'reuse'); assert.equal(plan.services.crm.deploy, true);
  assert.equal(plan.services.pms.deploy, false);
  assert.ok(!JSON.stringify(plan).includes('new'));
});
test('public build arg and base digest changes rebuild', () => {
  const next = structuredClone(config); next.services.crm.build.args.NEXT_PUBLIC_API_URL = 'https://new/api';
  const plan = planRelease({ ...base, config: next, previous: sealed(), incremental: true });
  assert.equal(plan.services.crm.action, 'build');
  const baseChanged = planRelease({ ...base, previous: sealed(), incremental: true, baseImages: ['changed'] });
  assert.ok(Object.values(baseChanged.services).every((s) => s.action === 'build'));
});
test('stale plans, missing services, wrong image ownership and mutable references are rejected', () => {
  const manifest = sealed();
  assert.throws(() => assertCurrent(manifest, { releaseId: 'newer' }), /Stale/);
  const missing = structuredClone(manifest); delete missing.services.sns;
  assert.throws(() => validateManifest(missing), /seven/);
  manifest.services.crm.imageRef = 'app-pms:latest';
  assert.throws(() => validateManifest(manifest), /provenance/);
});
test('runtime compose fixes image IDs, preserves dollar secrets, and never replays db-init', () => {
  const runtime = runtimeCompose(config, sealed());
  assert.equal(runtime.services.crm.image, `sha256:${'3'.repeat(64)}`);
  assert.equal(runtime.services.crm.build, undefined);
  assert.equal(runtime.services.crm.environment.PASSWORD, 'p$$a');
  assert.equal(runtime.services.server.depends_on['db-init'], undefined);
  assert.deepEqual(runtime.services['db-init'].profiles, ['operations']);
});
test('rehearsal has no production volumes, published ports, external network or email worker', () => {
  const clone = rehearsalCompose(config, sealed(), '/releases/10');
  assert.equal(clone.networks.default.internal, true);
  assert.ok(!JSON.stringify(clone).includes('/production/'));
  assert.equal(clone.services.server.environment.AUTH_EMAIL_OUTBOX_WORKER_ENABLED, 'false');
  assert.equal(clone.services.server.environment.DMS_GIT_PROD_REMOTE_URL, 'file:///rehearsal/git.git');
  assert.ok(Object.values(clone.services).every((s) => !s.ports && !s.container_name));
  assert.equal(clone.services['db-init'].environment.DB_INIT_BASELINE_MODE, 'strict');
  assert.ok(clone.services.server.volumes.some((v) => v.target === '/etc/gitconfig' && v.read_only));
});
test('source fingerprint hashes symlink text without reading targets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-symlink-'));
  try {
    fs.symlinkSync('/missing/one', path.join(root, 'link'));
    const first = sourceHash(path.join(root, 'link'));
    fs.unlinkSync(path.join(root, 'link'));
    fs.symlinkSync('/missing/two', path.join(root, 'link'));
    assert.notEqual(sourceHash(path.join(root, 'link')), first);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('stable fingerprint is independent of object key order', () => assert.equal(stable({ b: 1, a: 2 }), stable({ a: 2, b: 1 })));
function requestFixture(fail) {
  return async (url, init) => {
    const parsed = new URL(url); const app = parsed.hostname;
    if (fail?.(url, init)) return { ok: false, status: 503, json: async () => ({}) };
    if (parsed.pathname === '/api/auth/me') {
      assert.equal(init.headers['X-SSOO-CSRF'], '1');
      const principal = { userId: '123', loginId: 'smoke' };
      return { ok: true, status: 200, json: async () => app === 'server' ? { success: true, data: principal } : principal };
    }
    let data = {};
    if (parsed.pathname === '/api/health') data = { service: app, status: 'ready', releaseSha: sha };
    if (parsed.pathname === '/api/health/readiness') data = { services: APPS.map((app) => ({ app, status: 'ready' })) };
    return { ok: true, status: 200, json: async () => ({ success: true, data }) };
  };
}
const smoke = { manifest: sealed(), serverUrl: 'http://server/api', appUrls: Object.fromEntries(APPS.map((a) => [a, `http://${a}`])), token: 'never-print' };
test('release gate covers every web/auth proxy and domain read', async () => {
  const requests = [];
  const report = await verifyPlatform({ ...smoke, request: async (url, init) => { requests.push([url, init]); return requestFixture()(url, init); } });
  assert.equal(report.status, 'passed'); assert.equal(report.checks.length, 24);
  for (const app of APPS) assert.ok(requests.some(([url, init]) => url === `http://${app}/api/auth/me` && init.method === 'POST' && init.headers.Origin === `http://${app}`));
  assert.ok(!JSON.stringify(report).includes(smoke.token));
});
test('CRM deployment exercises authenticated domain access without requiring business launch readiness', async () => {
  const requests = [];
  const request = async (url, init) => {
    requests.push(url);
    if (url.includes('/crm/operations/launch-readiness')) throw new Error('Business setup is incomplete');
    if (url.endsWith('/crm/opportunities')) {
      assert.equal(init.headers.Authorization, `Bearer ${smoke.token}`);
      assert.equal(init.method, 'GET');
      return { ok: true, status: 200, json: async () => ({ success: true, data: { items: [], summary: {} } }) };
    }
    return requestFixture()(url, init);
  };
  assert.equal((await verifyPlatform({ ...smoke, request })).status, 'passed');
  assert.ok(requests.includes('http://server/api/crm/opportunities'));
  assert.ok(requests.every((url) => !url.includes('launch-readiness')));
});
for (const status of [401, 403, 500]) test(`CRM domain HTTP ${status} still blocks deployment`, async () => {
  const request = async (url, init) => url.endsWith('/crm/opportunities')
    ? { ok: false, status, json: async () => ({ success: false }) } : requestFixture()(url, init);
  await assert.rejects(verifyPlatform({ ...smoke, request }), /crm domain read failed/);
});
for (const app of APPS) test(`${app} runtime readiness failure blocks release`, async () => {
  await assert.rejects(verifyPlatform({ ...smoke, request: requestFixture((url) => url === `http://server/api/health/apps/${app}`) }), /runtime readiness failed/);
});
for (const app of APPS) test(`${app} web failure blocks release`, async () => {
  await assert.rejects(verifyPlatform({ ...smoke, request: requestFixture((url) => url === `http://${app}/api/health`) }), /failed/);
});
test('missing account and old source image block release', async () => {
  await assert.rejects(verifyPlatform({ ...smoke, token: '' }), /account/);
  const request = async (url, init) => { const r = await requestFixture()(url, init); if (url === 'http://crm/api/health') r.json = async () => ({ success: true, data: { service: 'crm', status: 'ready', releaseSha: 'old' } }); return r; };
  await assert.rejects(verifyPlatform({ ...smoke, request }), /identity mismatch/);
});

test('secret file contents invalidate only their build/runtime consumers', () => {
  const next = structuredClone(config);
  next.services.crm.secrets = [{ source: 'runtime' }];
  next.services.server.build.secrets = [{ source: 'ca' }];
  const before = { ...base, config: next, secretHashes: { runtime: 'old', ca: 'old' } };
  const previous = sealed(planRelease(before));
  const runtime = planRelease({ ...before, previous, incremental: true, secretHashes: { runtime: 'new', ca: 'old' } });
  assert.equal(runtime.services.crm.action, 'reuse');
  assert.equal(runtime.services.crm.deploy, true);
  assert.equal(runtime.services.pms.deploy, false);
  const build = planRelease({ ...before, previous, incremental: true, secretHashes: { runtime: 'old', ca: 'new' } });
  assert.equal(build.services.server.action, 'build');
  assert.equal(build.services.crm.action, 'reuse');
  assert.throws(() => planRelease({ ...before, secretHashes: {} }), /fingerprint/);
});
test('retention protects retained releases, containers, and recent images', () => {
  const previous = sealed();
  const images = Array.from({ length: 7 }, (_, i) => ({
    Id: `sha256:${String(i).repeat(64)}`,
    Created: new Date(2026, 0, i + 1).toISOString(),
    RepoTags: [`app-server:${String(i).repeat(40)}`],
  }));
  assert.deepEqual(retirementCandidates(images, [previous], []), []);
  assert.deepEqual(retirementCandidates(images, [], [images[0].Id]), images.slice(1, 4).reverse().map((x) => x.RepoTags[0]));
});
test('sealed runtime uses strict DB mode even if legacy compose was compat', () => {
  const next = structuredClone(config);
  next.services['db-init'].environment.DB_INIT_BASELINE_MODE = 'compat';
  next.services['db-init'].environment.DB_INIT_SEED_MODE = 'demo';
  assert.equal(runtimeCompose(next, sealed()).services['db-init'].environment.DB_INIT_BASELINE_MODE, 'strict');
  assert.equal(runtimeCompose(next, sealed()).services['db-init'].environment.DB_INIT_SEED_MODE, 'upgrade');
  assert.equal(rehearsalCompose(next, sealed(), '/tmp/rehearsal').services['db-init'].environment.DB_INIT_SEED_MODE, 'upgrade');
});
test('CLI rejects unproved commit, stale environment/rehearsal, wrong backup source and tampered archive', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-contract-'));
  const dir = path.join(root, `10-${sha}`); fs.mkdirSync(dir);
  const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
  const manifest = sealed();
  try {
    write('release.json', manifest); write('plan.json', manifest);
    write('config.json', config); write('current-config.json', config);
    write('evidence.json', { status: 'failed', releaseId: manifest.releaseId });
    assert.throws(() => cli('commit', root, dir), /verification/);
    const manifestHash = createHash('sha256').update(stable(manifest)).digest('hex');
    write('rehearsal.json', { status: 'passed', manifestHash, checkedAt: new Date().toISOString() });
    assert.doesNotThrow(() => cli('check', root, dir));
    write('current-config.json', {});
    assert.throws(() => cli('check', root, dir), /Environment changed/);
    write('current-config.json', config);
    write('rehearsal.json', { status: 'passed', manifestHash, checkedAt: '2000-01-01' });
    assert.throws(() => cli('check', root, dir), /expired/);
    const archive = path.join(root, 'snapshot.tgz'); fs.writeFileSync(archive, 'backup bytes');
    const evidence = { status: 'passed', finishedAt: new Date().toISOString(), database: { status: 'passed', restoreTargetWasEphemeral: true, source: { host: 'postgres', name: 'db', port: '5432' } }, runtime: { sourceStableDuringSnapshot: true }, archive: { path: archive, sha256: createHash('sha256').update('backup bytes').digest('hex') } };
    write('backup-evidence.json', evidence);
    assert.doesNotThrow(() => cli('backup-check', root, dir));
    evidence.database.source.port = '5433'; write('backup-evidence.json', evidence);
    assert.throws(() => cli('backup-check', root, dir), /this database/);
    evidence.database.source.port = '5432'; write('backup-evidence.json', evidence);
    fs.writeFileSync(archive, 'changed');
    assert.throws(() => cli('backup-check', root, dir), /checksum/);
    write('evidence.json', { status: 'passed', releaseId: manifest.releaseId });
    cli('commit', root, dir);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'last-successful.json'))).releaseId, manifest.releaseId);
    assert.throws(() => cli('check', root, dir), /Stale/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('an auth proxy error or different principal cannot pass as a successful session', async () => {
  for (const body of [{ error: 'denied' }, { userId: 'different' }]) {
    const request = async (url, init) => url === 'http://crm/api/auth/me'
      ? { ok: true, status: 200, json: async () => body } : requestFixture()(url, init);
    await assert.rejects(verifyPlatform({ ...smoke, request }), /session/);
  }
});

test('retention also bounds old CI verification images without deleting container references', () => {
  const images = Array.from({ length: 3 }, (_, i) => ({ Id: `sha256:${String(i).repeat(64)}`, Created: new Date(2026, 0, i+1).toISOString(), RepoTags: [`app-ci-verify:${String(i).repeat(40)}`] }));
  assert.deepEqual(retirementCandidates(images, [], [images[0].Id]), [images[1].RepoTags[0]]);
});
