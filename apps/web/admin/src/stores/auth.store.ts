import type { AuthIdentity } from '@ssoo/types/common';
import { createAuthStore, toBaseAuthIdentity } from '@ssoo/web-auth';
import { authApi } from '@/lib/api/auth';

export type AuthUser = AuthIdentity;

export const useAuthStore = createAuthStore<AuthUser>({
  authApi,
  normalizeUser: toBaseAuthIdentity,
});
