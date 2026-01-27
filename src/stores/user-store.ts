'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 사용자 인터페이스
interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
}

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
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', username })
          });

          const data = await response.json();

          if (!response.ok) {
            // 사용자가 없으면 새로 생성
            if (response.status === 404) {
              const createResponse = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username,
                  displayName: username,
                  role: 'editor'
                })
              });

              const createData = await createResponse.json();

              if (createResponse.ok) {
                set({ user: createData.user, isLoading: false });
                return true;
              }
            }

            throw new Error(data.error || '로그인 실패');
          }

          set({ user: data.user, isLoading: false });
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
          const response = await fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, ...updates })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || '프로필 업데이트 실패');
          }

          set({ user: data.user, isLoading: false });
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
