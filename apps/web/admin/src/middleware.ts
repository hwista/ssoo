import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_PATHS = ['/login', '/', '/users', '/organizations', '/roles'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ALLOWED_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // Unknown routes redirect to dashboard
  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
