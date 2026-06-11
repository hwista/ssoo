import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function check(path, description, predicate) {
  const content = read(path);
  if (!predicate(content)) {
    failures.push(`${relative(root, resolve(root, path))}: ${description}`);
  }
}

check(
  'package.json',
  'must expose pnpm run verify:auth-commonization for the existing commonization verifier',
  (content) => content.includes('"verify:auth-commonization"')
    && content.includes('scripts/verify-auth-commonization.mjs'),
);

check(
  'packages/web-auth/src/login-page.tsx',
  'SharedAuthLoginPage must support safe returnTo-based post-login routing',
  (content) => content.includes('returnTo')
    && content.includes('resolveAuthReturnPath')
    && content.includes('navigate(resolveAuthReturnPath'),
);

check(
  'packages/web-auth/src/login-page.tsx',
  'SharedAuthLoginPage must own the standard AuthPageShell so app layouts cannot drift login chrome',
  (content) => content.includes('AuthPageShell')
    && content.includes('<AuthPageShell>')
    && content.includes('<AuthStandardLoginCard'),
);

check(
  'packages/web-auth/src/ui.tsx',
  'standard login UI must keep neutral SSOT login copy without descriptive tagline drift',
  (content) => content.includes("title = '로그인'")
    && content.includes('SSOT')
    && content.includes('© 2026 SSOT')
    && content.includes('passwordResetHref')
    && content.includes('registrationLink')
    && content.includes('identityProviders')
    && !content.includes(['삼삼오오', '모여서 일한다'].join(' '))
    && !content.includes(['SSOT 계정으로', '서비스를 이용합니다'].join(' '))
    && !content.includes('SSOT 로그인')
    && !content.includes('으로 계속합니다')
    && !content.includes('SSOO 계정')
    && !content.includes('appDescription={appDescription}'),
);

check(
  'packages/web-auth/src/login-page.tsx',
  'SharedAuthLoginPage must expose env-driven optional recovery, registration request, internal SSO, and Microsoft 365 login actions',
  (content) => content.includes('NEXT_PUBLIC_AUTH_PASSWORD_RESET_URL')
    && content.includes('NEXT_PUBLIC_AUTH_SIGNUP_REQUEST_URL')
    && content.includes('NEXT_PUBLIC_AUTH_SIGNUP_URL')
    && content.includes('NEXT_PUBLIC_AUTH_SSO_URL')
    && content.includes('NEXT_PUBLIC_AUTH_OAUTH_MICROSOFT_URL')
    && content.includes('Microsoft 365 로그인')
    && !content.includes('NEXT_PUBLIC_AUTH_OAUTH_URL')
    && !content.includes('NEXT_PUBLIC_AUTH_OAUTH_GOOGLE_URL')
    && !content.includes('Google 로그인'),
);

for (const app of ['admin', 'crm', 'dms', 'pms', 'sns']) {
  check(
    `apps/web/${app}/src/app/(auth)/login/page.tsx`,
    `${app.toUpperCase()} login page must not pass app-specific visible login copy into SharedAuthLoginPage`,
    (content) => content.includes('SharedAuthLoginPage')
      && !content.includes('appName=')
      && !content.includes('appDescription='),
  );

  check(
    `apps/web/${app}/src/app/(auth)/layout.tsx`,
    `${app.toUpperCase()} auth layout must not wrap login in app-specific AuthPageShell chrome`,
    (content) => !content.includes('AuthPageShell')
      && !content.includes('dms-auth-theme'),
  );
}

for (const [app, configPath] of [
  ['admin', 'apps/web/admin/tailwind.config.ts'],
  ['crm', 'apps/web/crm/tailwind.config.ts'],
  ['dms', 'apps/web/dms/tailwind.config.js'],
  ['pms', 'apps/web/pms/tailwind.config.ts'],
  ['sns', 'apps/web/sns/tailwind.config.ts'],
]) {
  check(
    configPath,
    `${app.toUpperCase()} Tailwind content must include @ssoo/web-auth so shared login styles are emitted`,
    (content) => content.includes('packages/web-auth/src'),
  );
}

check(
  'packages/web-auth/src/protected-app-bootstrap.ts',
  'useProtectedAppBootstrap must pass the current path to unauthenticated redirects for returnTo preservation',
  (content) => content.includes('onUnauthenticated: (currentPath: string) => void')
    && content.includes('getCurrentPathname')
    && content.includes('onUnauthenticated(getCurrentPathname())'),
);

check(
  'packages/web-auth/src/logout.ts',
  'shared logout orchestration hook must exist for app cleanup + redirect ordering',
  (content) => content.includes('useSharedLogout')
    && content.includes('beforeLogout')
    && content.includes('afterLogout')
    && content.includes('navigate(loginPath)'),
);

check(
  'packages/web-auth/src/account-center.ts',
  'shared SNS account center resolver must exist for cross-app account/profile/security navigation',
  (content) => content.includes('DEFAULT_SSOO_ACCOUNT_CENTER_URL')
    && content.includes('resolveSsooAccountCenterHref')
    && content.includes('resolveCurrentSsooAccountCenterHref'),
);

check(
  'packages/web-auth/src/user-menu.tsx',
  'shared auth user menu must expose a first-class account center action',
  (content) => content.includes('AuthUserMenuAccountCenter')
    && content.includes('accountCenter')
    && content.includes('내 계정')
    && content.includes('resolveCurrentSsooAccountCenterHref'),
);

