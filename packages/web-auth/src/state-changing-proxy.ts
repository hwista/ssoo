export const SSOO_STATE_CHANGE_CSRF_HEADER_NAME = 'X-SSOO-CSRF';
export const SSOO_STATE_CHANGE_CSRF_HEADER_VALUE = '1';

export interface StateChangingProxyRequestValidationOptions {
  trustedOrigins?: readonly string[] | (() => readonly string[]);
}

export function createForbiddenStateChangingProxyRequestResponse(): Response {
  return Response.json({ error: '허용되지 않은 요청입니다.' }, { status: 403 });
}

function normalizeOrigin(value: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function resolveRequestOrigin(request: Request): string | null {
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

function getFirstForwardedHeaderValue(value: string | null): string | null {
  const firstValue = value?.split(',')[0]?.trim();
  return firstValue || null;
}

function addHeaderHostOrigin(origins: Set<string>, protocol: string | null, host: string | null): void {
  if (!protocol || !host) {
    return;
  }

  const normalizedOrigin = normalizeOrigin(`${protocol.replace(/:$/, '')}://${host}`);
  if (normalizedOrigin) {
    origins.add(normalizedOrigin);
  }
}

function resolveTrustedOrigins(
  request: Request,
  trustedOrigins: StateChangingProxyRequestValidationOptions['trustedOrigins'],
): Set<string> {
  const origins = new Set<string>();
  const requestOrigin = resolveRequestOrigin(request);
  const requestProtocol = requestOrigin ? new URL(requestOrigin).protocol : null;
  const forwardedProtocol = getFirstForwardedHeaderValue(request.headers.get('x-forwarded-proto'));
  const requestHost = getFirstForwardedHeaderValue(request.headers.get('host'));
  const forwardedHost = getFirstForwardedHeaderValue(request.headers.get('x-forwarded-host'));

  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  addHeaderHostOrigin(origins, forwardedProtocol ?? requestProtocol, requestHost);
  addHeaderHostOrigin(origins, forwardedProtocol ?? requestProtocol, forwardedHost);

  const configuredOrigins = typeof trustedOrigins === 'function' ? trustedOrigins() : trustedOrigins;
  for (const origin of configuredOrigins ?? []) {
    const normalizedOrigin = normalizeOrigin(origin);
    if (normalizedOrigin) {
      origins.add(normalizedOrigin);
    }
  }

  return origins;
}

function isTrustedOriginHeader(headerValue: string | null, trustedOrigins: Set<string>): boolean {
  const origin = normalizeOrigin(headerValue);
  return Boolean(origin && trustedOrigins.has(origin));
}

export function isValidStateChangingProxyRequest(
  request: Request,
  trustedOrigins?: StateChangingProxyRequestValidationOptions['trustedOrigins'],
): boolean {
  const csrfHeader = request.headers.get(SSOO_STATE_CHANGE_CSRF_HEADER_NAME);
  if (csrfHeader?.trim() !== SSOO_STATE_CHANGE_CSRF_HEADER_VALUE) {
    return false;
  }

  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (fetchSite === 'cross-site') {
    return false;
  }

  const resolvedTrustedOrigins = resolveTrustedOrigins(request, trustedOrigins);
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    return isTrustedOriginHeader(originHeader, resolvedTrustedOrigins);
  }

  const refererHeader = request.headers.get('referer');
  if (refererHeader) {
    return isTrustedOriginHeader(refererHeader, resolvedTrustedOrigins);
  }

  return true;
}
