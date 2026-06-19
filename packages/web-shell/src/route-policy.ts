export type SsooRoutePolicyMode = 'redirect' | 'rewrite';

export interface SsooRoutePolicyOptions {
  allowedPaths?: readonly string[];
  allowedPrefixes?: readonly string[];
  fallbackPath: string;
  mode?: SsooRoutePolicyMode;
  sharedUserSurfaceRewritePath?: string;
}

export type SsooRoutePolicyDecision =
  | { action: 'next' }
  | { action: SsooRoutePolicyMode; path: string };

export const SSOO_ROUTE_POLICY_MATCHER = ['/((?!api|_next|.*\\..*|favicon.ico).*)'] as const;
export const SSOO_SHARED_USER_SURFACE_PATH_PREFIX = '/__user';

function matchesExactPath(pathname: string, allowedPaths: readonly string[]): boolean {
  return allowedPaths.some((path) => pathname === path);
}

function matchesPathPrefix(pathname: string, allowedPrefixes: readonly string[]): boolean {
  return allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isSsooRoutePolicyAllowed(pathname: string, options: SsooRoutePolicyOptions): boolean {
  return matchesExactPath(pathname, options.allowedPaths ?? [])
    || matchesPathPrefix(pathname, options.allowedPrefixes ?? []);
}

export function isSsooSharedUserSurfacePath(pathname: string): boolean {
  return pathname === SSOO_SHARED_USER_SURFACE_PATH_PREFIX
    || pathname.startsWith(`${SSOO_SHARED_USER_SURFACE_PATH_PREFIX}/`);
}

export function resolveSsooRoutePolicyDecision(
  pathname: string,
  options: SsooRoutePolicyOptions,
): SsooRoutePolicyDecision {
  if (options.sharedUserSurfaceRewritePath && isSsooSharedUserSurfacePath(pathname)) {
    return { action: 'rewrite', path: options.sharedUserSurfaceRewritePath };
  }

  if (isSsooRoutePolicyAllowed(pathname, options)) {
    return { action: 'next' };
  }

  return {
    action: options.mode ?? 'redirect',
    path: options.fallbackPath,
  };
}
