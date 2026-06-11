export const DEFAULT_SSOO_ACCOUNT_CENTER_PATH = '/settings';
export const DEFAULT_SSOO_ACCOUNT_CENTER_URL = 'http://localhost:3004';

export interface ResolveSsooAccountCenterHrefOptions {
  snsAppUrl?: string | null;
  path?: string | null;
  returnTo?: string | null;
}

export interface ResolveCurrentSsooAccountCenterHrefOptions
  extends Omit<ResolveSsooAccountCenterHrefOptions, 'returnTo'> {
  includeReturnTo?: boolean;
}

function normalizePath(path?: string | null): string {
  const trimmedPath = path?.trim();

  if (!trimmedPath) {
    return DEFAULT_SSOO_ACCOUNT_CENTER_PATH;
  }

  return trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
}

function normalizeBaseUrl(snsAppUrl?: string | null): string {
  const trimmedUrl = snsAppUrl?.trim();
  const baseUrl = trimmedUrl || DEFAULT_SSOO_ACCOUNT_CENTER_URL;

  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function resolveSsooAccountCenterHref({
  snsAppUrl,
  path,
  returnTo,
}: ResolveSsooAccountCenterHrefOptions = {}): string {
  const normalizedPath = normalizePath(path);

  try {
    const url = new URL(normalizedPath, normalizeBaseUrl(snsAppUrl));

    if (returnTo?.trim()) {
      url.searchParams.set('returnTo', returnTo.trim());
    }

    return url.toString();
  } catch {
    const fallbackUrl = new URL(normalizedPath, `${DEFAULT_SSOO_ACCOUNT_CENTER_URL}/`);

    if (returnTo?.trim()) {
      fallbackUrl.searchParams.set('returnTo', returnTo.trim());
    }

    return fallbackUrl.toString();
  }
}

export function resolveCurrentSsooAccountCenterHref({
  snsAppUrl,
  path,
  includeReturnTo = true,
}: ResolveCurrentSsooAccountCenterHrefOptions = {}): string {
  const returnTo = includeReturnTo && typeof window !== 'undefined'
    ? window.location.href
    : null;

  return resolveSsooAccountCenterHref({ snsAppUrl, path, returnTo });
}
