import type {
  AuthIdentity,
  AuthSessionRestore,
  AuthTokens,
  LoginRequest,
} from '@ssoo/types/common';
import type { AuthProxyAction } from './auth-proxy';
import {
  AUTH_PROXY_CSRF_HEADER_NAME,
  AUTH_PROXY_CSRF_HEADER_VALUE,
} from './auth-proxy';
import type { AuthApiAdapter, AuthApiResult } from './store';
import { getAuthRequestVersion, registerSharedAuthRequest } from './storage';

const DEFAULT_AUTH_API_BASE_PATH = '/api/auth';
const sessionRequests = new WeakMap<typeof fetch, Map<string, Promise<AuthApiResult<unknown>>>>();

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
  const controller = new AbortController();
  const unregister = action === 'session' || action === 'me'
    ? registerSharedAuthRequest(controller) : () => {};
  try {
    const response = await options.fetchImpl(buildAuthApiUrl(options.basePath, action), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [AUTH_PROXY_CSRF_HEADER_NAME]: AUTH_PROXY_CSRF_HEADER_VALUE,
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: options.credentials,
      cache: 'no-store',
      // Finish cookie rotation even when the document navigates away.
      keepalive: action === 'session',
      signal: controller.signal,
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
  } finally {
    unregister();
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
  const fetchKey = options.fetchImpl ?? globalThis.fetch;
  let requests = sessionRequests.get(fetchKey);
  if (!requests) {
    requests = new Map();
    sessionRequests.set(fetchKey, requests);
  }
  const restoreSession = (): Promise<AuthApiResult<AuthSessionRestore<TUser>>> => {
    const key = `${resolvedOptions.basePath}::${resolvedOptions.credentials}::${getAuthRequestVersion()}`;
    const existing = requests.get(key);
    if (existing) return existing as Promise<AuthApiResult<AuthSessionRestore<TUser>>>;
    const pending = authProxyPost<AuthSessionRestore<TUser>>(resolvedOptions, 'session', {})
      .finally(() => { if (requests.get(key) === pending) requests.delete(key); });
    requests.set(key, pending);
    return pending;
  };

  return {
    login: (data: LoginRequest) => authProxyPost<AuthTokens>(resolvedOptions, 'login', data),
    restoreSession,
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
