import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ALLOWED_PATH_PREFIXES } from '@/lib/constants/routes';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ALLOWED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL('/not-found', request.url));
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
