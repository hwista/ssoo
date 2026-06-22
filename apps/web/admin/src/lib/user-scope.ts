'use client';

import {
  createAuthUserScopeLifecycle,
  useUserScopeQueryCacheReset,
  type ClearableQueryClient,
} from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';

export const adminUserScopeLifecycle = createAuthUserScopeLifecycle({
  authStore: useAuthStore,
  logPrefix: '[admin:user-scope]',
});

export const getCurrentUserScopeId = adminUserScopeLifecycle.getCurrentUserScopeId;
export const registerUserScopedReset = adminUserScopeLifecycle.registerUserScopedReset;

export function useAdminUserScopeQueryCacheReset(queryClient: ClearableQueryClient): void {
  useUserScopeQueryCacheReset({
    lifecycle: adminUserScopeLifecycle,
    queryClient,
  });
}
