import type { AuthIdentity } from '@ssoo/types/common';
import { createAuthApiAdapter } from '@ssoo/web-auth';

export interface AuthUser extends AuthIdentity {
  userName?: string;
  displayName?: string;
  avatarUrl?: string;
}

export const authApi = createAuthApiAdapter<AuthUser>();
