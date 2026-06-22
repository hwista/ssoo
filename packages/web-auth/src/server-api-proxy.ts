const DEFAULT_AUTH_FORWARD_HEADERS = ['authorization', 'cookie', 'origin', 'referer'] as const;
const SSE_PROXY_RETRY_DELAY_MS = 30000;

export interface CreateServerApiProxyHelpersOptions {
  resolveServerApiBaseUrl: () => string;
  forwardHeaders?: readonly string[];
  defaultHeaders?: HeadersInit;
}

export interface ServerApiProxyBackendSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ServerApiProxyBackendErrorResponse {
  success?: false;
  error?: {
    message?: string;
  };
  message?: string;
}

export interface SessionBackedAccessTokenPayload {
  accessToken: string;
}

export type RestoreServerAccessTokenResult =
  | { accessToken: string; sessionResponse: Response }
  | { errorResponse: Response };

function appendSetCookieHeader(headers: Headers, response: Response): void {
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    headers.append('set-cookie', setCookie);
  }
}

function createSseRetryFrame(): Uint8Array {
  const encoder = new TextEncoder();
  const data = JSON.stringify({
    type: 'heartbeat',
    emittedAt: new Date().toISOString(),
  });

  return encoder.encode(`retry: ${SSE_PROXY_RETRY_DELAY_MS}\nevent: heartbeat\ndata: ${data}\n\n`);
}

function createSseResponseHeaders(response?: Response): Headers {
  const headers = new Headers(response?.headers);
  headers.set('Cache-Control', 'no-cache, no-transform');
  headers.set('Content-Type', 'text/event-stream; charset=utf-8');
  headers.set('X-Accel-Buffering', 'no');

  return headers;
}

function createRetryingSseResponse(headers: Headers): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(createSseRetryFrame());
      controller.close();
    },
  }), {
    status: 200,
    headers,
  });
}

function createGuardedSseStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let cancelled = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      reader = source.getReader();

      try {
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            controller.enqueue(value);
          }
        }
      } catch {
        if (!cancelled) {
          controller.enqueue(createSseRetryFrame());
        }
      } finally {
        if (!cancelled) {
          controller.close();
        }
        reader?.releaseLock();
        reader = null;
      }
    },
    async cancel(reason) {
      cancelled = true;
      await reader?.cancel(reason).catch(() => undefined);
      reader = null;
    },
  });
}

function getBackendErrorMessage(
  responseBody:
    | ServerApiProxyBackendSuccessResponse<unknown>
    | ServerApiProxyBackendErrorResponse
    | null,
  fallbackMessage: string,
): string {
  if (!responseBody || responseBody.success === true) {
    return fallbackMessage;
  }

  return responseBody.error?.message || responseBody.message || fallbackMessage;
}

export function createServerApiProxyHelpers({
  resolveServerApiBaseUrl,
  forwardHeaders = DEFAULT_AUTH_FORWARD_HEADERS,
  defaultHeaders,
}: CreateServerApiProxyHelpersOptions) {
  const getServerApiBaseUrl = (): string => resolveServerApiBaseUrl().replace(/\/+$/, '');

  const createServerApiUrl = (pathname: string): string => {
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${getServerApiBaseUrl()}${normalizedPath}`;
  };

  const buildServerApiProxyHeaders = (
    requestHeaders: Headers,
    initialHeaders?: HeadersInit,
  ): Headers => {
    const headers = new Headers(defaultHeaders);
    const initialHeaderBag = new Headers(initialHeaders);
    initialHeaderBag.forEach((value, key) => {
      headers.set(key, value);
    });

    for (const headerName of forwardHeaders) {
      const headerValue = requestHeaders.get(headerName);
      if (headerValue && !headers.has(headerName)) {
        headers.set(headerName, headerValue);
      }
    }

    return headers;
  };

  const createServerApiProxyInit = (request: Request, init: RequestInit = {}): RequestInit => ({
    ...init,
    cache: init.cache ?? 'no-store',
    headers: buildServerApiProxyHeaders(request.headers, init.headers),
    signal: init.signal ?? request.signal,
  });

  const restoreServerAccessToken = async (
    request: Request,
  ): Promise<RestoreServerAccessTokenResult> => {
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
      | ServerApiProxyBackendSuccessResponse<SessionBackedAccessTokenPayload>
      | ServerApiProxyBackendErrorResponse
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
  };

  const proxySessionBackedBinaryResponse = async (
    request: Request,
    pathname: string,
  ): Promise<Response> => {
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
  };

  const proxySessionBackedStreamResponse = async (
    request: Request,
    pathname: string,
  ): Promise<Response> => {
    const incomingAuthorization = request.headers.get('authorization');
    let sessionResponse: Response | null = null;
    let upstreamHeaders: HeadersInit | undefined = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    };
    let response: Response;

    if (!incomingAuthorization) {
      const restoredSession = await restoreServerAccessToken(request).catch(() => null);
      if (!restoredSession) {
        return createRetryingSseResponse(createSseResponseHeaders());
      }
      if ('errorResponse' in restoredSession) {
        const responseHeaders = createSseResponseHeaders();
        appendSetCookieHeader(responseHeaders, restoredSession.errorResponse);
        return createRetryingSseResponse(responseHeaders);
      }

      sessionResponse = restoredSession.sessionResponse;
      upstreamHeaders = {
        ...upstreamHeaders,
        Authorization: `Bearer ${restoredSession.accessToken}`,
      };
    }

    try {
      response = await fetch(
        createServerApiUrl(pathname),
        createServerApiProxyInit(request, {
          headers: upstreamHeaders,
        }),
      );
    } catch {
      const responseHeaders = createSseResponseHeaders();
      if (sessionResponse) {
        appendSetCookieHeader(responseHeaders, sessionResponse);
      }

      return createRetryingSseResponse(responseHeaders);
    }

    const responseHeaders = createSseResponseHeaders(response);
    if (sessionResponse) {
      appendSetCookieHeader(responseHeaders, sessionResponse);
    }

    if (!response.ok || !response.body) {
      await response.body?.cancel().catch(() => undefined);
      return createRetryingSseResponse(responseHeaders);
    }

    return new Response(createGuardedSseStream(response.body), {
      status: 200,
      headers: responseHeaders,
    });
  };

  return {
    getServerApiBaseUrl,
    createServerApiUrl,
    buildServerApiProxyHeaders,
    createServerApiProxyInit,
    restoreServerAccessToken,
    proxySessionBackedBinaryResponse,
    proxySessionBackedStreamResponse,
  };
}
