import { existsSync, readFileSync } from 'node:fs';
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

function checkMissing(path, description) {
  if (existsSync(resolve(root, path))) {
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
  'packages/web-auth/src/protected-app-bootstrap.ts',
  'protected lifecycle focus/visibility auth checks must run in background mode',
  (content) => content.includes("checkAuth({ mode: 'blocking' })")
    && content.includes("checkAuth({ mode: 'background' })"),
);

check(
  'packages/web-auth/src/store.ts',
  'background checkAuth must not flip shared isLoading for already-rendered protected apps',
  (content) => content.includes("export type CheckAuthMode = 'blocking' | 'background'")
    && content.includes("options?.mode === 'background'")
    && content.includes('if (!isBackgroundCheck) {')
    && content.includes('set({ isLoading: true });'),
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
  'shared logout, state sync, user-scope, and user-surface orchestration must be exported from @ssoo/web-auth',
  (content) => content.includes("from './logout'")
    && content.includes('useSharedLogout')
    && content.includes("from './account-center'")
    && content.includes('resolveSsooAccountCenterHref')
    && content.includes("from './user-scope'")
    && content.includes('createAuthUserScopeLifecycle')
    && content.includes("from './state-sync'")
    && content.includes('SharedAuthStateSync')
    && content.includes("from './user-surface-routing'")
    && content.includes('getSsooUserSurfaceTabPath')
    && content.includes('SsooUserSurfacePage'),
);

check(
  'packages/web-auth/src/user-surface-routing.ts',
  'shared user surface routing must use frame-tab paths rather than a physical SNS host resolver',
  (content) => content.includes('SSOO_USER_SURFACE_MY_PROFILE_PATH')
    && content.includes('SSOO_USER_SURFACE_SETTINGS_PATH')
    && content.includes('getSsooUserSurfaceTabPath')
    && content.includes('parseSsooUserSurfaceRoute')
    && !content.includes('NEXT_PUBLIC_USER_SURFACE_APP_URL')
    && !content.includes('resolveSsooUserSurfaceHref'),
);

check(
  'packages/web-auth/src/user-surface.tsx',
  'shared user surface page must refetch from server truth on local and domain-event profile/feed changes',
  (content) => content.includes('SsooUserSurfacePage')
    && content.includes('useCommonNotificationEventStream')
    && content.includes('SSOO_USER_SURFACE_CHANGED_EVENT')
    && content.includes('user.profile.updated')
    && content.includes('user.settings.updated')
    && content.includes('sns.follow.changed')
    && content.includes('sns.feed.changed'),
);

check(
  'packages/web-auth/src/user-surface.tsx',
  'shared user surface refresh must coalesce multi-app/tab profile/feed reads to avoid global throttle bursts',
  (content) => content.includes('GET_REQUEST_DEDUPE_TTL_MS')
    && content.includes('REFRESH_DEBOUNCE_MS')
    && content.includes('getRequestCache')
    && content.includes('refreshInFlightRef')
    && content.includes('refreshQueuedRef')
    && content.includes('scheduleRefresh'),
);

check(
  'packages/web-auth/src/user-surface.tsx',
  'shared user profile/settings surface must not redefine page chrome title or page width outside the shared content-page helper',
  (content) => content.includes('프로필 기본 정보')
    && !content.includes('<h1')
    && !content.includes('내 설정</h1>')
    && !content.includes('mx-auto')
    && !content.includes('max-w-2xl')
    && !content.includes('max-w-3xl')
    && !content.includes('max-w-4xl')
    && !content.includes('max-w-5xl'),
);

check(
  'packages/web-auth/package.json',
  'shared user profile/settings surface must depend on @ssoo/web-shell for the standard page header action bridge',
  (content) => content.includes('"@ssoo/web-shell": "workspace:*"'),
);

check(
  'packages/web-auth/src/user-surface.tsx',
  'shared user profile/settings page-level actions must register with the shared page header action bridge',
  (content) => content.includes('useSsooSharedSurfacePageHeaderActions(sharedHeaderActions)')
    && content.includes("surface === 'personal-settings'")
    && content.includes("mode: 'editor'")
    && content.includes('onEdit: startProfileEditing')
    && content.includes('onCancel: cancelProfileEditing')
    && !content.includes('프로필 편집')
    && !content.includes('onSave={saveProfile}'),
);

check(
  'packages/web-shell/src/shared-surface-content-page.tsx',
  'shared user-surface content page helper must pass canonical page title and registered actions to the standard shared page header',
  (content) => content.includes('SsooSharedSurfacePageHeader')
    && content.includes('useSsooSharedSurfacePageHeaderActions')
    && content.includes("mode={actions.mode ?? 'viewer'}")
    && content.includes('title={title}')
    && content.includes('description={description}'),
);

check(
  'packages/web-auth/src/user-scope.ts',
  'shared auth user-scope lifecycle must own cross-app user transition detection and listener replay',
  (content) => content.includes('createAuthUserScopeLifecycle')
    && content.includes('registerUserScopedReset')
    && content.includes('AUTH_TOKEN_BOUNDARY_PREV')
    && content.includes('shouldResetPersistedUserState')
    && content.includes('useUserScopeQueryCacheReset')
    && content.includes('queryClient.clear();'),
);

check(
  'packages/web-auth/src/state-sync.tsx',
  'shared auth state sync must propagate storage and explicit shared auth change events into each app auth store',
  (content) => content.includes('SharedAuthStateSync')
    && content.includes('SHARED_AUTH_CHANGE_EVENT')
    && content.includes("window.addEventListener('storage'")
    && content.includes('syncFromStorage()'),
);

check(
  'packages/web-auth/src/server-api-proxy.ts',
  'session-backed SSE proxy must return retrying SSE frames instead of JSON auth/throttle errors on session restore failure',
  (content) => {
    const streamProxy = content.match(/const proxySessionBackedStreamResponse[\s\S]*?const responseHeaders = createSseResponseHeaders\(response\);/)?.[0] ?? '';
    return streamProxy.includes("if ('errorResponse' in restoredSession)")
      && streamProxy.includes('appendSetCookieHeader(responseHeaders, restoredSession.errorResponse)')
      && streamProxy.includes('return createRetryingSseResponse(responseHeaders);')
      && !streamProxy.includes('return restoredSession.errorResponse;');
  },
);

for (const app of ['admin', 'crm', 'pms', 'dms', 'sns']) {
  check(
    `apps/web/${app}/src/lib/user-scope.ts`,
    `${app.toUpperCase()} must expose an app-local adapter over the shared user-scope lifecycle`,
    (content) => content.includes('createAuthUserScopeLifecycle')
      && content.includes('getCurrentUserScopeId')
      && content.includes('registerUserScopedReset'),
  );

  check(
    `apps/web/${app}/src/app/providers.tsx`,
    `${app.toUpperCase()} providers must mount shared auth state sync`,
    (content) => content.includes('SharedAuthStateSync')
      && content.includes('authStore={useAuthStore}'),
  );
}

for (const app of ['admin', 'pms', 'dms', 'sns']) {
  check(
    `apps/web/${app}/src/app/providers.tsx`,
    `${app.toUpperCase()} providers must clear query cache on auth user-scope transitions`,
    (content) => content.includes('UserScopeQueryCacheReset')
      && content.includes('queryClient'),
  );
}

for (const app of ['pms', 'sns', 'dms']) {
  check(
    `apps/web/${app}/src/components/layout/UserMenu.tsx`,
    `${app.toUpperCase()} user menu must open profile/settings as shared frame tabs, not physical SNS links`,
    (content) => content.includes('userSurfaces')
      && content.includes('getSsooUserSurfaceTabId')
      && content.includes('getSsooUserSurfaceTabPath')
      && content.includes('getSsooUserSurfaceTabTitle')
      && content.includes('onSelect')
      && !content.includes('resolveSsooUserSurfaceHref')
      && !content.includes('NEXT_PUBLIC_USER_SURFACE_APP_URL'),
  );
}

for (const app of ['admin', 'crm', 'pms', 'dms', 'sns']) {
  check(
    `apps/web/${app}/src/components/layout/ContentArea.tsx`,
    `${app.toUpperCase()} content area must render the shared user surface inside the app tab frame`,
    (content) => content.includes('SsooUserSurfacePage')
      && content.includes('parseSsooUserSurfaceRoute')
      && content.includes('getSsooUserSurfaceTabId')
      && content.includes('getSsooUserSurfaceTabPath')
      && content.includes('onOpenProfile')
      && !content.includes('resolveSsooUserSurfaceHref')
      && !content.includes('NEXT_PUBLIC_USER_SURFACE_APP_URL'),
  );
}

check(
  'apps/web/admin/src/components/layout/Header.tsx',
  'Admin user menu must open profile/settings as shared frame tabs, not physical SNS links',
  (content) => content.includes('userSurfaces')
    && content.includes('openUserSurfaceTab')
    && content.includes('getSsooUserSurfaceTabPath')
    && !content.includes('resolveSsooUserSurfaceHref')
    && !content.includes('NEXT_PUBLIC_USER_SURFACE_APP_URL'),
);

check(
  'apps/web/crm/src/components/layout/Header.tsx',
  'CRM user menu must open profile/settings as shared frame tabs, not physical SNS links',
  (content) => content.includes('userSurfaces')
    && content.includes('openUserSurfaceTab')
    && content.includes('getSsooUserSurfaceTabPath')
    && !content.includes('resolveSsooUserSurfaceHref')
    && !content.includes('NEXT_PUBLIC_USER_SURFACE_APP_URL'),
);

for (const [path, eventType] of [
  ['apps/server/src/modules/sns/profile/profile.service.ts', 'user.profile.updated'],
  ['apps/server/src/modules/sns/follow/follow.service.ts', 'sns.follow.changed'],
  ['apps/server/src/modules/sns/feed/feed.service.ts', 'sns.feed.changed'],
  ['apps/server/src/modules/sns/post/post.service.ts', 'sns.feed.changed'],
  ['apps/server/src/modules/sns/comment/comment.service.ts', 'sns.feed.changed'],
]) {
  check(
    path,
    `${path} must publish user-surface sync domain events`,
    (content) => content.includes('publishDomainEvent')
      && content.includes(eventType),
  );
}

check(
  'apps/server/src/modules/sns/profile/profile.service.ts',
  'SNS profile read/update lifecycle must keep GET side-effect free, publish only after mutation, and emit canonical shared profile paths',
  (content) => {
    const getMyProfile = content.match(/async getMyProfile[\s\S]*?\n  async getProfileByUserId/)?.[0] ?? '';
    const updateProfile = content.match(/async updateProfile[\s\S]*?\n  async addCareer/)?.[0] ?? '';
    return !getMyProfile.includes('publishDomainEvent')
      && updateProfile.includes("publishDomainEvent('sns', 'user.profile.updated'")
      && content.includes('profilePath: `/__user/profile/${profile.userId.toString()}`');
  },
);

for (const path of [
  'apps/server/src/modules/sns/profile/profile.module.ts',
  'apps/server/src/modules/sns/follow/follow.module.ts',
  'apps/server/src/modules/sns/feed/feed.module.ts',
  'apps/server/src/modules/sns/post/post.module.ts',
  'apps/server/src/modules/sns/comment/comment.module.ts',
]) {
  check(
    path,
    `${path} must import CommonNotificationModule for user-surface sync events`,
    (content) => content.includes('CommonNotificationModule'),
  );
}

check(
  'apps/server/src/app.module.ts',
  'server global throttle must allow shared user-surface multi-app reads without immediate 429 bursts',
  (content) => content.includes('ThrottlerModule.forRoot')
    && content.includes('ttl: 60000')
    && content.includes('limit: 600'),
);

check(
  'apps/server/src/modules/common/notification/notification.controller.ts',
  'common notification SSE must not consume normal API throttle quota',
  (content) => content.includes('SkipThrottle')
    && content.includes('@Sse(\'events\')')
    && content.includes('@SkipThrottle()'),
);

check(
  'compose.yaml',
  'Docker compose must not define a physical user-surface host env now that profile/settings are frame tabs',
  (content) => !content.includes('NEXT_PUBLIC_USER_SURFACE_APP_URL'),
);

for (const path of [
  'apps/web/admin/Dockerfile',
  'apps/web/crm/Dockerfile',
  'apps/web/pms/Dockerfile',
  'apps/web/dms/Dockerfile',
  'apps/web/sns/Dockerfile',
]) {
  check(
    path,
    `${path} must not expose NEXT_PUBLIC_USER_SURFACE_APP_URL`,
    (content) => !content.includes('NEXT_PUBLIC_USER_SURFACE_APP_URL')
      && content.indexOf('pnpm --filter @ssoo/web-shell build') <
        content.indexOf('pnpm --filter @ssoo/web-auth build'),
  );
}

check(
  '.env.example',
  'sample env must not expose NEXT_PUBLIC_USER_SURFACE_APP_URL for the shared frame-tab user surface',
  (content) => !content.includes('NEXT_PUBLIC_USER_SURFACE_APP_URL'),
);

check(
  'packages/web-auth/src/account-center.ts',
  'legacy account center href resolver may remain only as fallback and must not be wired through NEXT_PUBLIC_USER_SURFACE_APP_URL',
  (content) => content.includes('resolveSsooAccountCenterHref')
    && content.includes('resolveSsooUserSurfaceHref')
    && !content.includes('NEXT_PUBLIC_USER_SURFACE_APP_URL'),
);

check(
  'packages/web-auth/src/user-menu.tsx',
  'shared auth user menu must prefer userSurfaces over legacy account center fallback',
  (content) => content.includes('userSurfaces')
      && content.includes('accountCenter')
      && content.includes('...(!userSurfaces && accountCenter'),
);

check(
  'apps/web/dms/src/components/pages/settings/_components/SettingsCustomSlot.tsx',
  'DMS external settings surface must open the shared user surface as a frame tab',
  (content) => content.includes('useOpenTabWithConfirm')
      && content.includes('getSsooUserSurfaceTabPath')
      && !content.includes('resolveSsooUserSurfaceHref')
      && !content.includes('NEXT_PUBLIC_USER_SURFACE_APP_URL')
      && !content.includes("href: 'http://localhost:3004/settings'"),
);

check(
  'apps/web/sns/src/middleware.ts',
  'SNS middleware must delegate canonical shared user-surface route entries to shared route-policy rewrite',
  (content) => content.includes('sharedUserSurfaceRewritePath: APP_HOME_PATH')
    && content.includes("decision.action === 'rewrite'"),
);

check(
  'apps/web/sns/src/app/(main)/profile/[userId]/page.tsx',
  'SNS legacy profile route must only mark route entry and must not render a local physical profile page',
  (content) => content.includes('LegacyProfileRouteMarker')
    && !content.includes('ProfilePage'),
);

check(
  'apps/web/sns/src/app/(main)/settings/page.tsx',
  'SNS legacy settings route must only mark route entry and must not render a local physical settings page',
  (content) => content.includes('LegacySettingsRouteMarker')
    && !content.includes('SettingsPage'),
);

checkMissing(
  'apps/web/sns/src/components/pages/profile/ProfilePage.tsx',
  'SNS local physical profile page component must stay removed; shared user surface owns rendering',
);

checkMissing(
  'apps/web/sns/src/components/pages/settings/SettingsPage.tsx',
  'SNS local physical settings page component must stay removed; shared user surface owns rendering',
);

check(
  'apps/web/sns/src/components/pages/feed/FeedIdentityRail.tsx',
  'SNS feed identity rail must use shared user-surface paths for profile/settings quick links',
  (content) => content.includes('SSOO_USER_SURFACE_MY_PROFILE_PATH')
    && content.includes('SSOO_USER_SURFACE_SETTINGS_PATH')
    && !content.includes("'/profile/me'")
    && !content.includes("'/settings'"),
);

check(
  'apps/web/sns/src/components/pages/feed/FeedContextRail.tsx',
  'SNS feed context rail must use the shared user-surface profile path',
  (content) => content.includes('SSOO_USER_SURFACE_MY_PROFILE_PATH')
    && !content.includes('href="/profile/me"'),
);

check(
  'apps/web/sns/src/components/pages/feed/PostCard.tsx',
  'SNS feed author links must use the shared user-surface profile route helper',
  (content) => content.includes('getSsooUserSurfaceTabPath')
    && !content.includes('`/profile/${author.id}`'),
);

check(
  'apps/web/dms/src/components/layout/UserMenu.tsx',
  'DMS user menu must keep DMS settings separate from global account settings',
  (content) => content.includes("key: 'dms-settings'")
    && content.includes("label: '문서 설정'"),
);

check(
  'packages/web-auth/src/user-menu.tsx',
  'shared auth user menu must expose a first-class account center fallback action',
  (content) => content.includes('AuthUserMenuAccountCenter')
      && content.includes('userSurfaces')
      && content.includes('내 계정')
      && content.includes('resolveCurrentSsooAccountCenterHref'),
  );

check(
  'apps/web/pms/src/lib/user-scope.ts',
  'PMS user-scope cleanup must reset user-scoped open tabs',
  (content) => content.includes('useTabStore.getState().closeAllTabs()'),
);

check(
  'apps/web/dms/src/app/(auth)/login/page.tsx',
  'DMS login must rely on the shared auth user-scope lifecycle instead of a submit-time domain reset exception',
  (content) => content.includes('SharedAuthLoginPage')
    && !content.includes('resetDmsFileTreeSession')
    && !content.includes('beforeSubmit='),
);

check(
  'apps/web/dms/src/components/layout/UserMenu.tsx',
  'DMS logout must rely on the shared auth user-scope lifecycle instead of a menu-local beforeLogout reset',
  (content) => content.includes('useSharedLogout')
    && !content.includes('resetDmsFileTreeSession')
    && !content.includes('beforeLogout'),
);

check(
  'apps/server/src/modules/common/auth/auth.controller.ts',
  'server auth controller must remove the deprecated direct refresh endpoint and keep session as the only browser refresh path',
  (content) => content.includes('@Post("session")')
    && !content.includes('@Post("refresh")')
    && !content.includes('RefreshTokenDto'),
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
  'apps/web/crm/src/components/layout/Header.tsx',
  'CRM logout must use shared logout orchestration and navigate to login',
  (content) => content.includes('useSharedLogout')
    && content.includes('loginPath: LOGIN_PATH'),
);

check(
  'packages/web-auth/src/storage.ts',
  'shared auth storage must keep access tokens in runtime memory only, not persisted localStorage JSON',
  (content) => content.includes('let runtimeAccessToken: string | null = null')
    && content.includes('removePersistedTokens')
    && content.includes('delete state.accessToken')
    && content.includes('delete state.refreshToken')
    && !content.includes('accessToken: snapshot.accessToken,')
    && !content.includes('refreshToken: snapshot.refreshToken,'),
);

check(
  'packages/web-auth/src/store.ts',
  'shared auth store persist partialize must not include accessToken or refreshToken',
  (content) => {
    const match = content.match(/partialize:\s*\(state\)\s*=>\s*\(\{([\s\S]*?)\}\)/);
    return Boolean(match)
      && !match[1].includes('accessToken')
      && !match[1].includes('refreshToken')
      && !content.includes('refreshToken: string | null')
      && !content.includes('refresh: (refreshToken')
      && content.includes('setSharedAuthSession');
  },
);

check(
  'packages/types/src/common/auth.ts',
  'browser-facing AuthTokens must not expose refreshToken because refresh is HttpOnly-cookie backed',
  (content) => {
    const match = content.match(/export interface AuthTokens \{([\s\S]*?)\n\}/);
    return Boolean(match) && !match[1].includes('refreshToken');
  },
);

check(
  'packages/web-auth/src/axios-api-client.ts',
  'shared Axios API client must own bearer injection, cookie-backed session restore, and common ApiError mapping',
  (content) => content.includes('createSharedAxiosApiClient')
    && content.includes('readSharedAuthSnapshot')
    && content.includes('restoreSharedAuthSession')
    && content.includes('withCredentials: true')
    && content.includes('SharedApiError'),
);

check(
  'packages/web-auth/src/auth-proxy.ts',
  'shared auth proxy must define a standard custom CSRF header for browser-facing auth routes',
  (content) => content.includes('AUTH_PROXY_CSRF_HEADER_NAME')
    && content.includes('SSOO_STATE_CHANGE_CSRF_HEADER_NAME')
    && content.includes('AUTH_PROXY_CSRF_HEADER_VALUE')
    && content.includes('createForbiddenAuthProxyRequestResponse'),
);

check(
  'packages/web-auth/src/auth-proxy-route.ts',
  'same-origin auth proxy route must reject requests without the custom CSRF header and trusted Origin/Referer checks',
  (content) => content.includes('isValidStateChangingProxyRequest')
    && content.includes('createForbiddenAuthProxyRequestResponse'),
);

check(
  'packages/web-auth/src/state-changing-proxy.ts',
  'state-changing same-origin proxy guard must enforce custom CSRF header and trusted Origin/Referer checks',
  (content) => content.includes('SSOO_STATE_CHANGE_CSRF_HEADER_NAME')
    && content.includes('X-SSOO-CSRF')
    && content.includes('SSOO_STATE_CHANGE_CSRF_HEADER_VALUE')
    && content.includes("request.headers.get('origin')")
    && content.includes("request.headers.get('referer')")
    && content.includes("request.headers.get('host')")
    && content.includes("request.headers.get('x-forwarded-host')")
    && content.includes("request.headers.get('x-forwarded-proto')")
    && content.includes("fetchSite === 'cross-site'")
    && content.includes('createForbiddenStateChangingProxyRequestResponse'),
);

check(
  'packages/web-auth/src/server-api-proxy.ts',
  'server API proxy helpers must preserve Origin and Referer and own session-backed binary/SSE restore helpers',
  (content) => content.includes("'origin'")
    && content.includes("'referer'")
    && content.includes("'authorization'")
    && content.includes("'cookie'")
    && content.includes('restoreServerAccessToken')
    && content.includes('proxySessionBackedBinaryResponse')
    && content.includes('proxySessionBackedStreamResponse')
    && content.includes("createServerApiUrl('/auth/session')"),
);

check(
  'apps/web/dms/src/app/api/_shared/serverApiProxy.ts',
  'DMS server API proxy shim must consume shared session-backed binary/SSE helpers instead of duplicating restore logic',
  (content) => content.includes('createServerApiProxyHelpers')
    && content.includes('proxySessionBackedBinaryResponse')
    && content.includes('proxySessionBackedStreamResponse')
    && !content.includes('async function restoreServerAccessToken')
    && !content.includes('interface BackendSuccessResponse'),
);

check(
  'apps/web/dms/src/app/api/storage/open/route.ts',
  'DMS storage/open GET must use the shared session-backed binary proxy helper',
  (content) => content.includes('proxySessionBackedBinaryResponse')
    && content.includes('return proxySessionBackedBinaryResponse(req, pathname);')
    && !content.includes('await fetch(createServerApiUrl(pathname)'),
);

check(
  'apps/web/sns/src/stores/auth.store.ts',
  'SNS auth store must use AuthIdentityProfileProjection instead of widening AuthIdentity locally',
  (content) => content.includes('AuthIdentityProfileProjection')
    && !content.includes('interface AuthUser extends AuthIdentity'),
);

check(
  'packages/web-auth/src/auth-api.ts',
  'shared auth API adapter must send the standard custom CSRF header on every auth proxy POST',
  (content) => content.includes('AUTH_PROXY_CSRF_HEADER_NAME')
    && content.includes('AUTH_PROXY_CSRF_HEADER_VALUE')
    && content.includes('[AUTH_PROXY_CSRF_HEADER_NAME]: AUTH_PROXY_CSRF_HEADER_VALUE'),
);

check(
  'packages/web-auth/src/auth-proxy.ts',
  'browser-facing auth proxy action allowlist must exclude body-based refresh',
  (content) => content.includes("export type AuthProxyAction = 'login' | 'logout' | 'me' | 'session'")
    && !content.includes("'refresh'"),
);

check(
  'packages/web-auth/src/auth-proxy-route.ts',
  'same-origin password reset proxy route must share auth proxy CSRF/origin validation and only allow request/confirm actions',
  (content) => content.includes('createPasswordResetProxyPostHandler')
    && content.includes('PASSWORD_RESET_PROXY_ACTIONS')
    && content.includes("'request'")
    && content.includes("'confirm'")
    && content.includes('isValidStateChangingProxyRequest')
    && content.includes('/auth/password-reset/${action}'),
);

check(
  'packages/web-auth/src/password-reset-page.tsx',
  'shared password reset form must send the standard custom CSRF header through the app-local same-origin reset proxy',
  (content) => content.includes('AUTH_PROXY_CSRF_HEADER_NAME')
    && content.includes('AUTH_PROXY_CSRF_HEADER_VALUE')
    && content.includes('[AUTH_PROXY_CSRF_HEADER_NAME]: AUTH_PROXY_CSRF_HEADER_VALUE')
    && content.includes("'/api/auth/password-reset'")
    && !content.includes('NEXT_PUBLIC_API_URL'),
);

for (const app of ['admin', 'pms', 'sns']) {
  check(
    `apps/web/${app}/src/lib/api/client.ts`,
    `${app.toUpperCase()} Axios API client must delegate auth interceptors to @ssoo/web-auth`,
    (content) => content.includes('createSharedAxiosApiClient')
      && !content.includes('axios.create')
      && !content.includes('restoreSharedAuthSession'),
  );
}

check(
  'apps/server/src/modules/common/auth/password-reset.service.ts',
  'password reset must expire previous challenges and consume all active challenges after success',
  (content) => content.includes('RESET_REQUEST_COOLDOWN_SECONDS')
    && content.includes("statusCode: 'superseded'")
    && content.includes("statusCode: 'consumed'")
    && content.includes('tx.userPasswordResetChallenge.updateMany'),
);

check(
  'apps/server/src/modules/common/auth/microsoft-identity.service.ts',
  'Microsoft OAuth state must be signed and ID token issuer/clock claims must be validated',
  (content) => content.includes('createHmac')
    && content.includes('timingSafeEqual')
    && content.includes('isExpectedIssuer')
    && content.includes('claims.nbf')
    && content.includes('claims.iat')
    && content.includes('MICROSOFT_FETCH_TIMEOUT_MS'),
);

check(
  'apps/server/src/modules/common/auth/auth.controller.ts',
  'auth controller must not return refresh tokens in browser JSON responses',
  (content) => content.includes('toClientTokens')
    && content.includes('this.applySessionCookie(response, tokens.refreshToken)')
    && !content.includes('return success(tokens,'),
);

check(
  'apps/server/src/main.ts',
  'server bootstrap must apply Helmet security headers',
  (content) => content.includes("import helmet from 'helmet'")
    && content.includes('app.use(helmet('),
);

check(
  'apps/server/src/main.ts',
  'server bootstrap must use Logger instead of console.log',
  (content) => content.includes("new Logger('Bootstrap')")
    && !content.includes('console.log'),
);

check(
  'apps/server/src/modules/common/auth/guards/jwt-auth.guard.ts',
  'JWT guard must not log Authorization header fragments or request auth details',
  (content) => !content.includes('Authorization header')
    && !content.includes('authHeader')
    && !content.includes('handleRequest - err'),
);

check(
  'apps/server/src/modules/common/auth/strategies/jwt.strategy.ts',
  'JWT strategy must not log raw JWT payloads',
  (content) => !content.includes('JSON.stringify(payload)')
    && !content.includes('Validating JWT payload'),
);

check(
  'packages/web-shell/next-security-headers.cjs',
  'shared Next security headers must define frame, MIME, referrer, permissions, and CSP/report-only baseline',
  (content) => content.includes('Content-Security-Policy')
    && content.includes('Content-Security-Policy-Report-Only')
    && content.includes("frame-ancestors 'none'")
    && content.includes("base-uri 'self'")
    && content.includes("object-src 'none'")
    && content.includes("default-src 'self'")
    && content.includes("script-src 'self'")
    && content.includes("img-src 'self' data: blob: https://www.gravatar.com")
    && content.includes('trusted-types ssoo-dms-markdown default')
    && content.includes("require-trusted-types-for 'script'")
    && content.includes('X-Content-Type-Options')
    && content.includes('Referrer-Policy')
    && content.includes('X-Frame-Options')
    && content.includes('Permissions-Policy'),
);

check(
  'packages/web-shell/next-config.cjs',
  'shared Next config factory must own common standalone/tracing/transpile/header/image defaults',
  (content) => content.includes('createSsooNextConfig')
    && content.includes('BASE_TRANSPILE_PACKAGES')
    && content.includes("'@ssoo/types'")
    && content.includes("'@ssoo/web-auth'")
    && content.includes("'@ssoo/web-shell'")
    && content.includes('next-security-headers.cjs')
    && content.includes('www.gravatar.com')
    && content.includes("output: 'standalone'")
    && content.includes('outputFileTracingRoot'),
);

check(
  'packages/web-shell/src/route-policy.ts',
  'shared route policy helper must centralize allowed path/prefix fallback decisions without depending on Next runtime objects',
  (content) => content.includes('resolveSsooRoutePolicyDecision')
    && content.includes('isSsooRoutePolicyAllowed')
    && content.includes('SSOO_ROUTE_POLICY_MATCHER')
    && content.includes("SSOO_SHARED_USER_SURFACE_PATH_PREFIX = '/__user'")
    && content.includes('isSsooSharedUserSurfacePath')
    && content.includes('sharedUserSurfaceRewritePath')
    && content.includes("action: 'rewrite'")
    && content.includes("action: 'next'")
    && !content.includes('NextResponse')
    && !content.includes('NextRequest'),
);

check(
  'packages/web-shell/package.json',
  'web-shell must expose route-policy as a subpath so middleware edge bundles do not import React surfaces',
  (content) => content.includes('"./route-policy"')
    && content.includes('"./dist/route-policy.js"')
    && content.includes('"./dist/route-policy.d.ts"'),
);

for (const app of ['admin', 'crm', 'dms', 'pms', 'sns']) {
  check(
    `apps/web/${app}/src/middleware.ts`,
    `${app.toUpperCase()} middleware must delegate route decisions to the shared route policy helper while keeping a Next-static matcher literal`,
    (content) => content.includes('resolveSsooRoutePolicyDecision')
      && content.includes("@ssoo/web-shell/route-policy")
      && content.includes('sharedUserSurfaceRewritePath: APP_HOME_PATH')
      && content.includes("decision.action === 'rewrite'")
      && content.includes("matcher: ['/((?!api|_next|.*\\\\..*|favicon.ico).*)']")
      && !content.includes('SSOO_ROUTE_POLICY_MATCHER'),
  );
}

check(
  'apps/web/admin/src/lib/constants/routes.ts',
  'Admin route entries must live in constants instead of middleware-local arrays',
  (content) => content.includes('ADMIN_ROOT_ENTRY_PATHS')
    && content.includes('ADMIN_ALLOWED_PATH_PREFIXES')
    && content.includes('PASSWORD_RESET_PATH'),
);

check(
  'apps/web/crm/src/lib/constants/routes.ts',
  'CRM route constants must expose the shared auth entry paths consumed by middleware',
  (content) => content.includes('ROOT_ENTRY_PATHS')
    && content.includes('PASSWORD_RESET_PATH'),
);

for (const [app, configPath] of [
  ['admin', 'apps/web/admin/next.config.mjs'],
  ['crm', 'apps/web/crm/next.config.mjs'],
  ['dms', 'apps/web/dms/next.config.js'],
  ['pms', 'apps/web/pms/next.config.mjs'],
  ['sns', 'apps/web/sns/next.config.mjs'],
]) {
  check(
    configPath,
    `${app.toUpperCase()} Next config must consume the shared SSOO Next config factory`,
    (content) => content.includes('createSsooNextConfig')
      && !content.includes('next-security-headers.cjs')
      && !content.includes('transpilePackages:'),
  );
}

check(
  'apps/web/dms/next.config.js',
  'DMS Next config may keep only document-domain serverExternalPackages as an app-specific override',
  (content) => content.includes("serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist']")
    && !content.includes('remotePatterns'),
);

check(
  'apps/web/dms/src/lib/utils/markdown.ts',
  'DMS Markdown renderer must sanitize generated HTML and strip unsafe href/src protocols',
  (content) => content.includes('DOMPurify.sanitize')
    && content.includes('FORBID_TAGS')
    && content.includes('script')
    && content.includes('element.removeAttribute')
    && content.includes("url.protocol === 'mailto:'")
    && !content.includes('return parser.parse(markdown'),
);

check(
  'apps/web/dms/src/lib/utils/linkUtils.ts',
  'DMS link/image resolution must allow-list protocols and block data/javascript URLs',
  (content) => content.includes('ALLOWED_EXTERNAL_HREF_PROTOCOLS')
    && content.includes('ALLOWED_IMAGE_SRC_PROTOCOLS')
    && content.includes("new URL(rawHref)")
    && content.includes("new URL(trimmedSrc)")
    && !content.includes("src.startsWith('data:')"),
);

check(
  'apps/web/dms/src/components/common/MermaidBlock.tsx',
  'DMS Mermaid rendering must use strict security mode',
  (content) => content.includes("securityLevel: 'strict'"),
);

check(
  'apps/server/src/modules/dms/file/file.constants.ts',
  'DMS file constants must classify active browser content separately and keep SVG out of inline image uploads',
  (content) => content.includes('ACTIVE_CONTENT_ATTACHMENT_EXTENSIONS')
    && content.includes("'.html'")
    && content.includes("'.htm'")
    && content.includes("'.svg'")
    && content.includes('resolveAttachmentDisposition')
    && !content.includes("  'image/svg+xml',\n]);"),
);

check(
  'apps/server/src/modules/dms/file/file.controller.ts',
  'DMS file controller must apply Multer file-size limits before buffering uploads',
  (content) => content.includes('AttachmentFileInterceptor')
    && content.includes('ImageFileInterceptor')
    && content.includes('limits: { fileSize: getConfiguredUploadLimitBytes')
    && !content.includes("@UseInterceptors(FileInterceptor('file'))"),
);

check(
  'apps/server/src/modules/dms/file/file.controller.ts',
  'DMS file controller must prevent active content inline serving and validate image signatures',
  (content) => content.includes('isActiveContentAttachment')
    && content.includes('formatContentDisposition')
    && content.includes('X-Content-Type-Options')
    && content.includes('assertValidImageUpload')
    && content.includes('matchesImageSignature')
    && content.includes('SVG/HTML 파일은 raw preview로 제공하지 않습니다.'),
);

check(
  'apps/server/src/modules/dms/storage/storage.controller.ts',
  'DMS storage open fallback must share the active-content attachment and nosniff policy',
  (content) => content.includes('resolveAttachmentDisposition')
    && content.includes('formatContentDisposition')
    && content.includes('X-Content-Type-Options')
    && !content.includes("download === '1' ? 'attachment' : 'inline'"),
);

if (failures.length > 0) {
  console.error('[verify-auth-product-hardening] failed');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('[verify-auth-product-hardening] passed');
