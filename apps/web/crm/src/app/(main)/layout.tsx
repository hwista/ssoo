'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLoadingScreen, useProtectedAppBootstrap } from '@ssoo/web-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { useAuthStore } from '@/stores/auth.store';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const router = useRouter();
  const redirectToLogin = useCallback((currentPath: string) => {
    const returnTo = currentPath && currentPath !== LOGIN_PATH
      ? `?returnTo=${encodeURIComponent(currentPath)}`
      : '';
    router.replace(`${LOGIN_PATH}${returnTo}`);
  }, [router]);

  const { showLoading, shouldRender } = useProtectedAppBootstrap({
    hasHydrated,
    isAuthenticated,
    authIsLoading,
    accessHasLoaded: true,
    accessIsLoading: false,
    checkAuth,
    hydrateAccess: async () => {},
    resetAccess: () => {},
    onUnauthenticated: redirectToLogin,
  });

  if (showLoading) {
    return <AuthLoadingScreen />;
  }

  if (!shouldRender) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}
