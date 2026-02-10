import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@/lib/api/auth';

/** HTTP 에러 상태 코드 확인 헬퍼 */
function isHttpError(error: unknown, statusCode: number): boolean {
  if (typeof error !== 'object' || error === null) return false;
  // Axios 에러: error.response.status
  const axiosStatus = (error as { response?: { status?: number } }).response?.status;
  if (axiosStatus === statusCode) return true;
  // 일반 에러: error.status
  const status = (error as { status?: number }).status;
  return status === statusCode;
}

export interface AuthUser {
  userId: string;
  loginId: string;
  roleCode: string;
  userTypeCode: string;
  isAdmin: boolean; // 관리자 여부
}

interface AuthState {
  // State
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  // Actions
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
      // Initial State
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      _hasHydrated: false,

      // Actions
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

            // 사용자 정보 조회 (실패해도 로그인은 완료 - 토큰은 이미 유효)
            try {
              const meResponse = await authApi.me(accessToken);
              if (meResponse.success && meResponse.data) {
                set({ user: meResponse.data });
              }
            } catch {
              // me() 실패는 무시 - 다음 checkAuth에서 재시도
            }
          } else {
            set({ isLoading: false });
            throw new Error(response.message || '로그인에 실패했습니다.');
          }
        } catch (error) {
          set({ isLoading: false });
          if (error instanceof Error) throw error;
          throw new Error('로그인에 실패했습니다.');
        }
      },

      logout: async () => {
        const { accessToken } = get();
        try {
          if (accessToken) {
            await authApi.logout(accessToken);
          }
        } catch {
          // 로그아웃 API 실패해도 클라이언트는 로그아웃 처리
        } finally {
          get().clearAuth();
        }
      },

      checkAuth: async () => {
        const { accessToken, refreshToken } = get();
        
        // 토큰이 없으면 인증되지 않음
        if (!accessToken && !refreshToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });

        try {
          // Access Token으로 사용자 정보 확인 시도
          if (accessToken) {
            try {
              const meResponse = await authApi.me(accessToken);
              if (meResponse.success && meResponse.data) {
                set({ user: meResponse.data, isAuthenticated: true, isLoading: false });
                return;
              }
            } catch (error: unknown) {
              // 401 확정 → refresh 시도로 이동
              // 네트워크 에러(서버 미응답 등) → 기존 인증 유지
              if (!isHttpError(error, 401)) {
                set({ isLoading: false });
                return; // 네트워크 에러 시 기존 인증 상태 유지
              }
            }
          }

          // Access Token 실패(401) 시 Refresh Token으로 재인증 시도
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
              // Refresh 실패 → clearAuth
            }
          }

          // Access Token 401 + Refresh 실패 → 인증 초기화
          get().clearAuth();
        } catch {
          // 예상치 못한 오류 - 기존 인증 유지 (서버 일시 장애 대응)
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
