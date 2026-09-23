import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Load the actual shared modules; only the browser's storage/event boundary is simulated.
const root = fileURLToPath(new URL('../packages/web-auth/', import.meta.url));
const requireDependency = createRequire(path.join(root, 'package.json'));
const values = new Map();
const localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
const context = vm.createContext({
  console, Headers, Request, Response, ReadableStream, TextEncoder, URL, Event, AbortController, setTimeout,
  localStorage, window: { localStorage, dispatchEvent: () => true },
  fetch: (...args) => globalThis.fetch(...args),
});
const modules = new Map();
function load(name) {
  const filename = path.join(root, 'src', name + '.ts');
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} }; modules.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const requireModule = (specifier) => specifier.startsWith('./')
    ? load(specifier.slice(2)) : requireDependency(specifier);
  vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename })(requireModule, module, module.exports);
  return module.exports;
}
const storage = load('storage');
const { createAuthStore } = load('store');
const { restoreSharedAuthSession } = load('session-bootstrap');
const { createServerApiProxyHelpers } = load('server-api-proxy');
const user = { userId: '42', loginId: 'test' };
const anonymous = { status: 'anonymous', accessToken: null, user: null };
const authenticated = { accessToken: 'test-access', user };
const results = [];
async function check(name, run) {
  storage.clearSharedAuthState(); await run(); results.push({ name, passed: true });
}
function store(result, stale = false) {
  const cleared = [];
  const instance = createAuthStore({
    authApi: { restoreSession: async () => result, me: async () => ({ success: false, status: 401 }) },
    normalizeUser: (value) => value,
    onAuthCleared: (reason) => cleared.push(reason),
  });
  if (stale) { instance.getState().setTokens('stale'); instance.getState().setUser(user); }
  return { instance, cleared };
}
for (const action of ['checkAuth', 'refreshTokens']) {
  for (const stale of [false, true]) {
    await check(`${action}: anonymous clears ${stale ? 'stale' : 'empty'} authentication`, async () => {
      const { instance, cleared } = store({ success: true, data: anonymous }, stale);
      const result = await instance.getState()[action]();
      assert.equal(instance.getState().isAuthenticated, false);
      assert.equal(instance.getState().accessToken, null);
      assert.equal(instance.getState().user, null);
      assert.equal(storage.getSharedAccessToken(), null);
      assert.equal(cleared.at(-1), 'session-absent');
      if (action === 'refreshTokens') assert.equal(result, false);
    });
  }
  await check(`${action}: authenticated response is retained`, async () => {
    const { instance } = store({ success: true, data: authenticated });
    await instance.getState()[action]();
    assert.equal(instance.getState().isAuthenticated, true);
    assert.equal(storage.getSharedAccessToken(), 'test-access');
  });
  for (const status of [401, 500, undefined]) {
    await check(`${action}: ${status ?? 'network'} failure preserves existing clearing policy`, async () => {
      const { instance } = store({ success: false, status, error: 'test failure' }, true);
      await instance.getState()[action]();
      assert.equal(instance.getState().isAuthenticated, status !== 401);
      assert.equal(storage.getSharedAccessToken(), status === 401 ? null : 'stale');
    });
  }
}
await check('bootstrap distinguishes normal anonymous from errors and clears stale token', async () => {
  storage.setSharedAuthSession('stale', user);
  const result = await restoreSharedAuthSession({ fetchImpl: async () => Response.json(anonymous) });
  assert.equal(result.success, false); assert.equal(result.reason, 'anonymous');
  assert.equal(result.clearedAuth, true); assert.equal(result.status, undefined);
  assert.equal(storage.getSharedAccessToken(), null);
});
for (const status of [401, 403, 429, 500, undefined]) {
  await check(`bootstrap retains ${status ?? 'network'} error semantics`, async () => {
    storage.setSharedAuthSession('stale', user);
    const result = await restoreSharedAuthSession({ fetchImpl: async () => {
      if (!status) throw new Error('offline');
      return Response.json({ error: 'failure' }, { status });
    } });
    assert.equal(result.success, false); assert.equal(result.status, status);
    const clear = status === 401 || status === 403;
    assert.equal(result.reason, clear ? 'unauthorized' : 'transient');
    assert.equal(storage.getSharedAccessToken(), clear ? null : 'stale');
  });
}
await check('bootstrap keeps valid session and rejects malformed success', async () => {
  const valid = await restoreSharedAuthSession({ fetchImpl: async () => Response.json(authenticated) });
  assert.equal(valid.success, true); assert.equal(storage.getSharedAccessToken(), 'test-access');
  const malformed = await restoreSharedAuthSession({ fetchImpl: async () => Response.json({ accessToken: null }) });
  assert.equal(malformed.reason, 'invalid-payload'); assert.equal(storage.getSharedAccessToken(), null);
});
const originalFetch = globalThis.fetch;
try {
  const helpers = createServerApiProxyHelpers({ resolveServerApiBaseUrl: () => 'https://backend.test/api' });
  for (const status of [200, 401, 403, 429, 500]) {
    await check(`protected binary refuses ${status === 200 ? 'anonymous' : status} without fetching data`, async () => {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return Response.json(
        status === 200 ? { success: true, data: anonymous } : { success: false, error: { message: 'failure' } },
        { status, headers: { 'set-cookie': 'test=cleared; Path=/' } },
      ); };
      const result = await helpers.proxySessionBackedBinaryResponse(new Request('https://app.test/file'), '/storage/open');
      assert.equal(result.status, status === 200 ? 401 : status);
      assert.equal(calls, 1); assert.match(result.headers.get('set-cookie'), /test=cleared/);
    });
  }
  await check('protected binary still forwards valid token and exact file bytes', async () => {
    const bytes = new Uint8Array([0, 255, 42, 13, 10]); let calls = 0;
    globalThis.fetch = async (_url, init) => {
      if (++calls === 1) return Response.json({ success: true, data: authenticated });
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-access');
      return new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } });
    };
    const result = await helpers.proxySessionBackedBinaryResponse(new Request('https://app.test/file'), '/storage/open');
    assert.equal(result.status, 200); assert.equal(calls, 2);
    assert.deepEqual(new Uint8Array(await result.arrayBuffer()), bytes);
  });
  await check('anonymous event stream keeps retry-only contract without protected data', async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ success: true, data: anonymous }); };
    const result = await helpers.proxySessionBackedStreamResponse(new Request('https://app.test/events'), '/events');
    assert.equal(result.status, 200); assert.equal(calls, 1);
    const body = await result.text(); assert.match(body, /retry: 30000/); assert.match(body, /event: heartbeat/);
  });
} finally { globalThis.fetch = originalFetch; }
const { createAuthApiAdapter } = load('auth-api');
const { createAuthProxyRouteResponse } = load('auth-proxy');
const { createSessionCookieRetryResponse } = load('session-cookie-retry');
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
await check('same-origin restore calls share one exchange even across adapters', async () => {
  const response = deferred(); let calls = 0;
  const fetchImpl = () => { calls++; return response.promise; };
  const first = createAuthApiAdapter({ fetchImpl }).restoreSession();
  const second = createAuthApiAdapter({ fetchImpl }).restoreSession();
  response.resolve(Response.json(authenticated));
  assert.equal((await first).success, true); assert.equal((await second).success, true); assert.equal(calls, 1);
});
await check('cookie exchange survives document navigation but remains explicitly cancellable', async () => {
  const adapter = createAuthApiAdapter({ fetchImpl: async (_url, init) => {
    assert.equal(init.keepalive, true);
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json(authenticated);
  } });
  assert.equal((await adapter.restoreSession()).success, true);
});
for (const action of ['checkAuth', 'refreshTokens']) {
  await check(`${action}: response after logout cannot resurrect authentication`, async () => {
    const response = deferred();
    const instance = createAuthStore({ authApi: {
      me: async () => ({ success: false, status: 401 }), restoreSession: () => response.promise,
      logout: async () => ({ success: true }),
    }, normalizeUser: (value) => value });
    instance.getState().setTokens('old'); instance.getState().setUser(user);
    const pending = instance.getState()[action]();
    await Promise.resolve(); await instance.getState().logout();
    response.resolve({ success: true, data: authenticated }); await pending;
    assert.equal(instance.getState().isAuthenticated, false); assert.equal(storage.getSharedAccessToken(), null);
  });
}
await check('late identity response cannot resurrect logged-out state', async () => {
  const response = deferred();
  const instance = createAuthStore({ authApi: { me: () => response.promise, logout: async () => ({ success: true }) }, normalizeUser: (value) => value });
  instance.getState().setTokens('old'); const pending = instance.getState().checkAuth();
  await instance.getState().logout(); response.resolve({ success: true, data: user }); await pending;
  assert.equal(instance.getState().isAuthenticated, false);
});
await check('late bootstrap success or failure cannot overwrite a newer login', async () => {
  for (const status of [200, 401]) {
    const response = deferred();
    const pending = restoreSharedAuthSession({ fetchImpl: () => response.promise });
    storage.clearSharedAuthState(); storage.setSharedAuthSession('new-login', user);
    response.resolve(Response.json(status === 200 ? authenticated : { error: 'old failure' }, { status }));
    assert.equal((await pending).reason, 'superseded'); assert.equal(storage.getSharedAccessToken(), 'new-login');
  }
});
await check('logout invalidation cancels in-flight session transport', async () => {
  let aborted = false;
  const pending = createAuthApiAdapter({ fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => { aborted = true; reject(new Error('cancelled')); });
  }) }).restoreSession();
  storage.invalidateSharedAuthRequests();
  assert.equal((await pending).success, false); assert.equal(aborted, true);
});
await check('consumed-cookie retry preserves POST, query and same-origin target without issuing a cookie', async () => {
  const response = await createAuthProxyRouteResponse('session', Response.json({ success: false, error: { code: 'SESSION_TOKEN_ROTATED' } }, { status: 401 }), new Request('https://app.test/api/auth/session?keep=1', { method: 'POST' }));
  assert.equal(response.status, 307); assert.equal(response.headers.get('location'), '/api/auth/session?keep=1&__ssoo_session_retry=1');
  assert.equal(response.headers.get('set-cookie'), null); assert.match(response.headers.get('cache-control'), /no-store/);
});
for (const [status, code] of [[401, 'Unauthorized'], [403, 'SESSION_TOKEN_ROTATED'], [429, 'SESSION_TOKEN_ROTATED'], [500, 'SESSION_TOKEN_ROTATED']]) {
  await check(`cookie retry does not absorb ${status}/${code}`, async () => {
    assert.equal(await createSessionCookieRetryResponse(new Request('https://app.test/api/auth/session'), status, code), null);
  });
}
await check('retry has a fixed upper bound and rejects malformed counters and non-api locations', async () => {
  for (const path of ['/api/auth/session?__ssoo_session_retry=5', '/api/auth/session?__ssoo_session_retry=-1', '/api/auth/session?__ssoo_session_retry=abc', '/outside']) {
    assert.equal(await createSessionCookieRetryResponse(new Request('https://app.test' + path), 401, 'SESSION_TOKEN_ROTATED'), null);
  }
});
try {
  await check('pinned consumed cookie stays rejected through all binary retries; no data fetched', async () => {
    let calls = 0; globalThis.fetch = async () => { calls++; return Response.json({ success: false, error: { code: 'SESSION_TOKEN_ROTATED' } }, { status: 401 }); };
    const helpers = createServerApiProxyHelpers({ resolveServerApiBaseUrl: () => 'https://backend.test/api' });
    let url = 'https://app.test/api/file/serve-attachment?path=test';
    for (let attempt = 0; attempt <= 5; attempt++) {
      const response = await helpers.proxySessionBackedBinaryResponse(new Request(url, { headers: { cookie: 'ssoo-session=consumed' } }), '/file');
      assert.equal(response.status, attempt < 5 ? 307 : 401);
      if (attempt < 5) url = new URL(response.headers.get('location'), url).href;
    }
    assert.equal(calls, 6);
  });
  await check('event stream can re-request the latest browser cookie without leaking protected events', async () => {
    globalThis.fetch = async () => Response.json({ success: false, error: { code: 'SESSION_TOKEN_ROTATED' } }, { status: 401 });
    const helpers = createServerApiProxyHelpers({ resolveServerApiBaseUrl: () => 'https://backend.test/api' });
    const response = await helpers.proxySessionBackedStreamResponse(new Request('https://app.test/api/events'), '/events');
    assert.equal(response.status, 307); assert.equal(await response.text(), '');
  });
} finally { globalThis.fetch = originalFetch; }
// The stream body can be decoded, replaced, or extended by the proxy. Its upstream
// transport metadata must not truncate retry frames or trigger browser decode errors.
try {
  const helpers = createServerApiProxyHelpers({ resolveServerApiBaseUrl: () => 'https://backend.test/api' });
  const request = () => new Request('https://app.test/api/events', { headers: { authorization: 'Bearer test-access' } });
  const assertStreamHeaders = (response) => {
    assert.equal(response.status, 200);
    for (const name of ['content-length', 'content-encoding', 'transfer-encoding']) {
      assert.equal(response.headers.get(name), null, `SSE must not retain upstream ${name}`);
    }
    assert.equal(response.headers.get('content-type'), 'text/event-stream; charset=utf-8');
    assert.equal(response.headers.get('cache-control'), 'no-cache, no-transform');
    assert.equal(response.headers.get('x-accel-buffering'), 'no');
  };
  for (const status of [401, 403, 429, 500]) {
    await check(`SSE ${status}: replacement frame drops stale transport metadata and error body`, async () => {
      let cancelled = false;
      globalThis.fetch = async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
        status, headers: { 'content-length': '179', 'content-encoding': 'gzip', 'transfer-encoding': 'chunked', 'x-request-id': 'keep-trace' },
      });
      const response = await helpers.proxySessionBackedStreamResponse(request(), '/events');
      assertStreamHeaders(response);
      assert.equal(response.headers.get('x-request-id'), 'keep-trace');
      const text = await response.text();
      assert.match(text, /^retry: 30000\nevent: heartbeat\ndata: /);
      assert.equal(JSON.parse(text.split('data: ')[1]).type, 'heartbeat');
      assert.equal(cancelled, true);
    });
  }
  await check('SSE successful decoded event preserves exact payload without compressed metadata', async () => {
    const body = 'event: notification\ndata: {"type":"notification","title":"문서 알림"}\n\n';
    globalThis.fetch = async () => new Response(body, { headers: { 'content-encoding': 'gzip', 'content-length': '35', 'transfer-encoding': 'chunked' } });
    const response = await helpers.proxySessionBackedStreamResponse(request(), '/events');
    assertStreamHeaders(response); assert.equal(await response.text(), body);
  });
  await check('SSE interrupted source preserves delivered event and appends complete retry frame', async () => {
    const body = 'event: connected\ndata: {"type":"connected"}\n\n';
    let reads = 0;
    globalThis.fetch = async () => new Response(new ReadableStream({ pull(controller) {
      if (reads++ === 0) controller.enqueue(new TextEncoder().encode(body));
      else controller.error(new Error('upstream connection interrupted'));
    } }), { headers: { 'content-length': String(body.length) } });
    const response = await helpers.proxySessionBackedStreamResponse(request(), '/events');
    assertStreamHeaders(response);
    assert.ok((await response.text()).startsWith(body + 'retry: 30000\nevent: heartbeat\n'));
  });
  await check('SSE retry preserves refreshed session cookie on upstream rejection', async () => {
    let calls = 0;
    globalThis.fetch = async () => ++calls === 1
      ? Response.json({ success: true, data: authenticated }, { headers: { 'set-cookie': 'session=refreshed; HttpOnly' } })
      : new Response('denied', { status: 403, headers: { 'content-length': '6' } });
    const response = await helpers.proxySessionBackedStreamResponse(new Request('https://app.test/api/events'), '/events');
    assertStreamHeaders(response); assert.equal(calls, 2);
    assert.equal(response.headers.get('set-cookie'), 'session=refreshed; HttpOnly');
    assert.match(await response.text(), /event: heartbeat/);
  });
  await check('SSE network failure retains the existing complete retry response', async () => {
    globalThis.fetch = async () => { throw new Error('network unavailable'); };
    const response = await helpers.proxySessionBackedStreamResponse(request(), '/events');
    assertStreamHeaders(response); assert.match(await response.text(), /retry: 30000/);
  });
  await check('binary download keeps content length, disposition and exact bytes', async () => {
    const bytes = new Uint8Array([0, 255, 1, 128]);
    globalThis.fetch = async () => new Response(bytes, { headers: { 'content-length': '4', 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename=test.pdf' } });
    const response = await helpers.proxySessionBackedBinaryResponse(request(), '/file');
    assert.equal(response.headers.get('content-length'), '4');
    assert.equal(response.headers.get('content-disposition'), 'attachment; filename=test.pdf');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  });
} finally { globalThis.fetch = originalFetch; }
console.log(JSON.stringify({ passed: results.length, results }, null, 2));
