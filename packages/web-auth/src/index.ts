export {
  SHARED_AUTH_STORAGE_KEY,
  SHARED_AUTH_CHANGE_EVENT,
  isBaseAuthIdentity,
  toBaseAuthIdentity,
  readSharedAuthSnapshot,
  getSharedAccessToken,
  getSharedRefreshToken,
  writeSharedAuthSnapshot,
  setSharedAuthTokens,
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
  CreateAuthStoreOptions,
} from './store';

export {
  createAuthProxyRouteResponse,
  createUnsupportedAuthProxyActionResponse,
  isSupportedAuthProxyAction,
} from './auth-proxy';
export type { AuthProxyAction } from './auth-proxy';

export { createAuthApiAdapter } from './auth-api';
export type { CreateAuthApiAdapterOptions } from './auth-api';

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

export { proxyCommonNotificationJson } from './notification-proxy';
export type { ProxyCommonNotificationJsonOptions } from './notification-proxy';

export {
  SharedAuthLoginPage,
} from './login-page';
export type { SharedAuthLoginPageProps } from './login-page';

export {
  createAuthProxyPostHandler,
} from './auth-proxy-route';
export type {
  AuthProxyRouteContext,
  CreateAuthProxyPostHandlerOptions,
} from './auth-proxy-route';

export {
  createServerApiProxyHelpers,
} from './server-api-proxy';
export type { CreateServerApiProxyHelpersOptions } from './server-api-proxy';
