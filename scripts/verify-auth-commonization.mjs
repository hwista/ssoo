import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const apps = ['pms', 'dms', 'sns', 'admin', 'crm'];
const packageJson = (path) => JSON.parse(readFileSync(join(repoRoot, path), 'utf8'));
const file = (path) => readFileSync(join(repoRoot, path), 'utf8');
const exists = (path) => existsSync(join(repoRoot, path));
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function interfaceBlock(content, name) {
  const match = content.match(new RegExp(`export interface ${name} \\\\{([\\\\s\\\\S]*?)\\\\n\\\\}`));
  return match?.[1] ?? '';
}

const webAuthIndex = file('packages/web-auth/src/index.ts');
assert(webAuthIndex.includes('createAuthProxyPostHandler'), 'web-auth must export createAuthProxyPostHandler');
assert(webAuthIndex.includes('createPasswordResetProxyPostHandler'), 'web-auth must export createPasswordResetProxyPostHandler');
assert(webAuthIndex.includes('SharedAuthLoginPage'), 'web-auth must export SharedAuthLoginPage');
assert(webAuthIndex.includes('AuthClearReason'), 'web-auth must export auth clear hook reason type');
assert(webAuthIndex.includes('createSharedAxiosApiClient'), 'web-auth must export the shared Axios API client factory');
assert(webAuthIndex.includes('createAuthUserScopeLifecycle'), 'web-auth must export the shared auth user-scope lifecycle factory');
assert(webAuthIndex.includes('useUserScopeQueryCacheReset'), 'web-auth must export shared query-cache user-scope reset hook');
assert(webAuthIndex.includes('SharedAuthStateSync'), 'web-auth must export shared auth storage event sync');
assert(webAuthIndex.includes('RestoreServerAccessTokenResult'), 'web-auth must export session-backed proxy restore result type');
assert(webAuthIndex.includes('SessionBackedAccessTokenPayload'), 'web-auth must export session-backed access token payload type');
assert(!webAuthIndex.includes('setSharedAuthTokens'), 'web-auth must not expose refresh-token shaped shared token helpers');
assert(!webAuthIndex.includes('getSharedRefreshToken'), 'web-auth must not expose browser refresh-token helpers');

const authProxy = file('packages/web-auth/src/auth-proxy.ts');
assert(!authProxy.includes("'refresh'"), 'browser-facing auth proxy actions must not expose body-based refresh');

