'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLoadingScreen, AuthStandardLoginCard } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';
import { APP_HOME_PATH } from '@/lib/constants/routes';

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
        await login(loginId, password);
        router.replace(APP_HOME_PATH);
      }}
    />
  );
}
