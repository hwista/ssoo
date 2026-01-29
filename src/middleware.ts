import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * DMS 미들웨어
 * - 존재하지 않는 경로 접근 시 루트(/)로 리다이렉트
 * - API, 정적 파일은 통과
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 허용된 경로 목록 (오직 루트만 허용)
  const allowedPaths = ['/'];

  // 허용된 경로면 통과
  if (allowedPaths.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  // 그 외 모든 경로는 루트로 리다이렉트
  return NextResponse.redirect(new URL('/', request.url));
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
