const DEFAULT_SERVER_API_URL = 'http://localhost:4000/api';
const AUTH_FORWARD_HEADERS = ['authorization', 'cookie'] as const;

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: {
    message?: string;
  };
  message?: string;
}

interface AuthSessionBootstrapPayload {
  accessToken: string;
}

function hasHeader(headers: Headers, headerName: string): boolean {
  return Array.from(headers.keys()).some((key) => key.toLowerCase() === headerName.toLowerCase());
}

export function getServerApiBaseUrl(): string {
  return (
    process.env.DMS_SERVER_API_URL?.trim()
    || process.env.NEXT_PUBLIC_API_URL?.trim()
    || DEFAULT_SERVER_API_URL
  ).replace(/\/+$/, '');
}

export function createServerApiUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getServerApiBaseUrl()}${normalizedPath}`;
}

export function buildServerApiProxyHeaders(
  requestHeaders: Headers,
  initialHeaders?: HeadersInit,
): Headers {
  const headers = new Headers(initialHeaders);

  for (const headerName of AUTH_FORWARD_HEADERS) {
    const headerValue = requestHeaders.get(headerName);
    if (headerValue && !hasHeader(headers, headerName)) {
      headers.set(headerName, headerValue);
    }
  }

  return headers;
}

export function createServerApiProxyInit(request: Request, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    cache: init.cache ?? 'no-store',
    headers: buildServerApiProxyHeaders(request.headers, init.headers),
    signal: init.signal ?? request.signal,
  };
}

function appendSetCookieHeader(headers: Headers, response: Response): void {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    headers.append('set-cookie', setCookie);
  }
}

function getBackendErrorMessage(
  responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null,
  fallbackMessage: string,
): string {
  if (!responseBody || responseBody.success === true) {
    return fallbackMessage;
  }

  return responseBody.error?.message || responseBody.message || fallbackMessage;
}

async function restoreServerAccessToken(
  request: Request,
): Promise<
  | { accessToken: string; sessionResponse: Response }
  | { errorResponse: Response }
> {
  const sessionResponse = await fetch(
    createServerApiUrl('/auth/session'),
    createServerApiProxyInit(request, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );

  const sessionBody = await sessionResponse.json().catch(() => null) as
    | BackendSuccessResponse<AuthSessionBootstrapPayload>
    | BackendErrorResponse
    | null;

  if (
    !sessionResponse.ok
    || !sessionBody
    || sessionBody.success !== true
    || typeof sessionBody.data?.accessToken !== 'string'
  ) {
    const errorHeaders = new Headers();
    appendSetCookieHeader(errorHeaders, sessionResponse);

    return {
      errorResponse: Response.json(
        {
          error: getBackendErrorMessage(sessionBody, '인증 세션을 복원하지 못했습니다. 다시 로그인하세요.'),
        },
        {
          status: sessionResponse.status || 401,
          headers: errorHeaders,
        },
      ),
    };
  }

  return {
    accessToken: sessionBody.data.accessToken,
    sessionResponse,
  };
}

export async function proxySessionBackedBinaryResponse(
  request: Request,
  pathname: string,
): Promise<Response> {
  const incomingAuthorization = request.headers.get('authorization');
  let sessionResponse: Response | null = null;
  let upstreamHeaders: HeadersInit | undefined;

  if (!incomingAuthorization) {
    const restoredSession = await restoreServerAccessToken(request);
    if ('errorResponse' in restoredSession) {
      return restoredSession.errorResponse;
    }

    sessionResponse = restoredSession.sessionResponse;
    upstreamHeaders = {
      Authorization: `Bearer ${restoredSession.accessToken}`,
    };
  }

  const response = await fetch(
    createServerApiUrl(pathname),
    createServerApiProxyInit(request, {
      headers: upstreamHeaders,
    }),
  );

  const responseHeaders = new Headers(response.headers);
  if (sessionResponse) {
    appendSetCookieHeader(responseHeaders, sessionResponse);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
