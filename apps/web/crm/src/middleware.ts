import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  resolveSsooRoutePolicyDecision,
} from '@ssoo/web-shell/route-policy';
import { APP_HOME_PATH, ROOT_ENTRY_PATHS } from '@/lib/constants/routes';

export function middleware(request: NextRequest) {
  const decision = resolveSsooRoutePolicyDecision(request.nextUrl.pathname, {
    allowedPaths: ROOT_ENTRY_PATHS,
    fallbackPath: APP_HOME_PATH,
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
