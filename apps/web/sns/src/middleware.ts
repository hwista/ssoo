import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  resolveSsooRoutePolicyDecision,
} from '@ssoo/web-shell/route-policy';
import {
  normalizeSsooUserSurfaceRouteEntryPath,
} from '@ssoo/web-auth/user-surface-routing';
import { ALLOWED_PATH_PREFIXES, APP_HOME_PATH } from '@/lib/constants/routes';

export function middleware(request: NextRequest) {
  const routeEntryPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const normalizedUserSurfaceEntryPath = normalizeSsooUserSurfaceRouteEntryPath(routeEntryPath);
  if (normalizedUserSurfaceEntryPath && normalizedUserSurfaceEntryPath !== routeEntryPath) {
    return NextResponse.redirect(new URL(normalizedUserSurfaceEntryPath, request.url));
  }

  const decision = resolveSsooRoutePolicyDecision(request.nextUrl.pathname, {
    allowedPrefixes: ALLOWED_PATH_PREFIXES,
    fallbackPath: '/not-found',
    mode: 'rewrite',
    sharedUserSurfaceRewritePath: APP_HOME_PATH,
  });

  if (decision.action === 'next') {
    return NextResponse.next();
  }

  if (decision.action === 'rewrite') {
    return NextResponse.rewrite(new URL(decision.path, request.url));
  }

  return NextResponse.redirect(new URL(decision.path, request.url));
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