for (const app of apps) {
  const pkg = packageJson(`apps/web/${app}/package.json`);
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  assert(deps['@ssoo/web-auth'], `${app} must depend on @ssoo/web-auth`);
  assert(deps.zustand, `${app} must depend on zustand for the shared auth store`);

  const loginPagePath = `apps/web/${app}/src/app/(auth)/login/page.tsx`;
  const authStorePath = `apps/web/${app}/src/stores/auth.store.ts`;
  const authApiPath = `apps/web/${app}/src/lib/api/auth.ts`;
  const proxyRoutePath = `apps/web/${app}/src/app/api/auth/[action]/route.ts`;
  const passwordResetProxyRoutePath = `apps/web/${app}/src/app/api/auth/password-reset/[action]/route.ts`;
  const proxySharedPath = `apps/web/${app}/src/app/api/_shared/serverApiProxy.ts`;
  const providersPath = `apps/web/${app}/src/app/providers.tsx`;
  const userScopePath = `apps/web/${app}/src/lib/user-scope.ts`;

  assert(exists(loginPagePath), `${app} must expose an app-local /login route`);
  assert(exists(authStorePath), `${app} must expose a shared auth store wrapper`);
  assert(exists(authApiPath), `${app} must expose a shared auth api adapter`);
  assert(exists(proxyRoutePath), `${app} must expose same-origin /api/auth/[action] proxy`);
  assert(exists(passwordResetProxyRoutePath), `${app} must expose same-origin /api/auth/password-reset/[action] proxy`);
  assert(exists(proxySharedPath), `${app} must expose server API proxy helpers`);
  assert(exists(providersPath), `${app} must expose an app provider for shared auth state sync`);
  assert(exists(userScopePath), `${app} must expose an app-local user-scope lifecycle adapter`);

  if (exists(loginPagePath)) {
    const loginPage = file(loginPagePath);
    assert(loginPage.includes('SharedAuthLoginPage'), `${app} login page must use SharedAuthLoginPage`);
    assert(loginPage.includes('homePath={APP_HOME_PATH}'), `${app} login page must use APP_HOME_PATH instead of route literals`);
    assert(!loginPage.includes('useLoginPageBootstrap'), `${app} login page must not duplicate bootstrap hook wiring`);
    assert(!loginPage.includes('beforeSubmit='), `${app} login page must not add app-local submit hooks`);
  }

  if (exists(providersPath)) {
    const providers = file(providersPath);
    assert(providers.includes('SharedAuthStateSync'), `${app} providers must consume SharedAuthStateSync`);
  }

  if (exists(userScopePath)) {
    const userScope = file(userScopePath);
    assert(userScope.includes('createAuthUserScopeLifecycle'), `${app} user-scope adapter must use the shared lifecycle factory`);
    assert(userScope.includes('getCurrentUserScopeId'), `${app} user-scope adapter must expose current user scope`);
    assert(userScope.includes('registerUserScopedReset'), `${app} user-scope adapter must expose reset registration`);
  }

  if (exists(proxySharedPath)) {
    const proxyShared = file(proxySharedPath);
    assert(proxyShared.includes("'X-SSOO-App':"), `${app} server API proxy helpers must stamp X-SSOO-App`);
    assert(proxyShared.includes(`'${app}'`), `${app} server API proxy helpers must stamp app id ${app}`);

    if (app === 'dms') {
      assert(proxyShared.includes('proxySessionBackedBinaryResponse'), 'dms must expose shared session-backed binary proxy helper');
      assert(proxyShared.includes('proxySessionBackedStreamResponse'), 'dms must expose shared session-backed stream proxy helper');
      assert(!proxyShared.includes('async function restoreServerAccessToken'), 'dms must not own an app-local session restore helper');
      assert(!proxyShared.includes('interface BackendSuccessResponse'), 'dms must not duplicate backend response helper types');

      const storageOpenRoute = file('apps/web/dms/src/app/api/storage/open/route.ts');
      assert(storageOpenRoute.includes('proxySessionBackedBinaryResponse'), 'dms storage/open GET must use the shared session-backed binary proxy helper');
      assert(storageOpenRoute.includes('return proxySessionBackedBinaryResponse(req, pathname);'), 'dms storage/open GET must proxy through the shared binary response helper');
      assert(!storageOpenRoute.includes('await fetch(createServerApiUrl(pathname)'), 'dms storage/open GET must not bypass session-backed binary restore with a direct fetch');
    }
  }

  if (exists(proxyRoutePath)) {
    const proxyRoute = file(proxyRoutePath);
    assert(proxyRoute.includes('createAuthProxyPostHandler'), `${app} auth proxy route must use createAuthProxyPostHandler`);
    assert(proxyRoute.includes('createServerApiProxyInit,'), `${app} auth proxy route must pass the shared proxy init without an app-local wrapper`);
    assert(!proxyRoute.includes('createUnsupportedAuthProxyActionResponse'), `${app} auth proxy route must not duplicate action handling`);
    assert(!proxyRoute.includes('X-SSOO-App'), `${app} auth proxy route must not duplicate app-id stamping already owned by serverApiProxy helpers`);
    assert(!proxyRoute.includes('headers.set'), `${app} auth proxy route must not mutate forwarded auth headers locally`);
  }

  if (exists(passwordResetProxyRoutePath)) {
    const passwordResetProxyRoute = file(passwordResetProxyRoutePath);
    assert(passwordResetProxyRoute.includes('createPasswordResetProxyPostHandler'), `${app} password reset proxy route must use createPasswordResetProxyPostHandler`);
    assert(passwordResetProxyRoute.includes('createServerApiProxyInit,'), `${app} password reset proxy route must pass the shared proxy init without an app-local wrapper`);
    assert(!passwordResetProxyRoute.includes('X-SSOO-App'), `${app} password reset proxy route must not duplicate app-id stamping already owned by serverApiProxy helpers`);
    assert(!passwordResetProxyRoute.includes('headers.set'), `${app} password reset proxy route must not mutate forwarded auth headers locally`);
  }
}

