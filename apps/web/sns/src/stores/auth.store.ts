import type { AuthIdentityProfileProjection } from '@ssoo/types/common';
import { createAuthStore, toBaseAuthIdentity } from '@ssoo/web-auth';
import { authApi } from '@/lib/api/auth';

export type AuthUser = AuthIdentityProfileProjection;

function toAuthUser(value: unknown): AuthUser | null {
  const base = toBaseAuthIdentity(value);
  if (!base) {
    return null;
  }

  if (!value || typeof value !== 'object') {
    return base;
  }

  const candidate = value as Partial<AuthUser>;
  return {
    ...base,
    userName: typeof candidate.userName === 'string' ? candidate.userName : undefined,
    displayName: typeof candidate.displayName === 'string' ? candidate.displayName : null,
    avatarUrl: typeof candidate.avatarUrl === 'string' ? candidate.avatarUrl : null,
  };
}

export const useAuthStore = createAuthStore<AuthUser>({
  authApi,
  normalizeUser: toAuthUser,
});
