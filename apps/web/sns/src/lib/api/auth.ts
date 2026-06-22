import type { AuthIdentityProfileProjection } from '@ssoo/types/common';
import { createAuthApiAdapter } from '@ssoo/web-auth';

export type AuthUser = AuthIdentityProfileProjection;

export const authApi = createAuthApiAdapter<AuthUser>();
