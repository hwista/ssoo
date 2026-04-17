'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLoadingScreen, useProtectedAppBootstrap } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';
import { useAccessStore } from '@/stores/access.store';
import { LOGIN_PATH } from '@/lib/constants/routes';

/**
 * 메인 레이아웃 (낙관적 인증)
 *
 * - localStorage에 인증 정보가 있으면 API 응답 없이 즉시 렌더링
 * - 백그라운드에서 토큰 유효성 검증 → 확정 실패(401) 시만 리다이렉트
 * - 네트워크 에러/서버 다운 시 기존 인증 유지 (끊김 없는 UX)
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const accessHasLoaded = useAccessStore((state) => state.hasLoaded);
  const accessIsLoading = useAccessStore((state) => state.isLoading);
  const hydrateAccess = useAccessStore((state) => state.hydrate);
  const resetAccess = useAccessStore((state) => state.reset);
  const router = useRouter();
  const redirectToLogin = useCallback(() => {
    router.replace(LOGIN_PATH);
  }, [router]);

  const { showLoading, shouldRender } = useProtectedAppBootstrap({
    hasHydrated,
    isAuthenticated,
    authIsLoading,
    accessHasLoaded,
    accessIsLoading,
    checkAuth,
    hydrateAccess,
    resetAccess,
    onUnauthenticated: redirectToLogin,
  });

  // Hydration + access bootstrap 대기
  if (showLoading) {
    return <AuthLoadingScreen />;
  }

  // 미인증 상태 → /login 리다이렉트 대기
  if (!shouldRender) {
    return null;
  }

  return children;
}
