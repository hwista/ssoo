import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthIdentity, AuthSessionBootstrap, AuthTokens, LoginRequest } from '@ssoo/types/common';
import { createSafeJsonStateStorage, readSharedAuthSnapshot, SHARED_AUTH_STORAGE_KEY } from './storage';

export interface AuthApiResult<T> {
  success: boolean;
  data?: T | null;
  message?: string;
  error?: string;
  status?: number;
}

export interface AuthApiAdapter<TUser extends AuthIdentity = AuthIdentity> {
  login: (data: LoginRequest) => Promise<AuthApiResult<AuthTokens>>;
  refresh: (refreshToken: string) => Promise<AuthApiResult<AuthTokens>>;
  restoreSession: () => Promise<AuthApiResult<AuthSessionBootstrap<TUser>>>;
  logout: (accessToken: string | null) => Promise<AuthApiResult<null>>;
  me: (accessToken: string) => Promise<AuthApiResult<TUser>>;
}

export interface AuthStoreState<TUser extends AuthIdentity> {
  accessToken: string | null;
  refreshToken: string | null;
  user: TUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
}

export interface AuthStoreActions<TUser extends AuthIdentity> {
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: TUser | null) => void;
  clearAuth: () => void;
  syncFromStorage: () => void;
  setHasHydrated: (state: boolean) => void;
}

export type AuthStore<TUser extends AuthIdentity> = AuthStoreState<TUser> & AuthStoreActions<TUser>;

export type AuthClearReason =
  | 'login-start'
  | 'login-profile-failed'
  | 'logout'
  | 'check-failed'
  | 'refresh-failed'
  | 'storage-missing'
  | 'manual-clear';

export interface CreateAuthStoreOptions<TUser extends AuthIdentity> {
  authApi: AuthApiAdapter<TUser>;
  normalizeUser: (value: unknown) => TUser | null;
  onAuthCleared?: (reason: AuthClearReason) => void;
  shouldKeepSessionOnCheckFailure?: (result: AuthApiResult<unknown>) => boolean;
  storageKey?: string;
}

function isUnauthorizedResult(result: AuthApiResult<unknown>): boolean {
  return result.status === 401;
}

function getAuthErrorMessage(result: AuthApiResult<unknown>, fallback: string): string {
  return result.error || result.message || fallback;
}

function toRestoredUser<TUser extends AuthIdentity>(
  data: AuthSessionBootstrap<TUser>,
): Pick<AuthStoreState<TUser>, 'accessToken' | 'refreshToken' | 'user' | 'isAuthenticated'> {
  return {
    accessToken: data.accessToken,
    refreshToken: null,
    user: data.user,
    isAuthenticated: true,
  };
}

export function createAuthStore<TUser extends AuthIdentity>(
  options: CreateAuthStoreOptions<TUser>,
): UseBoundStore<StoreApi<AuthStore<TUser>>> {
  const {
    authApi,
    normalizeUser,
    onAuthCleared,
    shouldKeepSessionOnCheckFailure = (result) => !isUnauthorizedResult(result),
    storageKey = SHARED_AUTH_STORAGE_KEY,
  } = options;

  const notifyAuthCleared = (reason: AuthClearReason) => {
    if (!onAuthCleared) {
      return;
    }

    try {
      onAuthCleared(reason);
    } catch (error) {
      if (typeof console !== 'undefined') {
        console.warn('[web-auth] 인증 상태 정리 후크 실행에 실패했습니다.', error);
      }
    }
  };

  return create<AuthStore<TUser>>()(
    persist(
      (set, get) => {
        const clearAuthState = (
          reason: AuthClearReason,
          overrides: Partial<Pick<AuthStoreState<TUser>, 'isLoading'>> = {},
        ) => {
          set({
            accessToken: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            ...overrides,
          });
          notifyAuthCleared(reason);
        };

        return {
          accessToken: null,
          refreshToken: null,
          user: null,
          isLoading: false,
          isAuthenticated: false,
          _hasHydrated: false,

          login: async (loginId: string, password: string) => {
            clearAuthState('login-start', { isLoading: true });

            const loginResponse = await authApi.login({ loginId, password });
            if (!loginResponse.success || !loginResponse.data) {
              set({ isLoading: false });
              throw new Error(getAuthErrorMessage(loginResponse, '로그인에 실패했습니다.'));
            }

            const { accessToken } = loginResponse.data;
            const meResponse = await authApi.me(accessToken);
            if (meResponse.success && meResponse.data) {
              set({
                accessToken,
                refreshToken: null,
                user: meResponse.data,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }

            clearAuthState('login-profile-failed');
            throw new Error(getAuthErrorMessage(meResponse, '사용자 정보를 불러오지 못했습니다.'));
          },

          logout: async () => {
            const { accessToken } = get();

            try {
              await authApi.logout(accessToken);
            } finally {
              clearAuthState('logout');
            }
          },

          checkAuth: async () => {
            const { accessToken } = get();
            const hadAccessToken = Boolean(accessToken);

            set({ isLoading: true });

            if (accessToken) {
              const meResponse = await authApi.me(accessToken);
              if (meResponse.success && meResponse.data) {
                set({
                  user: meResponse.data,
                  isAuthenticated: true,
                  isLoading: false,
                });
                return;
              }

              if (shouldKeepSessionOnCheckFailure(meResponse)) {
                set({ isLoading: false });
                return;
              }
            }

            const restored = await authApi.restoreSession();
            if (restored.success && restored.data) {
              set({
                ...toRestoredUser(restored.data),
                isLoading: false,
              });
              return;
            }

            if (hadAccessToken && shouldKeepSessionOnCheckFailure(restored)) {
              set({ isLoading: false });
              return;
            }

            clearAuthState('check-failed');
          },

          refreshTokens: async () => {
            const restored = await authApi.restoreSession();
            if (!restored.success || !restored.data) {
              if (shouldKeepSessionOnCheckFailure(restored)) {
                return false;
              }

              clearAuthState('refresh-failed');
              return false;
            }

            set({
              ...toRestoredUser(restored.data),
            });
            return true;
          },

          setTokens: (accessToken: string, refreshToken: string) => {
            set({ accessToken, refreshToken, isAuthenticated: true });
          },

          setUser: (user: TUser | null) => {
            set({ user });
          },

          clearAuth: () => {
            clearAuthState('manual-clear');
          },

          syncFromStorage: () => {
            const snapshot = readSharedAuthSnapshot();
            if (!snapshot) {
              clearAuthState('storage-missing');
              return;
            }

            set({
              accessToken: snapshot.accessToken,
              refreshToken: snapshot.refreshToken,
              user: normalizeUser(snapshot.user),
              isAuthenticated: snapshot.isAuthenticated,
            });
          },

          setHasHydrated: (state: boolean) => {
            set({ _hasHydrated: state });
          },
        };
      },
      {
        name: storageKey,
        storage: createJSONStorage(() => createSafeJsonStateStorage(() => localStorage)),
        partialize: (state) => ({
          accessToken: state.accessToken,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      },
    ),
  );
}
