import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * DMS 미들웨어
 * - 존재하지 않는 경로 접근 시 루트(/)로 리다이렉트
 * - API, 정적 파일은 통과
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 라우트는 제외
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 정적 파일은 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // 파일 확장자가 있는 경우
  ) {
    return NextResponse.next();
  }

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
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
