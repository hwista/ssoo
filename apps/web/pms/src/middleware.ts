import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * PMS 미들웨어
 * - 존재하지 않는 경로 접근 시 not-found 페이지로 리다이렉트
 * - API, 정적 파일은 matcher에서 제외
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 허용된 경로 목록
  const allowedPaths = ['/', '/login'];

  // 허용된 경로면 통과
  if (allowedPaths.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  // 그 외 모든 경로는 차단 (404 페이지로 리다이렉트)
  return NextResponse.rewrite(new URL('/not-found', request.url));
}

export const config = {
  // 매칭할 경로 - 정적 파일과 API는 제외
  matcher: [
    /*
     * Match all paths except:
     * - api (API routes)
     * - _next (Next.js internals)
     * - static files (with extensions)
     * - favicon.ico
     */
    '/((?!api|_next|.*\\..*|favicon.ico).*)',
  ],
};
