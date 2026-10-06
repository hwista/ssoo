import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  resolveSsooRoutePolicyDecision,
} from '@ssoo/web-shell/route-policy';
import { APP_HOME_PATH, ROOT_ENTRY_PATHS } from '@/lib/constants/routes';

/**
 * PMS 미들웨어
 * - 존재하지 않는 경로 접근 시 not-found 페이지로 리다이렉트
 * - API, 정적 파일은 matcher에서 제외
 */
export function middleware(request: NextRequest) {
  const decision = resolveSsooRoutePolicyDecision(request.nextUrl.pathname, {
    allowedPaths: ROOT_ENTRY_PATHS,
    fallbackPath: '/not-found',
    mode: 'rewrite',
    legacyPaths: ['/home', '/my-projects', '/action-required', '/closeout', '/operations', '/request', '/request/create', '/proposal', '/execution', '/transition', '/project/detail', '/admin/code', '/admin/role', '/admin/menu', '/admin/master', '/admin/templates'],
    legacyRedirectPath: APP_HOME_PATH,
    sharedUserSurfaceRewritePath: APP_HOME_PATH,
  });

  if (decision.action === 'next') {
    return NextResponse.next();
  }

  // 미등록 공개 주소는 공용 404로 안내한다.
  if (decision.action === 'rewrite') {
    return NextResponse.rewrite(new URL(decision.path, request.url));
  }

  return NextResponse.redirect(new URL(decision.path, request.url));
}

export const config = {
  // 매칭할 경로 - 정적 파일과 API는 제외
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
