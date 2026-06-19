'use client';

import { createAuthUserScopeLifecycle } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';

export const crmUserScopeLifecycle = createAuthUserScopeLifecycle({
  authStore: useAuthStore,
  logPrefix: '[crm:user-scope]',
});

export const getCurrentUserScopeId = crmUserScopeLifecycle.getCurrentUserScopeId;
export const registerUserScopedReset = crmUserScopeLifecycle.registerUserScopedReset;
