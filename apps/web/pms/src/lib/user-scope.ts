'use client';

import {
  createAuthUserScopeLifecycle,
  isUserScopeTransition,
  useUserScopeQueryCacheReset,
  type ClearableQueryClient,
} from '@ssoo/web-auth';
import { useAccessStore } from '@/stores/access.store';
import { useAuthStore } from '@/stores/auth.store';
import { useTabStore } from '@/stores/tab.store';

export const pmsUserScopeLifecycle = createAuthUserScopeLifecycle({
  authStore: useAuthStore,
  logPrefix: '[pms:user-scope]',
});

export const getCurrentUserScopeId = pmsUserScopeLifecycle.getCurrentUserScopeId;
export const registerUserScopedReset = pmsUserScopeLifecycle.registerUserScopedReset;

export function clearPmsUserScopedState(next: string | null = null): void {
  useAccessStore.getState().reset();
  useTabStore.getState().syncUserScope(next);
}

registerUserScopedReset((next, prev) => {
  if (isUserScopeTransition(next, prev)) {
    clearPmsUserScopedState(next);
  }
});

export function usePmsUserScopeQueryCacheReset(queryClient: ClearableQueryClient): void {
  useUserScopeQueryCacheReset({
    lifecycle: pmsUserScopeLifecycle,
    queryClient,
  });
}
