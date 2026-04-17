'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLoadingScreen, useProtectedAppBootstrap } from '@ssoo/web-auth';
import { useLayoutViewportSync } from '@/hooks';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAccessStore, useAuthStore, useFileStore } from '@/stores';

/**
 * (main) 그룹 레이아웃
 * - 루트 셸 초기화
 * - 파일 트리 초기화
 *
 * Note: deviceType 자동 리사이즈는 layout.store.ts에서 처리 (PMS 패턴)
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const accessHasLoaded = useAccessStore((state) => state.hasLoaded);
  const accessIsLoading = useAccessStore((state) => state.isLoading);
  const hydrateAccess = useAccessStore((state) => state.hydrate);
  const resetAccess = useAccessStore((state) => state.reset);
  const { refreshFileTree } = useFileStore();
  const redirectToLogin = useCallback(() => {
    router.replace(LOGIN_PATH);
  }, [router]);

  useLayoutViewportSync();

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

  useEffect(() => {
    if (!isAuthenticated || !accessSnapshot?.features.canReadDocuments) {
      return;
    }

    void refreshFileTree();
  }, [accessSnapshot?.features.canReadDocuments, isAuthenticated, refreshFileTree]);

  if (showLoading) {
    return <AuthLoadingScreen />;
  }

  if (!shouldRender) {
    return null;
  }

  return children;
}
