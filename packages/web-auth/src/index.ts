export {
  SHARED_AUTH_STORAGE_KEY,
  SHARED_AUTH_CHANGE_EVENT,
  isBaseAuthIdentity,
  toBaseAuthIdentity,
  readSharedAuthSnapshot,
  getSharedAccessToken,
  writeSharedAuthSnapshot,
  setSharedAuthSession,
  clearSharedAuthState,
  applySharedAuthHeaders,
} from './storage';
export type {
  SharedAuthSnapshot,
  SharedAuthHeaderOptions,
} from './storage';

export { createAuthStore } from './store';
export type {
  AuthApiResult,
  AuthApiAdapter,
  AuthStoreState,
  AuthStoreActions,
  AuthStore,
  AuthClearReason,
  CheckAuthMode,
  CheckAuthOptions,
  CreateAuthStoreOptions,
} from './store';

export {
  AUTH_PROXY_CSRF_HEADER_NAME,
  AUTH_PROXY_CSRF_HEADER_VALUE,
  createAuthProxyRouteResponse,
  createForbiddenAuthProxyRequestResponse,
  createUnsupportedAuthProxyActionResponse,
  isSupportedAuthProxyAction,
} from './auth-proxy';
export type { AuthProxyAction } from './auth-proxy';

export { createAuthApiAdapter } from './auth-api';
export type { CreateAuthApiAdapterOptions } from './auth-api';

export {
  createSharedAxiosApiClient,
  SharedApiError,
} from './axios-api-client';
export type {
  CreateSharedAxiosApiClientOptions,
} from './axios-api-client';

export {
  AUTH_TOKEN_BOUNDARY_PREV,
  createAuthUserScopeLifecycle,
  isUserScopeTransition,
  shouldResetPersistedUserState,
  useUserScopeQueryCacheReset,
} from './user-scope';
export type {
  AuthUserScopeLifecycle,
  ClearableQueryClient,
  CreateAuthUserScopeLifecycleOptions,
  UserScopeChangeListener,
  UserScopeId,
  UseUserScopeQueryCacheResetOptions,
} from './user-scope';

export { SharedAuthStateSync } from './state-sync';
export type { SharedAuthStateSyncProps } from './state-sync';

export {
  restoreSharedAuthSession,
} from './session-bootstrap';
export type {
  RestoreSharedAuthSessionResult,
  RestoreSharedAuthSessionSuccess,
  RestoreSharedAuthSessionFailure,
} from './session-bootstrap';

export {
  useProtectedAppBootstrap,
} from './protected-app-bootstrap';
export type {
  UseProtectedAppBootstrapOptions,
  UseProtectedAppBootstrapResult,
} from './protected-app-bootstrap';

export {
  useLoginPageBootstrap,
} from './login-bootstrap';
export type {
  UseLoginPageBootstrapOptions,
  UseLoginPageBootstrapResult,
} from './login-bootstrap';

export {
  AuthPageShell,
  AuthLoadingScreen,
  AuthLoginCard,
  AuthStandardLoginCard,
} from './ui';
export type {
  LoginValidationErrors,
  AuthPageShellProps,
  AuthLoadingScreenProps,
  AuthLoginCardProps,
  AuthStandardLoginCardProps,
  AuthLoginActionLink,
  AuthIdentityProviderAction,
} from './ui';

export { AuthUserMenu } from './user-menu';
export type {
  AuthUserMenuAccountCenter,
  AuthUserMenuAction,
  AuthUserMenuProps,
  AuthUserMenuUserSurfaceAction,
  AuthUserMenuUserSurfaces,
} from './user-menu';

export {
  DEFAULT_SSOO_ACCOUNT_CENTER_PATH,
  DEFAULT_SSOO_ACCOUNT_CENTER_URL,
  resolveCurrentSsooAccountCenterHref,
  resolveSsooAccountCenterHref,
} from './account-center';
export type {
  ResolveCurrentSsooAccountCenterHrefOptions,
  ResolveSsooAccountCenterHrefOptions,
} from './account-center';

export {
  SSOO_USER_SURFACE_MY_PROFILE_PATH,
  SSOO_USER_SURFACE_PROFILE_PATH_PREFIX,
  SSOO_USER_SURFACE_SETTINGS_PATH,
  getSsooUserSurfaceTabId,
  getSsooUserSurfacePageDescription,
  getSsooUserSurfaceTabPath,
  getSsooUserSurfaceTabTitle,
  isSsooUserSurfaceRoute,
  parseSsooUserSurfaceRoute,
} from './user-surface-routing';
export type {
  SsooUserSurfaceRoute,
  SsooUserSurfaceTabKind,
} from './user-surface-routing';

