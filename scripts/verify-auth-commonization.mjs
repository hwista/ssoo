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
assert(webAuthIndex.includes('SharedAuthLoginPage'), 'web-auth must export SharedAuthLoginPage');
assert(webAuthIndex.includes('AuthClearReason'), 'web-auth must export auth clear hook reason type');

for (const app of apps) {
  const pkg = packageJson(`apps/web/${app}/package.json`);
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  assert(deps['@ssoo/web-auth'], `${app} must depend on @ssoo/web-auth`);
  assert(deps.zustand, `${app} must depend on zustand for the shared auth store`);

  const loginPagePath = `apps/web/${app}/src/app/(auth)/login/page.tsx`;
  const authStorePath = `apps/web/${app}/src/stores/auth.store.ts`;
  const authApiPath = `apps/web/${app}/src/lib/api/auth.ts`;
  const proxyRoutePath = `apps/web/${app}/src/app/api/auth/[action]/route.ts`;
  const proxySharedPath = `apps/web/${app}/src/app/api/_shared/serverApiProxy.ts`;

  assert(exists(loginPagePath), `${app} must expose an app-local /login route`);
  assert(exists(authStorePath), `${app} must expose a shared auth store wrapper`);
  assert(exists(authApiPath), `${app} must expose a shared auth api adapter`);
  assert(exists(proxyRoutePath), `${app} must expose same-origin /api/auth/[action] proxy`);
  assert(exists(proxySharedPath), `${app} must expose server API proxy helpers`);

  if (exists(loginPagePath)) {
    const loginPage = file(loginPagePath);
    assert(loginPage.includes('SharedAuthLoginPage'), `${app} login page must use SharedAuthLoginPage`);
    assert(!loginPage.includes('useLoginPageBootstrap'), `${app} login page must not duplicate bootstrap hook wiring`);
  }

  if (exists(proxySharedPath)) {
    const proxyShared = file(proxySharedPath);
    assert(proxyShared.includes("'X-SSOO-App':"), `${app} server API proxy helpers must stamp X-SSOO-App`);
    assert(proxyShared.includes(`'${app}'`), `${app} server API proxy helpers must stamp app id ${app}`);
  }

  if (exists(proxyRoutePath)) {
    const proxyRoute = file(proxyRoutePath);
    assert(proxyRoute.includes('createAuthProxyPostHandler'), `${app} auth proxy route must use createAuthProxyPostHandler`);
    assert(!proxyRoute.includes('createUnsupportedAuthProxyActionResponse'), `${app} auth proxy route must not duplicate action handling`);
  }
}

const authController = file('apps/server/src/modules/common/auth/auth.controller.ts');
assert(authController.includes("return 'admin';"), 'server auth issuedApp resolver must include admin');
assert(authController.includes("return 'crm';"), 'server auth issuedApp resolver must include crm');
assert(!authController.includes('roleCode: user.roleCode'), 'server auth responses must not expose roleCode');

const sharedAuthTypes = file('packages/types/src/common/auth.ts');
assert(!interfaceBlock(sharedAuthTypes, 'AuthIdentity').includes('roleCode'), 'AuthIdentity must not expose roleCode');

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

if (failures.length) {
  console.error('[verify-auth-commonization] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[verify-auth-commonization] passed');