const authController = file('apps/server/src/modules/common/auth/auth.controller.ts');
assert(authController.includes("return 'admin';"), 'server auth issuedApp resolver must include admin');
assert(authController.includes("return 'crm';"), 'server auth issuedApp resolver must include crm');
assert(!authController.includes('@Post("refresh")'), 'server auth controller must not expose direct /auth/refresh');
assert(!authController.includes('RefreshTokenDto'), 'server auth controller must not depend on direct refresh DTO');
assert(!authController.includes('roleCode: user.roleCode'), 'server auth responses must not expose roleCode');

const sharedAuthTypes = file('packages/types/src/common/auth.ts');
assert(!interfaceBlock(sharedAuthTypes, 'AuthIdentity').includes('roleCode'), 'AuthIdentity must not expose roleCode');
assert(!interfaceBlock(sharedAuthTypes, 'AuthIdentity').includes('displayName'), 'AuthIdentity must not expose profile displayName');
assert(!interfaceBlock(sharedAuthTypes, 'AuthIdentity').includes('avatarUrl'), 'AuthIdentity must not expose profile avatarUrl');
assert(!interfaceBlock(sharedAuthTypes, 'AuthTokens').includes('refreshToken'), 'browser-facing AuthTokens must not expose refreshToken');
assert(sharedAuthTypes.includes('AuthIdentityProfileProjection'), 'shared auth types must expose AuthIdentityProfileProjection for display-only auth projections');

const webAuthStore = file('packages/web-auth/src/store.ts');
assert(!webAuthStore.includes('refreshToken: string | null'), 'shared auth store state must not expose refreshToken');
assert(!webAuthStore.includes('refresh: (refreshToken'), 'shared auth API adapter must not expose body-based refresh');

const sharedLoginPage = file('packages/web-auth/src/login-page.tsx');
assert(sharedLoginPage.includes('const [isSubmitting, setIsSubmitting] = useState(false);'), 'shared login page must distinguish user submit loading from initial auth bootstrap');
assert(sharedLoginPage.includes('authIsLoading: isLoading && !isSubmitting'), 'shared login page must keep the login card mounted during credential submit');
assert(sharedLoginPage.includes('isLoading={isLoading || isSubmitting}'), 'shared login card must disable repeat submit while credential login is pending');
assert(sharedLoginPage.includes('onAuthenticated: handleAuthenticated'), 'shared login page must use one stable authenticated navigation callback');
assert(!/await login\(loginId, password\);\s*navigate\(postLoginPath\);/u.test(sharedLoginPage), 'shared login submit must not duplicate the authenticated navigation effect');

const sharedLoginUi = file('packages/web-auth/src/ui.tsx');
assert(sharedLoginUi.includes("AUTH_REMEMBERED_LOGIN_ID_STORAGE_KEY = 'ssoo.auth.remembered-login-id'"), 'shared login UI must persist only the opted-in remembered login ID under a dedicated key');
assert(sharedLoginUi.includes("aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 표시'}"), 'shared login UI must expose an accessible password visibility toggle');
assert(sharedLoginUi.includes('size="authIcon"'), 'shared login password visibility control must consume the platform 44px auth icon recipe');
assert(sharedLoginUi.includes('아이디 저장'), 'shared login UI must expose the source-compatible remember-login-ID label');
assert(sharedLoginUi.includes('window.localStorage.setItem(AUTH_REMEMBERED_LOGIN_ID_STORAGE_KEY, value)'), 'shared login UI must persist the remembered login ID after successful submit');
assert(!sharedLoginUi.includes('localStorage.setItem(AUTH_REMEMBERED_LOGIN_ID_STORAGE_KEY, password)'), 'shared login UI must never persist a password');

const crmLoginPage = file('apps/web/crm/src/app/(auth)/login/page.tsx');
assert(crmLoginPage.includes('rememberLoginIdEnabled'), 'CRM login must opt into source-compatible remember-login-ID control');
assert(crmLoginPage.includes('passwordVisibilityEnabled'), 'CRM login must opt into source-compatible password visibility control');

