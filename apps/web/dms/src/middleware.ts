import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { APP_HOME_PATH, ROOT_ENTRY_PATHS } from '@/lib/constants/routes';

/**
 * DMS 루트 고정 라우팅 정책
 *
 * DMS는 브라우저 주소창에 내부 화면 경로를 노출하지 않고,
 * 공개 진입점을 `/` 셸과 `/login` 으로 제한한다.
 *
 * `/doc/...`, `/ai/search`, `/settings` 같은 값은 실제 공개 라우트가 아니라
 * 탭 상태에서만 사용하는 내부 virtual path 이므로, 직접 접근은 모두 `/`로 복구한다.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 진입점만 허용한다.
  if (ROOT_ENTRY_PATHS.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  // 그 외 페이지 경로는 내부 화면 경로로 간주하고 루트 셸로 되돌린다.
  return NextResponse.redirect(new URL(APP_HOME_PATH, request.url));
}

export const config = {
  // API, Next 내부 경로, 정적 파일은 주소 고정 정책 대상에서 제외한다.
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
