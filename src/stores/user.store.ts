'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userApi, User } from '@/lib/utils/apiClient';

export type { User };

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface UserActions {
  login: (username: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

type UserStore = UserState & UserActions;

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      login: async (username: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        try {
          const response = await userApi.login(username);

          if (!response.success) {
            // 사용자가 없으면 새로 생성
            if (response.error?.includes('404')) {
              const createResponse = await userApi.create({
                username,
                displayName: username,
                role: 'editor'
              });

              if (createResponse.success && createResponse.data) {
                set({ user: createResponse.data.user, isLoading: false });
                return true;
              }
            }

            throw new Error(response.error || '로그인 실패');
          }

          if (response.data) {
            set({ user: response.data.user, isLoading: false });
          }
          return true;

        } catch (err) {
          set({ 
            error: err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다',
            isLoading: false 
          });
          return false;
        }
      },

      logout: () => {
        set({ user: null, error: null });
      },

      updateProfile: async (updates: Partial<User>): Promise<boolean> => {
        const { user } = get();
        if (!user) return false;

        set({ isLoading: true, error: null });

        try {
          const response = await userApi.updateProfile(user.id, updates);

          if (!response.success) {
            throw new Error(response.error || '프로필 업데이트 실패');
          }

          if (response.data) {
            set({ user: response.data.user, isLoading: false });
          }
          return true;

        } catch (err) {
          set({ 
            error: err instanceof Error ? err.message : '프로필 업데이트 중 오류가 발생했습니다',
            isLoading: false 
          });
          return false;
        }
      },
    }),
    {
      name: 'wiki_user',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