export {
  SSOO_USER_SURFACE_CHANGED_EVENT,
  dispatchSsooUserSurfaceChanged,
} from './user-surface-events';
export type {
  SsooUserSurfaceChangedDetail,
  SsooUserSurfaceEventType,
} from './user-surface-events';

export { SsooUserSurfacePage } from './user-surface';
export type { SsooUserSurfacePageProps } from './user-surface';

export { useSharedLogout } from './logout';
export type { UseSharedLogoutOptions } from './logout';

export {
  createCommonNotificationApi,
  useCommonNotificationEventStream,
} from './notifications';
export type {
  CommonNotificationApi,
  CommonNotificationApiResult,
  CreateCommonNotificationApiOptions,
  UseCommonNotificationEventStreamOptions,
} from './notifications';
export { useCommonNotificationCenter } from './notification-center-state';
export type {
  CommonNotificationCenterState,
  CommonNotificationCenterSourceFilter,
  UseCommonNotificationCenterOptions,
} from './notification-center-state';

export { proxyCommonNotificationJson } from './notification-proxy';
export type { ProxyCommonNotificationJsonOptions } from './notification-proxy';

export {
  createNotificationProxyRouteHandlers,
} from './notification-proxy-route';
export type {
  CreateNotificationProxyRouteHandlersOptions,
  NotificationProxyRouteContext,
} from './notification-proxy-route';

export {
  DEFAULT_SSOO_NOTIFICATION_APP_URLS,
  getCommonNotificationPath,
  getCommonNotificationPayloadString,
  getCommonNotificationSourceLabel,
  resolveCommonNotificationHref,
} from './notification-routing';
export type {
  ResolveCommonNotificationHrefOptions,
  SsooNotificationAppUrls,
} from './notification-routing';

export {
  buildCommonSearchRequest,
  createCommonSearchApi,
} from './search';
export type {
  CommonSearchApi,
  CommonSearchApiResult,
  CreateCommonSearchApiOptions,
} from './search';

export {
  getCommonGlobalSearchQueryFromPath,
  getCommonGlobalSearchSourceAppFromPath,
  useCommonGlobalSearchAdapter,
} from './global-search-adapter';
export type {
  CommonGlobalSearchOpenContext,
  CommonGlobalSearchPageAdapter,
  UseCommonGlobalSearchAdapterOptions,
} from './global-search-adapter';

export {
  DEFAULT_SSOO_SEARCH_API_BASE_URL,
  DEFAULT_SSOO_SEARCH_APP_URLS,
  getCommonSearchApiBaseUrl,
  getCommonSearchAppUrlsFromPublicEnv,
  getCommonSearchSourceLabel,
  resolveCommonSearchResultHref,
} from './search-routing';
export type {
  ResolveCommonSearchResultHrefOptions,
  SsooSearchAppUrls,
} from './search-routing';

export {
  SSOO_STATE_CHANGE_CSRF_HEADER_NAME,
  SSOO_STATE_CHANGE_CSRF_HEADER_VALUE,
  createForbiddenStateChangingProxyRequestResponse,
  isValidStateChangingProxyRequest,
} from './state-changing-proxy';
export type {
  StateChangingProxyRequestValidationOptions,
} from './state-changing-proxy';

export {
  SharedAuthLoginPage,
} from './login-page';
export type { SharedAuthLoginPageProps } from './login-page';

export {
  SharedPasswordResetPage,
} from './password-reset-page';
export type { SharedPasswordResetPageProps } from './password-reset-page';

export {
  createAuthProxyPostHandler,
  createPasswordResetProxyPostHandler,
} from './auth-proxy-route';
export type {
  PasswordResetProxyAction,
  PasswordResetProxyRouteContext,
} from './auth-proxy-route';
export type {
  AuthProxyRouteContext,
  CreateAuthProxyPostHandlerOptions,
} from './auth-proxy-route';

export {
  createServerApiProxyHelpers,
} from './server-api-proxy';
export type {
  CreateServerApiProxyHelpersOptions,
  RestoreServerAccessTokenResult,
  ServerApiProxyBackendErrorResponse,
  ServerApiProxyBackendSuccessResponse,
  SessionBackedAccessTokenPayload,
} from './server-api-proxy';
