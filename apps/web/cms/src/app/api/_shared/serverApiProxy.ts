const DEFAULT_SERVER_API_URL = 'http://localhost:4000/api';
const AUTH_FORWARD_HEADERS = ['authorization', 'cookie'] as const;

function hasHeader(headers: Headers, headerName: string): boolean {
  return Array.from(headers.keys()).some((key) => key.toLowerCase() === headerName.toLowerCase());
}

export function getServerApiBaseUrl(): string {
  return (
    process.env.CMS_SERVER_API_URL?.trim()
    || process.env.SERVER_API_URL?.trim()
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
