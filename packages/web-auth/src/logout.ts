import { useCallback } from 'react';
import type { AuthIdentity } from '@ssoo/types/common';
import type { AuthStore } from './store';
import type { StoreApi, UseBoundStore } from 'zustand';

export interface UseSharedLogoutOptions<TUser extends AuthIdentity = AuthIdentity> {
  authStore: UseBoundStore<StoreApi<AuthStore<TUser>>>;
  navigate: (path: string) => void;
  loginPath?: string;
  beforeLogout?: () => void | Promise<void>;
  afterLogout?: () => void | Promise<void>;
}

export function useSharedLogout<TUser extends AuthIdentity = AuthIdentity>({
  authStore,
  navigate,
  loginPath = '/login',
  beforeLogout,
  afterLogout,
}: UseSharedLogoutOptions<TUser>): () => Promise<void> {
  const logout = authStore((state) => state.logout);

  return useCallback(async () => {
    await beforeLogout?.();
    try {
      await logout();
    } finally {
      await afterLogout?.();
      navigate(loginPath);
    }
  }, [afterLogout, beforeLogout, loginPath, logout, navigate]);
}
