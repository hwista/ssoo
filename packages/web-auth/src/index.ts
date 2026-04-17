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
} from './ui';

export { AuthUserMenu } from './user-menu';
export type {
  AuthUserMenuAction,
  AuthUserMenuProps,
} from './user-menu';
