import type { AuthIdentity, AuthSessionBootstrap, AuthTokens, LoginRequest } from '@ssoo/types/common';
import type { AuthApiAdapter, AuthApiResult } from '@ssoo/web-auth';

export interface AuthUser extends AuthIdentity {
  userName?: string;
  displayName?: string;
  avatarUrl?: string;
}

async function authProxyPost<T>(
  action: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<AuthApiResult<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
    const response = await fetch(`/api/auth/${action}`, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      return {
        success: false,
        error: payload?.error || response.statusText,
        status: response.status,
      };
    }

    const data = await response.json().catch(() => undefined) as T | undefined;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '인증 요청에 실패했습니다.',
    };
  }
}

export const authApi: AuthApiAdapter<AuthUser> = {
  login: (data: LoginRequest) =>
    authProxyPost<AuthTokens>('login', data),

  refresh: (refreshToken: string) =>
    authProxyPost<AuthTokens>('refresh', { refreshToken }),

  restoreSession: () =>
    authProxyPost<AuthSessionBootstrap<AuthUser>>('session', {}),

  logout: (accessToken: string | null) =>
    authProxyPost<null>('logout', {}, accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),

  me: (accessToken: string) =>
    authProxyPost<AuthUser>('me', {}, { Authorization: `Bearer ${accessToken}` }),
};
