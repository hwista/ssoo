'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLoadingScreen, useProtectedAppBootstrap } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores/auth.store';
import { AdminSidebar } from '@/components/layout/Sidebar';
import { AdminHeader } from '@/components/layout/Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authIsLoading = useAuthStore((s) => s.isLoading);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const router = useRouter();

  const redirectToLogin = useCallback(() => {
    router.replace('/login');
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

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
