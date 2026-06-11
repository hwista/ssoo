'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLoadingScreen, useProtectedAppBootstrap } from '@ssoo/web-auth';
import { SsooWorkbenchShell } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';
import { AdminSidebar } from '@/components/layout/Sidebar';
import { AdminHeader } from '@/components/layout/Header';
import { usePermissionCatalog } from '@/hooks/queries/useAccessOps';

const ADMIN_SIDEBAR_WIDTH = 340;
const ADMIN_COLLAPSED_SIDEBAR_WIDTH = 56;
const LOGIN_PATH = '/login';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authIsLoading = useAuthStore((s) => s.isLoading);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed((current) => !current);

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
  const adminAccess = usePermissionCatalog(shouldRender);

  if (showLoading || (shouldRender && adminAccess.isLoading)) {
    return <AuthLoadingScreen />;
  }

  if (!shouldRender) {
    return null;
  }

  if (adminAccess.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <section className="max-w-md rounded-lg border bg-background p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Admin 접근 권한이 없습니다</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            SSOO Admin 앱은 system.override 권한이 있는 운영자만 사용할 수 있습니다. DMS/PMS/SNS 사용자는 각 도메인 앱을 이용하세요.
          </p>
        </section>
      </main>
    );
  }

  return (
    <SsooWorkbenchShell
      sidebarMode="collapsible"
      sidebarExpanded={!isSidebarCollapsed}
      sidebarWidth={ADMIN_SIDEBAR_WIDTH}
      collapsedSidebarWidth={ADMIN_COLLAPSED_SIDEBAR_WIDTH}
      sidebarSlot={
        <AdminSidebar
          width={ADMIN_SIDEBAR_WIDTH}
          collapsedWidth={ADMIN_COLLAPSED_SIDEBAR_WIDTH}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      }
      headerSlot={<AdminHeader />}
      contentSlot={<main className="h-full overflow-auto bg-muted/30 p-6">{children}</main>}
    />
  );
}
