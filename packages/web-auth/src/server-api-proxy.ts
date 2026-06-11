const DEFAULT_AUTH_FORWARD_HEADERS = ['authorization', 'cookie'] as const;

export interface CreateServerApiProxyHelpersOptions {
  resolveServerApiBaseUrl: () => string;
  forwardHeaders?: readonly string[];
  defaultHeaders?: HeadersInit;
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

  return {
    getServerApiBaseUrl,
    createServerApiUrl,
    buildServerApiProxyHeaders,
    createServerApiProxyInit,
  };
}
