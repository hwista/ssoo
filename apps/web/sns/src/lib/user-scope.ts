'use client';

import {
  createAuthUserScopeLifecycle,
  isUserScopeTransition,
  useUserScopeQueryCacheReset,
  type ClearableQueryClient,
} from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';
import { useAccessStore } from '@/stores/access.store';

export const snsUserScopeLifecycle = createAuthUserScopeLifecycle({
  authStore: useAuthStore,
  logPrefix: '[sns:user-scope]',
});

export const getCurrentUserScopeId = snsUserScopeLifecycle.getCurrentUserScopeId;
export const registerUserScopedReset = snsUserScopeLifecycle.registerUserScopedReset;

export function clearSnsUserScopedState(): void {
  useAccessStore.getState().reset();
}

registerUserScopedReset((next, prev) => {
  if (isUserScopeTransition(next, prev)) {
    clearSnsUserScopedState();
  }
});

export function useSnsUserScopeQueryCacheReset(queryClient: ClearableQueryClient): void {
  useUserScopeQueryCacheReset({
    lifecycle: snsUserScopeLifecycle,
    queryClient,
  });
}
