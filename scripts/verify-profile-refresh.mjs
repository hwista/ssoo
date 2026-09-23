import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real private request/cache implementation without exporting it to consumers.
const source = await fs.readFile(new URL('../packages/web-auth/src/user-surface.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('user-surface.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set([
  'DEFAULT_API_BASE_URL', 'PROFILE_FEED_LIMIT', 'GET_REQUEST_DEDUPE_TTL_MS', 'getRequestCache',
  'normalizeApiBaseUrl', 'getErrorMessage', 'unwrapApiResponse', 'performJsonRequest',
  'requestJson', 'createSsooUserSurfaceApi',
]);
const selected = ast.statements.filter((node) => {
  if (ts.isFunctionDeclaration(node)) return names.has(node.name?.text);
  return ts.isVariableStatement(node) && node.declarationList.declarations.some((d) => names.has(d.name.getText(ast)));
});
assert.equal(selected.length, names.size, 'request implementation declarations changed; update test extraction');
const code = ts.transpileModule(selected.map((node) => node.getText(ast)).join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

function setup() {
  const calls = [];
  let now = 1000;
  let respond = async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: { version: calls.length } }) });
  class SharedApiError extends Error {
    constructor(message, status) { super(message); this.status = status; }
  }
  const context = vm.createContext({
    Headers, SharedApiError, Date: { now: () => now },
    applySharedAuthHeaders: (headers) => headers,
    restoreSharedAuthSession: async () => ({ success: false }),
    fetch: async (url, init) => { calls.push({ url, method: init.method }); return respond(url, init); },
  });
  vm.runInContext(code, context);
  return {
    api: context.createSsooUserSurfaceApi('https://example.test/api/'),
    otherApi: context.createSsooUserSurfaceApi('https://other.test/api'),
    calls,
    advance: (ms) => { now += ms; },
    respond: (fn) => { respond = fn; },
  };
}
const results = [];
async function check(name, run) { await run(setup()); results.push({ name, passed: true }); }

await check('ordinary GETs retain five-second deduplication', async ({ api, calls, advance }) => {
  const first = await api.getProfile('1');
  assert.equal(await api.getProfile('1'), first);
  assert.equal(calls.length, 1);
  advance(5000);
  assert.notEqual(await api.getProfile('1'), first);
  assert.equal(calls.length, 2);
});
await check('mutation refresh evicts only target profile and feed', async ({ api, otherApi, calls }) => {
  const profile = await api.getProfile('1');
  const feed = await api.getProfileFeed('1');
  const unrelated = await api.getProfile('2');
  const unrelatedFeed = await api.getProfileFeed('2');
  const account = await api.getAccountProfile();
  const other = await otherApi.getProfile('1');
  api.invalidate('1', '1', false);
  assert.notEqual(await api.getProfile('1'), profile);
  assert.notEqual(await api.getProfileFeed('1'), feed);
  assert.equal(await api.getProfile('2'), unrelated);
  assert.equal(await api.getProfileFeed('2'), unrelatedFeed);
  assert.equal(await api.getAccountProfile(), account);
  assert.equal(await otherApi.getProfile('1'), other);
  assert.equal(calls.length, 8);
});
await check('own profile aliases and settings account refresh together', async ({ api, calls }) => {
  await api.getProfile(); await api.getProfile('1'); await api.getProfileFeed('1'); await api.getAccountProfile();
  api.invalidate(null, '1', true);
  await api.getProfile('me'); await api.getProfile('1'); await api.getProfileFeed('1'); await api.getAccountProfile();
  assert.equal(calls.length, 8);
});
await check('request failures are evicted and keep HTTP status for recovery', async ({ api, respond, calls }) => {
  respond(async () => ({ ok: false, status: 404, json: async () => ({ message: 'missing' }) }));
  await assert.rejects(api.getProfile('1'), (error) => error.status === 404 && error.message === 'missing');
  respond(async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: { recovered: true } }) }));
  assert.equal((await api.getProfile('1')).recovered, true);
  assert.equal(calls.length, 2);
});
for (const failOld of [false, true]) {
  await check(`late old ${failOld ? 'failure' : 'success'} cannot replace newer cache`, async ({ api, respond, calls }) => {
    let settle;
    respond(() => new Promise((resolve) => { settle = resolve; }));
    const old = api.getProfile('1').catch((error) => error);
    api.invalidate('1', '1', false);
    respond(async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: { latest: true } }) }));
    const latest = await api.getProfile('1');
    settle({ ok: !failOld, status: failOld ? 500 : 200, json: async () => ({ success: true, data: { old: true } }) });
    await old;
    assert.equal(await api.getProfile('1'), latest);
    assert.equal(calls.length, 2);
  });
}
await check('failed writes preserve last successful read and do not fake success', async ({ api, respond, calls }) => {
  const before = await api.getProfile('1');
  respond(async () => ({ ok: false, status: 500, json: async () => ({ message: 'save failed' }) }));
  await assert.rejects(api.follow('1'), (error) => error.status === 500);
  assert.equal(await api.getProfile('1'), before);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, 'POST');
});
console.log(JSON.stringify({ passed: results.length, results }, null, 2));
