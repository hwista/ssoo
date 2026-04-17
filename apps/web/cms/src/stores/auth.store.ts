import type { AuthIdentity } from '@ssoo/types/common';
import { createAuthStore, toBaseAuthIdentity } from '@ssoo/web-auth';
import { authApi } from '@/lib/api/auth';

export interface AuthUser extends AuthIdentity {
  userName?: string;
  displayName?: string;
  avatarUrl?: string;
}

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
    displayName: typeof candidate.displayName === 'string' ? candidate.displayName : undefined,
    avatarUrl: typeof candidate.avatarUrl === 'string' ? candidate.avatarUrl : undefined,
  };
}

export const useAuthStore = createAuthStore<AuthUser>({
  authApi,
  normalizeUser: toAuthUser,
});
