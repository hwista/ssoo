import { createServerApiProxyHelpers } from '@ssoo/web-auth';

const DEFAULT_SERVER_API_URL = 'http://localhost:4000/api';

const {
  getServerApiBaseUrl,
  createServerApiUrl,
  buildServerApiProxyHeaders,
  createServerApiProxyInit,
} = createServerApiProxyHelpers({
  resolveServerApiBaseUrl: () => (
    process.env.DMS_SERVER_API_URL?.trim()
    || process.env.SERVER_API_URL?.trim()
    || process.env.NEXT_PUBLIC_API_URL?.trim()
    || DEFAULT_SERVER_API_URL
  ),
  defaultHeaders: {
    'X-SSOO-App': 'dms',
  },
});

export {
  getServerApiBaseUrl,
  createServerApiUrl,
  buildServerApiProxyHeaders,
  createServerApiProxyInit,
};

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

export async function proxySessionBackedStreamResponse(
  request: Request,
  pathname: string,
): Promise<Response> {
  const incomingAuthorization = request.headers.get('authorization');
  let sessionResponse: Response | null = null;
  let upstreamHeaders: HeadersInit | undefined = {
    Accept: 'text/event-stream',
    'Cache-Control': 'no-cache',
  };

  if (!incomingAuthorization) {
    const restoredSession = await restoreServerAccessToken(request);
    if ('errorResponse' in restoredSession) {
      return restoredSession.errorResponse;
    }

    sessionResponse = restoredSession.sessionResponse;
    upstreamHeaders = {
      ...upstreamHeaders,
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
  responseHeaders.set('Cache-Control', 'no-cache, no-transform');
  responseHeaders.set('Content-Type', 'text/event-stream; charset=utf-8');
  responseHeaders.set('X-Accel-Buffering', 'no');
  if (sessionResponse) {
    appendSetCookieHeader(responseHeaders, sessionResponse);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
