import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const require = createRequire(new URL('../packages/web-shell/package.json', import.meta.url));
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { resolveSsooError, readSsooErrorMetadata, getSsooErrorMessage, parseSsooRetryAfter, isSafeSsooRecoveryHref } = require('../web-shell/dist/error-model.js');
const { SsooErrorPage, SsooErrorPanel, SsooErrorNotice } = require('../web-shell/dist/error-recovery.js');

let checks = 0;
function check(name, run) {
  try { run(); checks++; } catch (error) { throw new Error(name, { cause: error }); }
}

for (const [status, kind] of [[400, 'validation'], [401, 'auth-required'], [403, 'forbidden'], [404, 'not-found'], [409, 'conflict'], [410, 'not-found'], [412, 'conflict'], [413, 'validation'], [415, 'validation'], [422, 'validation'], [423, 'conflict'], [429, 'rate-limited'], [500, 'unavailable'], [502, 'unavailable'], [503, 'unavailable'], [504, 'unavailable'], [0, 'network'], [408, 'network']]) {
  check(`HTTP ${status}`, () => assert.equal(resolveSsooError({ status }).kind, kind));
}
check('transport failures are not forbidden', () => assert.equal(resolveSsooError({ code: 'ERR_NETWORK' }).kind, 'network'));
check('unknown is not not-found', () => assert.equal(resolveSsooError(new Error('unknown')).kind, 'unexpected'));
check('backend envelope and domain conflict survive', () => {
  const details = { serverContent: 'draft', expectedRevisionSeq: 3, currentRevisionSeq: 4 };
  const source = { status: 409, details, code: 'DMS_DOCUMENT_CONFLICT', requestId: 'trace-123' };
  assert.deepEqual(readSsooErrorMetadata(source), { ...source, retryAfterSeconds: undefined });
  assert.equal(resolveSsooError(source).details, details);
  assert.equal(resolveSsooError({ error: { statusCode: 403, code: 'FORBIDDEN' } }).kind, 'forbidden');
});
check('axios metadata preserves backend code', () => {
  const source = { code: 'ERR_BAD_RESPONSE', response: { status: 503, data: { error: { code: 'UPSTREAM_UNAVAILABLE' } } } };
  assert.equal(resolveSsooError(source).code, 'UPSTREAM_UNAVAILABLE');
  assert.equal(resolveSsooError(source).kind, 'unavailable');
});
check('retry-after numeric/date', () => {
  assert.equal(parseSsooRetryAfter('12'), 12);
  assert.equal(parseSsooRetryAfter('Wed, 30 Sep 2026 00:00:10 GMT', Date.parse('2026-09-30T00:00:00Z')), 10);
  assert.equal(parseSsooRetryAfter('nonsense'), undefined);
});
check('safe validation copy retained', () => assert.equal(getSsooErrorMessage({ status: 400, message: '이메일 형식이 올바르지 않습니다.' }), '이메일 형식이 올바르지 않습니다.'));
for (const message of ['<html><body>nginx 502</body></html>', 'Internal server error', 'Bearer secret', 'password=secret', 'at query (server.js:1:2)', 'SELECT secret FROM users']) {
  check('no raw internals: ' + message.slice(0, 12), () => assert.notEqual(getSsooErrorMessage(message), message));
}
check('500 does not expose server details', () => assert.equal(getSsooErrorMessage({ status: 500, message: 'private implementation details' }), resolveSsooError({ status: 500 }).description));
check('network wording', () => assert.equal(getSsooErrorMessage('Failed to fetch'), resolveSsooError({ status: 0 }).description));
for (const href of ['/', '/login', '/board?tab=all', 'https://example.com/']) check('safe href ' + href, () => assert.equal(isSafeSsooRecoveryHref(href), true));
for (const href of ['javascript:alert(1)', '//evil.test', '/\\evil.test', 'https://user:secret@example.com/', '/\n/evil', 'data:text/html,error']) check('reject href ' + href, () => assert.equal(isSafeSsooRecoveryHref(href), false));
check('default page and panel have exit links', () => {
  for (const Component of [SsooErrorPage, SsooErrorPanel]) {
    const html = renderToStaticMarkup(createElement(Component, { error: { status: 503 }, onRetry: () => {} }));
    assert.match(html, /data-ssoo-error="unavailable"/);
    assert.match(html, /href="\/"/);
    assert.match(html, /다시 시도/);
    assert.match(html, /role="alert"/);
  }
});
check('unsafe configured home falls back locally', () => assert.match(renderToStaticMarkup(createElement(SsooErrorPage, { homeHref: 'javascript:alert(1)' })), /href="\/"/));
check('domain retry and list action retained', () => {
  const html = renderToStaticMarkup(createElement(SsooErrorPanel, { kind: 'conflict', actions: [{ label: '목록으로', href: '/board' }, { label: '충돌 비교', onClick: () => {} }] }));
  assert.match(html, /href="\/board"/); assert.match(html, /충돌 비교/);
});
check('explicit account switch exit avoids forbidden-home loop', () => {
  const html = renderToStaticMarkup(createElement(SsooErrorPage, { kind: 'forbidden', actions: [{ label: '다른 계정', intent: 'exit', onClick: () => {} }] }));
  assert.doesNotMatch(html, /href="\/"/);
});
check('field errors stay inline with accessible ID and no forced navigation', () => {
  const html = renderToStaticMarkup(createElement(SsooErrorNotice, { id: 'email-error', compact: true, message: '이메일을 확인하세요.' }));
  assert.match(html, /id="email-error"/); assert.match(html, /role="alert"/); assert.doesNotMatch(html, /href=/);
});