for (const app of ['admin', 'dms', 'pms', 'sns']) {
  const loginPage = file(`apps/web/${app}/src/app/(auth)/login/page.tsx`);
  assert(!loginPage.includes('rememberLoginIdEnabled'), `${app} login must not inherit CRM-only remember-login-ID UI without an explicit decision`);
  assert(!loginPage.includes('passwordVisibilityEnabled'), `${app} login must not inherit CRM-only password visibility UI without an explicit decision`);
}

const protectedAppBootstrap = file('packages/web-auth/src/protected-app-bootstrap.ts');
assert(protectedAppBootstrap.includes('initialAuthCheckRef = useRef<Promise<void> | null>(null)'), 'protected app bootstrap must retain the in-flight initial auth check across Strict Mode effect replay');
assert(protectedAppBootstrap.includes('const initialAuthCheck = initialAuthCheckRef.current;'), 'protected app bootstrap must reattach completion handling to the retained initial auth check');
assert(!protectedAppBootstrap.includes('initCalled'), 'protected app bootstrap must not strand completion state behind a one-shot init flag');

const passwordResetPage = file('packages/web-auth/src/password-reset-page.tsx');
assert(passwordResetPage.includes("'/api/auth/password-reset'"), 'shared password reset page must call the same-origin app password-reset proxy by default');
assert(!passwordResetPage.includes('NEXT_PUBLIC_API_URL'), 'shared password reset page must not bypass app-local auth proxy with NEXT_PUBLIC_API_URL');

