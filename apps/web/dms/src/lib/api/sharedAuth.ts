import {
  applySharedAuthHeaders,
  clearSharedAuthState,
  readSharedAuthSnapshot,
  restoreSharedAuthSession,
  setSharedAuthSession,
  SHARED_AUTH_CHANGE_EVENT,
  SHARED_AUTH_STORAGE_KEY,
} from '@ssoo/web-auth';

export {
  applySharedAuthHeaders,
  clearSharedAuthState,
  readSharedAuthSnapshot,
  setSharedAuthSession,
  SHARED_AUTH_CHANGE_EVENT,
  SHARED_AUTH_STORAGE_KEY,
};

interface SharedAuthFetchOptions {
  retryOnUnauthorized?: boolean;
  skipAuth?: boolean;
}

function normalizeRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url;
  }

  return String(input);
}

function isAuthEndpoint(input: RequestInfo | URL): boolean {
  const requestUrl = normalizeRequestUrl(input);

  if (typeof window === 'undefined') {
    return requestUrl.includes('/api/auth/');
  }

  const pathname = new URL(requestUrl, window.location.origin).pathname;
  return pathname.startsWith('/api/auth/');
}

export async function fetchWithSharedAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: SharedAuthFetchOptions = {},
): Promise<Response> {
  const shouldRetry = options.retryOnUnauthorized !== false && !isAuthEndpoint(input);
  const requestInit: RequestInit = {
    ...init,
    credentials: init.credentials ?? 'same-origin',
    headers: applySharedAuthHeaders(init.headers, { skipAuth: options.skipAuth }),
  };

  const response = await fetch(input, requestInit);
  if (!shouldRetry || response.status !== 401) {
    return response;
  }

  const restored = await restoreSharedAuthSession();
  if (!restored.success) {
    return response;
  }

  return fetch(input, {
    ...init,
    credentials: init.credentials ?? 'same-origin',
    headers: applySharedAuthHeaders(init.headers, {
      forceAuthorization: true,
      skipAuth: options.skipAuth,
    }),
  });
}