const authRequire = createRequire(new URL('../packages/web-auth/package.json', import.meta.url));
const { createSharedHttpError } = authRequire('./dist/http-error.js');
check('HTTP adapter preserves domain conflict, code and retry metadata', () => {
  const details = { serverContent: 'server text', currentRevisionSeq: 8 };
  const error = createSharedHttpError(new Response(null, { status: 409, headers: { 'Retry-After': '4' } }), { error: { code: 'REVISION_CONFLICT', message: '다른 수정본이 먼저 저장되었습니다.', details } });
  assert.equal(error.status, 409); assert.equal(error.code, 'REVISION_CONFLICT');
  assert.equal(error.details, details); assert.equal(error.retryAfterSeconds, 4);
});
check('malformed successful API envelope is a recoverable upstream error', () => {
  assert.equal(createSharedHttpError(new Response(null, { status: 200 }), null).status, 502);
});
check('HTTP adapter retains body retry metadata when the header is absent', () => {
  assert.equal(createSharedHttpError(new Response(null, { status: 429 }), { retryAfterSeconds: 7 }).retryAfterSeconds, 7);
});
const { SharedSessionRecovery } = authRequire('./dist/session-recovery.js');
check('initial session failure has an exit even with a token but no accessible content', () => {
  const authStore = selector => selector({ sessionError: '연결을 확인해 주세요.', accessToken: 'existing-token', isLoading: false, checkAuth: async () => {} });
  const html = renderToStaticMarkup(createElement(SharedSessionRecovery, { authStore }));
  assert.match(html, /로그인 상태를 확인하지 못했습니다/);
  assert.match(html, /href="\/recovery"/);
  const retained = renderToStaticMarkup(createElement(SharedSessionRecovery, { authStore }, createElement('input', { defaultValue: 'unsaved' })));
  assert.match(retained, /value="unsaved"/);
  assert.match(retained, /로그인 상태 다시 확인/);
});
check('HTTP errors sanitize upstream internal text before toast/form state', () => {
  assert.doesNotMatch(createSharedHttpError(new Response(null, { status: 503 }), { error: { message: 'private upstream host' } }).message, /private/);
});
const { createAuthProxyRouteResponse } = authRequire('./dist/auth-proxy.js');
const authResponse = await createAuthProxyRouteResponse('login', Response.json({ success: false, error: { code: 'LOGIN_RATE_LIMITED', message: '요청 제한', details: { field: 'loginId' } } }, { status: 429, headers: { 'retry-after': '3' } }));
const authPayload = await authResponse.json();
check('auth proxy preserves status, code, details and retry-after', () => {
  assert.equal(authResponse.status, 429); assert.equal(authResponse.headers.get('retry-after'), '3');
  assert.equal(authPayload.code, 'LOGIN_RATE_LIMITED'); assert.deepEqual(authPayload.details, { field: 'loginId' });
});
const { createAuthApiAdapter } = authRequire('./dist/auth-api.js');
const adapter = createAuthApiAdapter({ fetchImpl: async () => Response.json(authPayload, { status: 429, headers: { 'retry-after': '3' } }) });
const failedLogin = await adapter.login({ loginId: 'test', password: 'test' });
check('auth browser adapter keeps the login wait contract', () => {
  assert.equal(failedLogin.success, false); assert.equal(failedLogin.code, 'LOGIN_RATE_LIMITED');
  assert.equal(failedLogin.retryAfterSeconds, 3); assert.equal(failedLogin.status, 429);
});
const { createSharedAxiosApiClient } = authRequire('./dist/axios-api-client.js');
const { AxiosError, AxiosHeaders } = authRequire('axios');
for (const header of [undefined, '3']) {
  const client = createSharedAxiosApiClient({ baseURL: 'http://error-recovery.invalid' });
  client.defaults.adapter = async config => {
    throw new AxiosError('rate limited', 'ERR_BAD_RESPONSE', config, undefined, {
      status: 429, statusText: 'Too Many Requests', config,
      headers: new AxiosHeaders(header ? { 'retry-after': header } : {}),
      data: { error: { code: 'RATE_LIMIT', retryAfterSeconds: 7 } },
    });
  };
  const error = await client.get('/fixture').catch(error => error);
  check(`Axios retry metadata (${header ? 'header' : 'body'})`, () => {
    assert.equal(error.status, 429);
    assert.equal(error.code, 'RATE_LIMIT');
    assert.equal(error.retryAfterSeconds, header ? 3 : 7);
  });
}
const ts = require('typescript');
const dmsModule = { exports: {} };
let dmsResponse;
runInNewContext(ts.transpileModule(readFileSync(new URL('../apps/web/dms/src/lib/api/core.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: dmsModule.exports, module: dmsModule,
  require: id => {
    if (id === '@ssoo/web-shell') return require('../web-shell/dist/error-model.js');
    if (id === './sharedAuth') return { fetchWithSharedAuth: async () => dmsResponse };
    if (id === '@/lib/constants/common') return { ERROR_MESSAGES: { NETWORK_ERROR: '연결 실패' } };
    throw new Error(`Unexpected DMS dependency: ${id}`);
  },
  AbortController, DOMException, Error, setTimeout, clearTimeout,
});
for (const header of [undefined, '3']) {
  dmsResponse = Response.json({ error: { code: 'RATE_LIMIT', retryAfterSeconds: 7 } }, {
    status: 429, headers: header ? { 'Retry-After': header } : {},
  });
  const result = await dmsModule.exports.request('/fixture');
  const error = dmsModule.exports.createApiRequestError(result);
  check(`DMS retry metadata (${header ? 'header' : 'body'})`, () => {
    assert.equal(error.status, 429);
    assert.equal(error.code, 'RATE_LIMIT');
    assert.equal(error.retryAfterSeconds, header ? 3 : 7);
  });
}
dmsResponse = Response.json({ error: { code: 'DMS_DOCUMENT_CONFLICT', details: { serverContent: 'new server draft', currentRevisionSeq: 8 } } }, { status: 409 });
const dmsConflict = dmsModule.exports.createApiRequestError(await dmsModule.exports.request('/fixture'));
check('DMS adapter retains usable document conflict payload', () => {
  assert.equal(dmsModule.exports.getDocumentConflictDetails(dmsConflict)?.serverContent, 'new server draft');
  assert.equal(dmsModule.exports.getDocumentConflictDetails(dmsConflict)?.currentRevisionSeq, 8);
});
const { resolveSsooRoutePolicyDecision } = require('../web-shell/dist/route-policy.js');
check('unknown routes are distinct from preserved virtual routes and shared surfaces', () => {
  const options = { allowedPaths: ['/', '/recovery'], fallbackPath: '/not-found', mode: 'rewrite', legacyPrefixes: ['/doc'], legacyRedirectPath: '/', sharedUserSurfaceRewritePath: '/' };
  assert.deepEqual(resolveSsooRoutePolicyDecision('/missing', options), { action: 'rewrite', path: '/not-found' });
  assert.deepEqual(resolveSsooRoutePolicyDecision('/doc/old', options), { action: 'redirect', path: '/' });
  assert.deepEqual(resolveSsooRoutePolicyDecision('/__user/profile', options), { action: 'rewrite', path: '/' });
  assert.deepEqual(resolveSsooRoutePolicyDecision('/recovery', options), { action: 'next' });
});
const { recoverSsooChunkOnce } = require('../web-shell/dist/chunk-recovery.js');
check('chunk recovery reloads at most once per tab and survives denied storage', () => {
  const values = new Map(); let reloads = 0; const previous = globalThis.window;
  globalThis.window = { sessionStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }, location: { reload: () => reloads++ } };
  try {
    const error = new Error('Loading chunk 123 failed.');
    assert.equal(recoverSsooChunkOnce(error), true); assert.equal(recoverSsooChunkOnce(error), false); assert.equal(reloads, 1);
    globalThis.window.sessionStorage.getItem = () => { throw new Error('storage unavailable'); };
    assert.equal(recoverSsooChunkOnce(error), false);
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
});

console.log(`[error-recovery] ${checks} model and rendered recovery checks passed (browser verification still required).`);
