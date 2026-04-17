import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { APP_HOME_PATH, ROOT_ENTRY_PATHS } from '@/lib/constants/routes';

/**
 * PMS 미들웨어
 * - 존재하지 않는 경로 접근 시 not-found 페이지로 리다이렉트
 * - API, 정적 파일은 matcher에서 제외
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 허용된 경로면 통과
  if (ROOT_ENTRY_PATHS.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  // shell-app은 잘못된 경로를 기본 루트 셸로 복구한다.
  return NextResponse.redirect(new URL(APP_HOME_PATH, request.url));
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
