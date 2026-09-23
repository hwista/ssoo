import type { AuthAnonymousSession } from '@ssoo/types/common';
import { createSessionCookieRetryResponse } from './session-cookie-retry';

const DEFAULT_AUTH_FORWARD_HEADERS = ['authorization', 'cookie', 'origin', 'referer'] as const;
const BINARY_PROXY_RESPONSE_HEADERS = ['cache-control', 'content-disposition', 'content-length', 'content-type', 'x-content-type-options'] as const;
const REDIRECT_PROXY_RESPONSE_HEADERS = ['cache-control'] as const;
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
    code?: string;
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

function appendAllowedResponseHeaders(
  targetHeaders: Headers,
  response: Response,
  allowedHeaders: readonly string[],
): void {
  for (const headerName of allowedHeaders) {
    const value = response.headers.get(headerName);
    if (value) {
      targetHeaders.set(headerName, value);
    }
  }
}

function isRedirectResponse(response: Response): boolean {
  return response.status >= 300 && response.status < 400;
}

function resolveSafeRedirectLocation(location: string | null): string | null {
  const trimmed = location?.trim();
  if (!trimmed || trimmed.startsWith('//')) {
    return null;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
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
  // Fetch decodes the upstream body, and this proxy can replace or append frames.
  // Let the downstream server frame that body instead of reusing upstream metadata.
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');
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
    forwardedHeaders: readonly string[] = forwardHeaders,
  ): Headers => {
    const headers = new Headers(defaultHeaders);
    const initialHeaderBag = new Headers(initialHeaders);
    initialHeaderBag.forEach((value, key) => {
      headers.set(key, value);
    });

    for (const headerName of forwardedHeaders) {
      const headerValue = requestHeaders.get(headerName);
      if (headerValue && !headers.has(headerName)) {
        headers.set(headerName, headerValue);
      }
    }

    return headers;
  };

  const createServerApiProxyInit = (
    request: Request,
    init: RequestInit = {},
    forwardedHeaders: readonly string[] = forwardHeaders,
  ): RequestInit => ({
    ...init,
    cache: init.cache ?? 'no-store',
    headers: buildServerApiProxyHeaders(request.headers, init.headers, forwardedHeaders),
    signal: init.signal ?? request.signal,
  });

  const restoreServerAccessToken = async (
    request: Request,
  ): Promise<RestoreServerAccessTokenResult> => {
    const sessionResponse = await fetch(
      createServerApiUrl('/auth/session/access'),
      createServerApiProxyInit(request, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    const sessionBody = await sessionResponse.json().catch(() => null) as
      | ServerApiProxyBackendSuccessResponse<SessionBackedAccessTokenPayload | AuthAnonymousSession>
      | ServerApiProxyBackendErrorResponse
      | null;

    if (
      !sessionResponse.ok
      || !sessionBody
      || sessionBody.success !== true
      || typeof sessionBody.data?.accessToken !== 'string'
    ) {
      if (sessionBody?.success !== true) {
        const retry = await createSessionCookieRetryResponse(request, sessionResponse.status, sessionBody?.error?.code);
        if (retry) return { errorResponse: retry };
      }
      const errorHeaders = new Headers();
      appendSetCookieHeader(errorHeaders, sessionResponse);

      return {
        errorResponse: Response.json(
          {
            error: getBackendErrorMessage(sessionBody, '인증 세션을 복원하지 못했습니다. 다시 로그인하세요.'),
          },
          {
            status: sessionResponse.ok ? 401 : sessionResponse.status || 401,
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
        redirect: 'manual',
      }, incomingAuthorization ? forwardHeaders : []),
    );

    if (isRedirectResponse(response)) {
      const location = resolveSafeRedirectLocation(response.headers.get('location'));
      const responseHeaders = new Headers();
      appendAllowedResponseHeaders(responseHeaders, response, REDIRECT_PROXY_RESPONSE_HEADERS);
      responseHeaders.set('Cache-Control', responseHeaders.get('cache-control') ?? 'private, no-store');
      if (sessionResponse) {
        appendSetCookieHeader(responseHeaders, sessionResponse);
      }

      if (!location) {
        return Response.json(
          { error: '허용되지 않은 저장소 리디렉션입니다.' },
          {
            status: 502,
            headers: responseHeaders,
          },
        );
      }

      responseHeaders.set('Location', location);
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    const responseHeaders = new Headers();
    appendAllowedResponseHeaders(responseHeaders, response, BINARY_PROXY_RESPONSE_HEADERS);
    responseHeaders.set('Cache-Control', responseHeaders.get('cache-control') ?? 'private, no-store');
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
        if (restoredSession.errorResponse.status === 307) return restoredSession.errorResponse;
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
