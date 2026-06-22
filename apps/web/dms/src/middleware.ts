import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  resolveSsooRoutePolicyDecision,
} from '@ssoo/web-shell/route-policy';
import { APP_HOME_PATH, ROOT_ENTRY_PATHS } from '@/lib/constants/routes';

/**
 * DMS 루트 고정 라우팅 정책
 *
 * DMS는 브라우저 주소창에 내부 화면 경로를 노출하지 않고,
 * 공개 진입점을 `/` 셸과 `/login` 으로 제한한다.
 *
 * `/doc/...`, `/ssoo/search`, `/settings` 같은 값은 실제 공개 라우트가 아니라
 * 탭 상태에서만 사용하는 내부 virtual path 이므로, 직접 접근은 모두 `/`로 복구한다.
 */
export function middleware(request: NextRequest) {
  const decision = resolveSsooRoutePolicyDecision(request.nextUrl.pathname, {
    allowedPaths: ROOT_ENTRY_PATHS,
    fallbackPath: APP_HOME_PATH,
    sharedUserSurfaceRewritePath: APP_HOME_PATH,
  });

  if (decision.action === 'next') {
    return NextResponse.next();
  }

  // 그 외 페이지 경로는 내부 화면 경로로 간주하고 루트 셸로 되돌린다.
  if (decision.action === 'rewrite') {
    return NextResponse.rewrite(new URL(decision.path, request.url));
  }

  return NextResponse.redirect(new URL(decision.path, request.url));
}

export const config = {
  // API, Next 내부 경로, 정적 파일은 주소 고정 정책 대상에서 제외한다.
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
