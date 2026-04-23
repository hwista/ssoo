import type { AuthIdentity } from '@ssoo/types/common';
import { createAuthApiAdapter } from '@ssoo/web-auth';

export type AuthUser = AuthIdentity;

export const authApi = createAuthApiAdapter<AuthUser>();
