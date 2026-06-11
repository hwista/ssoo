const appEndpoints = [
  ['admin', process.env.AUTH_LIFECYCLE_ADMIN_URL || 'http://localhost:3000'],
  ['crm', process.env.AUTH_LIFECYCLE_CRM_URL || 'http://localhost:3001'],
  ['pms', process.env.AUTH_LIFECYCLE_PMS_URL || 'http://localhost:3002'],
  ['dms', process.env.AUTH_LIFECYCLE_DMS_URL || 'http://localhost:3003'],
  ['sns', process.env.AUTH_LIFECYCLE_SNS_URL || 'http://localhost:3004'],
];

const loginApp = process.env.AUTH_LIFECYCLE_LOGIN_APP || 'pms';
const loginId = process.env.AUTH_LIFECYCLE_LOGIN_ID || 'admin';
const password = process.env.AUTH_LIFECYCLE_PASSWORD || 'admin123!';

function appUrl(app, action) {
  const entry = appEndpoints.find(([name]) => name === app);
  if (!entry) throw new Error(`Unknown app: ${app}`);
  return `${entry[1].replace(/\/+$/, '')}/api/auth/${action}`;
}

function getSetCookie(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const value = response.headers.get('set-cookie');
  return value ? [value] : [];
}

function toCookieHeader(setCookies) {
  return setCookies
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  return { response, data, setCookies: getSetCookie(response) };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const results = [];

try {
  const login = await postJson(appUrl(loginApp, 'login'), { loginId, password });
  assert(login.response.ok, `${loginApp} login expected 200, got ${login.response.status}: ${JSON.stringify(login.data)}`);
  assert(login.data?.accessToken, `${loginApp} login did not return accessToken`);

  const accessToken = login.data.accessToken;
  const cookieHeader = toCookieHeader(login.setCookies);
  assert(cookieHeader, `${loginApp} login did not return shared session cookie`);
  results.push(`${loginApp}: login ok`);

  for (const [app] of appEndpoints) {
    const me = await postJson(appUrl(app, 'me'), {}, { Authorization: `Bearer ${accessToken}`, Cookie: cookieHeader });
    assert(me.response.ok, `${app} /me before logout expected 200, got ${me.response.status}: ${JSON.stringify(me.data)}`);
    results.push(`${app}: /me accepted active access token`);
  }

  const logout = await postJson(appUrl(loginApp, 'logout'), {}, { Authorization: `Bearer ${accessToken}`, Cookie: cookieHeader });
  assert(logout.response.ok, `${loginApp} logout expected 200, got ${logout.response.status}: ${JSON.stringify(logout.data)}`);
  results.push(`${loginApp}: logout ok`);

  for (const [app] of appEndpoints) {
    const me = await postJson(appUrl(app, 'me'), {}, { Authorization: `Bearer ${accessToken}`, Cookie: cookieHeader });
    assert(me.response.status === 401, `${app} /me after logout expected 401, got ${me.response.status}: ${JSON.stringify(me.data)}`);
    results.push(`${app}: /me rejected revoked access token`);
  }

  const session = await postJson(appUrl(loginApp, 'session'), {}, { Cookie: cookieHeader });
  assert(session.response.status === 401, `${loginApp} /session with revoked cookie expected 401, got ${session.response.status}: ${JSON.stringify(session.data)}`);
  results.push(`${loginApp}: /session rejected revoked shared cookie`);

  console.log('[verify-auth-user-lifecycle] passed');
  for (const result of results) console.log(`- ${result}`);
} catch (error) {
  console.error('[verify-auth-user-lifecycle] failed');
  for (const result of results) console.error(`- ${result}`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
