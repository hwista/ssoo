export const DEFAULT_SSOO_ACCOUNT_CENTER_PATH = '/settings';
export const DEFAULT_SSOO_ACCOUNT_CENTER_URL = 'http://localhost:3004';
export const DEFAULT_SSOO_MY_PROFILE_PATH = '/profile/me';

export type SsooUserSurfaceKey = 'my-profile' | 'user-profile' | 'personal-settings';

export interface ResolveSsooAccountCenterHrefOptions {
  snsAppUrl?: string | null;
  path?: string | null;
  returnTo?: string | null;
}

export interface ResolveCurrentSsooAccountCenterHrefOptions
  extends Omit<ResolveSsooAccountCenterHrefOptions, 'returnTo'> {
  includeReturnTo?: boolean;
}

export interface ResolveSsooUserSurfaceHrefOptions {
  surface?: SsooUserSurfaceKey;
  userId?: string | null;
  appUrl?: string | null;
  snsAppUrl?: string | null;
  path?: string | null;
  returnTo?: string | null;
}

export interface ResolveCurrentSsooUserSurfaceHrefOptions
  extends Omit<ResolveSsooUserSurfaceHrefOptions, 'returnTo'> {
  includeReturnTo?: boolean;
}

function normalizePath(path?: string | null): string {
  const trimmedPath = path?.trim();

  if (!trimmedPath) {
    return DEFAULT_SSOO_ACCOUNT_CENTER_PATH;
  }

  return trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
}

function normalizeBaseUrl(appUrl?: string | null, snsAppUrl?: string | null): string {
  const trimmedUrl = appUrl?.trim() || snsAppUrl?.trim();
  const baseUrl = trimmedUrl || DEFAULT_SSOO_ACCOUNT_CENTER_URL;

  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function getUserSurfacePath(
  surface?: SsooUserSurfaceKey,
  userId?: string | null,
  path?: string | null,
): string {
  if (path?.trim()) {
    return normalizePath(path);
  }

  if (surface === 'my-profile') {
    return DEFAULT_SSOO_MY_PROFILE_PATH;
  }

  if (surface === 'user-profile') {
    const normalizedUserId = userId?.trim() || 'me';
    return `/profile/${encodeURIComponent(normalizedUserId)}`;
  }

  return DEFAULT_SSOO_ACCOUNT_CENTER_PATH;
}

export function resolveSsooAccountCenterHref({
  snsAppUrl,
  path,
  returnTo,
}: ResolveSsooAccountCenterHrefOptions = {}): string {
  return resolveSsooUserSurfaceHref({
    snsAppUrl,
    path,
    returnTo,
    surface: 'personal-settings',
  });
}

export function resolveSsooUserSurfaceHref({
  appUrl,
  snsAppUrl,
  surface = 'personal-settings',
  userId,
  path,
  returnTo,
}: ResolveSsooUserSurfaceHrefOptions = {}): string {
  const surfacePath = getUserSurfacePath(surface, userId, path);

  try {
    const url = new URL(surfacePath, normalizeBaseUrl(appUrl, snsAppUrl));

    if (returnTo?.trim()) {
      url.searchParams.set('returnTo', returnTo.trim());
    }

    return url.toString();
  } catch {
    const fallbackUrl = new URL(surfacePath, `${DEFAULT_SSOO_ACCOUNT_CENTER_URL}/`);

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

export function resolveCurrentSsooUserSurfaceHref({
  appUrl,
  snsAppUrl,
  surface,
  userId,
  path,
  includeReturnTo = true,
}: ResolveCurrentSsooUserSurfaceHrefOptions = {}): string {
  const returnTo = includeReturnTo && typeof window !== 'undefined'
    ? window.location.href
    : null;

  return resolveSsooUserSurfaceHref({
    appUrl,
    snsAppUrl,
    surface,
    userId,
    path,
    returnTo,
  });
}
