import type {
  AuthIdentity,
  AuthSessionBootstrap,
  AuthTokens,
  LoginRequest,
} from '@ssoo/types/common';
import type { AuthProxyAction } from './auth-proxy';
import type { AuthApiAdapter, AuthApiResult } from './store';

const DEFAULT_AUTH_API_BASE_PATH = '/api/auth';

export interface CreateAuthApiAdapterOptions {
  basePath?: string;
  credentials?: RequestCredentials;
  fetchImpl?: typeof fetch;
}

function buildAuthApiUrl(basePath: string, action: AuthProxyAction): string {
  return `${basePath.replace(/\/+$/, '')}/${action}`;
}

function resolveFetchImpl(fetchImpl?: typeof fetch): typeof fetch {
  const candidate = fetchImpl ?? globalThis.fetch;
  return candidate.bind(globalThis) as typeof fetch;
}

async function readAuthApiError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error || response.statusText;
}

async function authProxyPost<T>(
  options: Required<CreateAuthApiAdapterOptions>,
  action: AuthProxyAction,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<AuthApiResult<T>> {
  try {
    const response = await options.fetchImpl(buildAuthApiUrl(options.basePath, action), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: options.credentials,
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        success: false,
        error: await readAuthApiError(response),
        status: response.status,
      };
    }

    const data = await response.json().catch(() => undefined) as T | undefined;
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '인증 요청에 실패했습니다.',
    };
  }
}

export function createAuthApiAdapter<TUser extends AuthIdentity = AuthIdentity>(
  options: CreateAuthApiAdapterOptions = {},
): AuthApiAdapter<TUser> {
  const resolvedOptions: Required<CreateAuthApiAdapterOptions> = {
    basePath: options.basePath ?? DEFAULT_AUTH_API_BASE_PATH,
    credentials: options.credentials ?? 'same-origin',
    fetchImpl: resolveFetchImpl(options.fetchImpl),
  };

  return {
    login: (data: LoginRequest) => authProxyPost<AuthTokens>(resolvedOptions, 'login', data),
    refresh: (refreshToken: string) =>
      authProxyPost<AuthTokens>(resolvedOptions, 'refresh', { refreshToken }),
    restoreSession: () =>
      authProxyPost<AuthSessionBootstrap<TUser>>(resolvedOptions, 'session', {}),
    logout: (accessToken: string | null) =>
      authProxyPost<null>(
        resolvedOptions,
        'logout',
        {},
        accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      ),
    me: (accessToken: string) =>
      authProxyPost<TUser>(
        resolvedOptions,
        'me',
        {},
        { Authorization: `Bearer ${accessToken}` },
      ),
  };
}
