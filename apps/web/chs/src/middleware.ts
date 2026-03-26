import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedPathPrefixes = ['/', '/login', '/feed', '/board', '/profile', '/search', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (allowedPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL('/not-found', request.url));
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