check(
  'packages/web-auth/src/store.ts',
  'shared auth store must expose auth-clear cleanup hooks for user-scoped app state',
  (content) => content.includes('onAuthCleared')
    && content.includes('AuthClearReason')
    && content.includes("clearAuthState('login-start'")
    && content.includes("clearAuthState('logout'")
    && content.includes("clearAuthState('storage-missing'"),
);

check(
  'packages/web-auth/src/index.ts',
  'shared logout orchestration must be exported from @ssoo/web-auth',
  (content) => content.includes("from './logout'")
    && content.includes('useSharedLogout')
    && content.includes("from './account-center'")
    && content.includes('resolveSsooAccountCenterHref'),
);

for (const app of ['pms', 'sns']) {
  check(
    `apps/web/${app}/src/stores/auth.store.ts`,
    `${app.toUpperCase()} auth store must wire shared auth clear cleanup into user-scoped access state`,
    (content) => content.includes('onAuthCleared')
      && content.includes('useAccessStore.getState().reset()'),
  );
}

for (const app of ['pms', 'sns', 'dms']) {
  check(
    `apps/web/${app}/src/components/layout/UserMenu.tsx`,
    `${app.toUpperCase()} user menu must route account/profile/security to SNS account center`,
    (content) => content.includes('accountCenter')
      && content.includes('NEXT_PUBLIC_SNS_APP_URL'),
  );
}

check(
  'apps/web/admin/src/components/layout/Header.tsx',
  'Admin user menu must route account/profile/security to SNS account center',
  (content) => content.includes('accountCenter')
    && content.includes('NEXT_PUBLIC_SNS_APP_URL'),
);

check(
  'apps/web/crm/src/components/layout/AppLayout.tsx',
  'CRM user menu must route account/profile/security to SNS account center',
  (content) => content.includes('accountCenter')
    && content.includes('NEXT_PUBLIC_SNS_APP_URL'),
);

check(
  'apps/web/dms/src/components/layout/UserMenu.tsx',
  'DMS user menu must keep DMS settings separate from global account settings',
  (content) => content.includes("key: 'dms-settings'")
    && content.includes("label: '설정'"),
);

check(
  'apps/web/dms/src/components/pages/settings/_components/SettingsCustomSlot.tsx',
  'DMS external settings surface must use the shared SNS account center resolver',
  (content) => content.includes('resolveSsooAccountCenterHref')
    && content.includes('NEXT_PUBLIC_SNS_APP_URL')
    && !content.includes("href: 'http://localhost:3004/settings'"),
);

check(
  'apps/web/pms/src/stores/auth.store.ts',
  'PMS auth clear cleanup must also reset user-scoped open tabs',
  (content) => content.includes('useTabStore.getState().closeAllTabs()'),
);

check(
  'apps/web/dms/src/app/(auth)/login/page.tsx',
  'DMS login must preserve domain cleanup through SharedAuthLoginPage.beforeSubmit',
  (content) => content.includes('resetDmsFileTreeSession')
    && content.includes('beforeSubmit={resetDmsFileTreeSession}'),
);

check(
  'packages/types/src/common/auth.ts',
  'browser-facing AuthIdentity must stay role-free',
  (content) => {
    const match = content.match(/export interface AuthIdentity \{([\s\S]*?)\n\}/);
    return Boolean(match) && !match[1].includes('roleCode');
  },
);

check(
  'apps/server/src/modules/common/auth/interfaces/auth.interface.ts',
  'JWT TokenPayload must stay role-free',
  (content) => {
    const match = content.match(/export interface TokenPayload \{([\s\S]*?)\n\}/);
    return Boolean(match) && !match[1].includes('roleCode');
  },
);

check(
  'apps/server/src/modules/common/auth/guards/roles.guard.ts',
  'route-level admin gate must use access foundation system.override instead of auth payload roleCode',
  (content) => content.includes('resolveActionPermissionContext')
    && content.includes('systemOverrideMatched = adminRequested && actionContext.policy.hasSystemOverride')
    && !content.includes('user.roleCode'),
);

check(
  'apps/web/admin/src/app/(main)/layout.tsx',
  'Admin shell must not gate on browser auth user.roleCode',
  (content) => content.includes('usePermissionCatalog')
    && !content.includes('user?.roleCode')
    && !content.includes('user.roleCode'),
);

for (const app of ['pms', 'dms', 'sns']) {
  check(
    `apps/web/${app}/src/components/layout/UserMenu.tsx`,
    `${app.toUpperCase()} user menu must use shared logout orchestration`,
    (content) => content.includes('useSharedLogout')
      && content.includes('handleLogout')
      && content.includes('loginPath: LOGIN_PATH'),
  );
}

check(
  'apps/web/admin/src/components/layout/Header.tsx',
  'Admin header logout must use shared logout orchestration and navigate to login',
  (content) => content.includes('useSharedLogout')
    && content.includes('loginPath: LOGIN_PATH'),
);

check(
  'apps/web/crm/src/components/layout/AppLayout.tsx',
  'CRM logout must use shared logout orchestration and navigate to login',
  (content) => content.includes('useSharedLogout')
    && content.includes('loginPath: LOGIN_PATH'),
);

if (failures.length > 0) {
  console.error('[verify-auth-product-hardening] failed');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('[verify-auth-product-hardening] passed');
