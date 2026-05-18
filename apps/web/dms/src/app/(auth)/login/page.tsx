'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLoadingScreen, AuthStandardLoginCard } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores';
import { APP_HOME_PATH } from '@/lib/constants/routes';
import { resetDmsFileTreeSession } from '@/lib/file-tree-session';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace(APP_HOME_PATH);
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!hasHydrated || isAuthenticated) return;
    resetDmsFileTreeSession();
  }, [hasHydrated, isAuthenticated]);

  if (!hasHydrated) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <AuthStandardLoginCard
      isLoading={isLoading}
      onSubmit={async ({ loginId, password }) => {
        resetDmsFileTreeSession();
        await login(loginId, password);
        router.replace(APP_HOME_PATH);
      }}
    />
  );
}
