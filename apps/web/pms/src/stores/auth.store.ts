import type { AuthIdentity } from '@ssoo/types/common';
import { createAuthStore, toBaseAuthIdentity } from '@ssoo/web-auth';
import { authApi } from '@/lib/api/auth';
import { useAccessStore } from './access.store';
import { useTabStore } from './tab.store';

export type AuthUser = AuthIdentity;

function clearPmsUserScopedState(): void {
  useAccessStore.getState().reset();
  useTabStore.getState().closeAllTabs();
}

export const useAuthStore = createAuthStore<AuthUser>({
  authApi,
  normalizeUser: toBaseAuthIdentity,
  onAuthCleared: clearPmsUserScopedState,
});