for (const authSurfacePath of [
  'packages/web-auth/src/ui.tsx',
  'packages/web-auth/src/password-reset-page.tsx',
]) {
  const authSurface = file(authSurfacePath);
  assert(!/#(?:0B3B3B|114F4F)/i.test(authSurface), `${authSurfacePath} must not hard-code the legacy auth teal color`);
  assert(!authSurface.includes('slate-'), `${authSurfacePath} must consume app theme tokens instead of slate neutral classes`);
}

const serverAuthTypes = file('apps/server/src/modules/common/auth/interfaces/auth.interface.ts');
assert(!interfaceBlock(serverAuthTypes, 'TokenPayload').includes('roleCode'), 'JWT TokenPayload must not carry roleCode');

const authService = file('apps/server/src/modules/common/auth/auth.service.ts');
assert(!authService.includes('roleCode: user.roleCode'), 'issued JWT payload must not include roleCode');

const jwtStrategy = file('apps/server/src/modules/common/auth/strategies/jwt.strategy.ts');
assert(!jwtStrategy.includes('roleCode: user.roleCode'), 'validated request auth context must not reinject roleCode');

const rolesGuard = file('apps/server/src/modules/common/auth/guards/roles.guard.ts');
assert(rolesGuard.includes('resolveActionPermissionContext'), '@Roles(admin) must resolve current role through access foundation');
assert(
  rolesGuard.includes('systemOverrideMatched = adminRequested && actionContext.policy.hasSystemOverride'),
  '@Roles(admin) must evaluate the DB-backed system.override policy',
);
assert(
  !rolesGuard.includes("userRole === 'admin'"),
  '@Roles(admin) must not trust a bare DB role name as admin authority',
);

const compose = file('compose.yaml');
assert(compose.includes('ADMIN_SERVER_API_URL: ${ADMIN_SERVER_API_URL:-http://server:4000/api}'), 'compose admin service must provide ADMIN_SERVER_API_URL for container-to-container auth proxying');
assert(compose.includes('CRM_SERVER_API_URL: ${CRM_SERVER_API_URL:-http://server:4000/api}'), 'compose crm service must provide CRM_SERVER_API_URL for container-to-container auth proxying');

const adminDockerfile = file('apps/web/admin/Dockerfile');
assert(adminDockerfile.includes('ARG ADMIN_SERVER_API_URL=http://server:4000/api'), 'admin Dockerfile must accept ADMIN_SERVER_API_URL build arg');
assert(adminDockerfile.includes('ENV ADMIN_SERVER_API_URL='), 'admin Dockerfile must expose ADMIN_SERVER_API_URL to the standalone runtime');

const crmMainLayout = file('apps/web/crm/src/app/(main)/layout.tsx');
assert(crmMainLayout.includes('useProtectedAppBootstrap'), 'crm protected layout must use shared useProtectedAppBootstrap');
assert(!crmMainLayout.includes('useRef'), 'crm protected layout must not duplicate checkAuth bootstrap state');

const axiosClientFactory = file('packages/web-auth/src/axios-api-client.ts');
assert(axiosClientFactory.includes('createSharedAxiosApiClient'), 'shared Axios API client factory must exist');
assert(axiosClientFactory.includes('restoreSharedAuthSession'), 'shared Axios API client must restore sessions through same-origin session bootstrap');
assert(axiosClientFactory.includes('withCredentials: true'), 'shared Axios API client must send HttpOnly session cookies');

for (const app of ['admin', 'pms', 'sns']) {
  const client = file(`apps/web/${app}/src/lib/api/client.ts`);
  assert(client.includes('createSharedAxiosApiClient'), `${app} API client must use the shared Axios client factory`);
  assert(!client.includes('axios.create'), `${app} API client must not duplicate axios.create auth wiring`);
  assert(!client.includes('restoreSharedAuthSession'), `${app} API client must not duplicate session restore wiring`);
}

for (const app of ['admin', 'pms', 'dms', 'sns']) {
  const providers = file(`apps/web/${app}/src/app/providers.tsx`);
  assert(providers.includes('UserScopeQueryCacheReset'), `${app} providers must reset query cache through the shared user-scope lifecycle`);
}

const snsAuthApi = file('apps/web/sns/src/lib/api/auth.ts');
const snsAuthStore = file('apps/web/sns/src/stores/auth.store.ts');
assert(snsAuthApi.includes('AuthIdentityProfileProjection'), 'sns auth api must use the shared AuthIdentityProfileProjection type');
assert(snsAuthStore.includes('AuthIdentityProfileProjection'), 'sns auth store must use the shared AuthIdentityProfileProjection type');
assert(!snsAuthApi.includes('interface AuthUser extends AuthIdentity'), 'sns auth api must not locally widen AuthIdentity');
assert(!snsAuthStore.includes('interface AuthUser extends AuthIdentity'), 'sns auth store must not locally widen AuthIdentity');

const serverApiProxy = file('packages/web-auth/src/server-api-proxy.ts');
assert(serverApiProxy.includes('restoreServerAccessToken'), 'web-auth server API proxy helpers must own session restore');
assert(serverApiProxy.includes('proxySessionBackedBinaryResponse'), 'web-auth server API proxy helpers must own session-backed binary proxy');
assert(serverApiProxy.includes('proxySessionBackedStreamResponse'), 'web-auth server API proxy helpers must own session-backed stream proxy');
assert(serverApiProxy.includes("createServerApiUrl('/auth/session/access')"), 'session-backed file/event authorization must use /auth/session/access without rotating the cookie');

for (const docPath of [
  'docs/dms/explanation/architecture/app-initialization-flow.md',
  'docs/dms/explanation/architecture/page-routing.md',
]) {
  const doc = file(docPath);
  assert(!doc.includes('AuthPageShell + DMS auth theme'), `${docPath} must not describe a DMS-local auth shell/theme`);
  assert(doc.includes('SharedAuthLoginPage'), `${docPath} must document shared auth login ownership`);
  assert(doc.includes('/password-reset'), `${docPath} must include the shared password reset public entry`);
}

const authSystemDoc = file('docs/common/explanation/architecture/auth-system.md');
assert(authSystemDoc.includes('AuthIdentityProfileProjection'), 'auth-system doc must document shared profile display auth projection');
assert(authSystemDoc.includes('credential submit 중에는 로그인 카드를 유지'), 'auth-system doc must document visible credential failure handling');
assert(authSystemDoc.includes('React Strict Mode effect replay'), 'auth-system doc must document Strict Mode-safe protected bootstrap completion');
assert(!authSystemDoc.includes('SNS profile 표시 필드 projection은 `ProfileSummary` 기반으로 후속 정리한다'), 'auth-system doc must not leave SNS profile projection as follow-up');

if (failures.length) {
  console.error('[verify-auth-commonization] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[verify-auth-commonization] passed');
