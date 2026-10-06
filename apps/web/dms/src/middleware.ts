import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  resolveSsooRoutePolicyDecision,
} from '@ssoo/web-shell/route-policy';
import { ALLOWED_PATH_PREFIXES, APP_HOME_PATH, ROOT_ENTRY_PATHS } from '@/lib/constants/routes';

/**
 * DMS 루트 고정 라우팅 정책
 *
 * DMS는 브라우저 주소창에 내부 화면 경로를 노출하지 않고,
 * 공개 진입점을 `/` 셸과 인증/검색, 인증된 settings deep link로 제한한다.
 *
 * `/doc/...` 같은 값은 탭 상태에서만 사용하는 내부 virtual path 이므로 `/`로 복구한다.
 * `/settings/{surface}/{sectionId}`는 운영자가 새로고침·북마크·Admin 연결을 사용할 수
 * 있도록 기존 AppLayout/settings 권한 계약으로 handoff하는 공식 deep link다.
 */
export function middleware(request: NextRequest) {
  const decision = resolveSsooRoutePolicyDecision(request.nextUrl.pathname, {
    allowedPaths: ROOT_ENTRY_PATHS,
    allowedPrefixes: ALLOWED_PATH_PREFIXES,
    fallbackPath: '/not-found',
    mode: 'rewrite',
    legacyPaths: ['/home', '/access-requests', '/my-access-requests'],
    legacyPrefixes: ['/doc', '/ai'],
    legacyRedirectPath: APP_HOME_PATH,
    sharedUserSurfaceRewritePath: APP_HOME_PATH,
  });

  if (decision.action === 'next') {
    return NextResponse.next();
  }

  // 알려진 virtual path만 기존 루트 복귀를 유지하고, 미등록 주소는 404로 안내한다.
  if (decision.action === 'rewrite') {
    return NextResponse.rewrite(new URL(decision.path, request.url));
  }

  return NextResponse.redirect(new URL(decision.path, request.url));
}

export const config = {
  // API, Next 내부 경로, 정적 파일은 주소 고정 정책 대상에서 제외한다.
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
