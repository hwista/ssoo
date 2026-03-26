import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@/lib/api/auth';

export interface AuthUser {
  userId: string;
  loginId: string;
  roleCode: string;
  userTypeCode: string;
  isAdmin: boolean;
  userName?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      _hasHydrated: false,

      login: async (loginId: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ loginId, password });
          if (response.success && response.data) {
            const { accessToken, refreshToken } = response.data;
            set({
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
            authApi.me(accessToken).then((meResponse) => {
              if (meResponse.success && meResponse.data) {
                set({ user: meResponse.data });
              }
            }).catch(() => {});
          } else {
            throw new Error(response.message || '로그인에 실패했습니다.');
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { accessToken } = get();
        try {
          if (accessToken) {
            await authApi.logout(accessToken);
          }
        } finally {
          get().clearAuth();
        }
      },

      checkAuth: async () => {
        const { accessToken, refreshToken } = get();
        if (!accessToken && !refreshToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          if (accessToken) {
            try {
              const meResponse = await authApi.me(accessToken);
              if (meResponse.success && meResponse.data) {
                set({ user: meResponse.data, isAuthenticated: true, isLoading: false });
                return;
              }
            } catch (error: unknown) {
              const isUnauthorized = (error as { status?: number })?.status === 401;
              if (!isUnauthorized) {
                set({ isLoading: false });
                return;
              }
            }
          }

          if (refreshToken) {
            try {
              const success = await get().refreshTokens();
              if (success) {
                const newAccessToken = get().accessToken;
                if (newAccessToken) {
                  const meResponse = await authApi.me(newAccessToken);
                  if (meResponse.success && meResponse.data) {
                    set({ user: meResponse.data, isAuthenticated: true, isLoading: false });
                    return;
                  }
                }
              }
            } catch {
              // Refresh failed
            }
          }

          get().clearAuth();
        } catch {
          set({ isLoading: false });
        }
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const response = await authApi.refresh(refreshToken);
          if (response.success && response.data) {
            set({
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
              isAuthenticated: true,
            });
            return true;
          }
          return false;
        } catch {
          get().clearAuth();
          return false;
        }
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user: AuthUser) => {
        set({ user });
      },

      clearAuth: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'ssoo-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
