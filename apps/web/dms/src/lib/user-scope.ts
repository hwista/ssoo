'use client';

import {
  createAuthUserScopeLifecycle,
  isUserScopeTransition,
  shouldResetPersistedUserState,
  useUserScopeQueryCacheReset,
  type ClearableQueryClient,
  type UserScopeChangeListener,
} from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';

export type UserChangeListener = UserScopeChangeListener;

export const dmsUserScopeLifecycle = createAuthUserScopeLifecycle({
  authStore: useAuthStore,
  logPrefix: '[dms:user-scope]',
});

export { isUserScopeTransition, shouldResetPersistedUserState };

export const getCurrentUserScopeId = dmsUserScopeLifecycle.getCurrentUserScopeId;
export const registerUserScopedReset = dmsUserScopeLifecycle.registerUserScopedReset;

export function useDmsUserScopeQueryCacheReset(queryClient: ClearableQueryClient): void {
  useUserScopeQueryCacheReset({
    lifecycle: dmsUserScopeLifecycle,
    queryClient,
  });
}
