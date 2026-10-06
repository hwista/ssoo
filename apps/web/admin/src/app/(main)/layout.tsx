'use client';

import { SharedSessionRecovery } from '@ssoo/web-auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AuthLoadingScreen,
  getSsooUserSurfaceTabId,
  parseSsooUserSurfaceRouteEntry,
  useProtectedAppBootstrap,
} from '@ssoo/web-auth';
import {
  SsooErrorNotice,
  SsooMobileSidebarOverlay,
  SsooWorkbenchShell,
  useSsooMobileViewport,
} from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';
import { useTabStore } from '@/stores/tab.store';
import { AdminSidebar } from '@/components/layout/Sidebar';
import { AdminHeader } from '@/components/layout/Header';
import { AdminTabBar } from '@/components/layout/TabBar';
import { AdminContentArea } from '@/components/layout/ContentArea';
import { getAdminTabOptions } from '@/components/layout/navigation';
import { usePermissionCatalog } from '@/hooks/queries/useAccessOps';
import { ApiError } from '@/lib/api/client';
import { AccessRecovery } from '@/components/layout/AccessRecovery';

const LOGIN_PATH = '/login';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const sessionError = useAuthStore(state => state.sessionError);
  const accessToken = useAuthStore(state => state.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authIsLoading = useAuthStore((s) => s.isLoading);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTab = useTabStore((s) => s.openTab);
  const [tabsHydrated, setTabsHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobileViewport = useSsooMobileViewport();
  const toggleSidebar = () => setIsSidebarCollapsed((current) => !current);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen((current) => !current), []);
  const currentPath = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const unsubscribe = useTabStore.persist.onFinishHydration(() => setTabsHydrated(true));
    if (useTabStore.persist.hasHydrated()) setTabsHydrated(true);
    return unsubscribe;
  }, []);

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
    sessionError,
    accessHasLoaded: true,
    accessIsLoading: false,
    checkAuth,
    hydrateAccess: async () => {},
    resetAccess: () => {},
    onUnauthenticated: redirectToLogin,
  });
  const adminAccess = usePermissionCatalog(shouldRender);

  useEffect(() => {
    if (shouldRender && tabsHydrated) {
      const userSurfaceRoute = parseSsooUserSurfaceRouteEntry(currentPath);
      if (userSurfaceRoute) {
        openTab({
          id: getSsooUserSurfaceTabId(userSurfaceRoute.kind, userSurfaceRoute.userId),
          title: userSurfaceRoute.title,
          path: userSurfaceRoute.path,
          closable: true,
        });
        return;
      }

      openTab(getAdminTabOptions(currentPath));
    }
  }, [currentPath, openTab, shouldRender, tabsHydrated]);

  useEffect(() => {
    if (!isMobileViewport && isMobileMenuOpen) {
      closeMobileMenu();
    }
  }, [closeMobileMenu, isMobileMenuOpen, isMobileViewport]);

  void children;

  if (sessionError && !accessToken) return <SharedSessionRecovery authStore={useAuthStore} />;

  if (showLoading || (shouldRender && adminAccess.isLoading)) {
    return <AuthLoadingScreen />;
  }

  if (!shouldRender) {
    return null;
  }

  const accessDenied = adminAccess.error instanceof ApiError && adminAccess.error.status === 403;
  if (adminAccess.isError && (!adminAccess.data || accessDenied)) {
    return (
      <AccessRecovery
        accessDenied={accessDenied}
        isRetrying={adminAccess.isFetching}
        onRetry={() => { void adminAccess.refetch(); }}
      />
    );
  }

  return (
    <SharedSessionRecovery authStore={useAuthStore}>
    {adminAccess.isError ? <SsooErrorNotice message="최신 접근 권한을 확인하지 못했습니다. 이전에 확인한 화면을 유지하고 있습니다."
      actions={[{ label: '접근 권한 다시 확인', onClick: () => adminAccess.refetch(), disabled: adminAccess.isFetching }, { label: '다른 서비스·계정으로 이동', href: '/recovery' }]} /> : null}
    <SsooWorkbenchShell
      sidebarMode={isMobileViewport ? 'none' : 'collapsible'}
      sidebarExpanded={!isSidebarCollapsed}
      sidebarSlot={isMobileViewport ? (isMobileMenuOpen ? (
        <SsooMobileSidebarOverlay
          id="admin-mobile-sidebar"
          label="Admin 모바일 메뉴"
          onDismiss={closeMobileMenu}
        >
          <AdminSidebar
            isCollapsed={false}
            onToggleCollapse={closeMobileMenu}
            toggleLabel="모바일 메뉴 닫기"
          />
        </SsooMobileSidebarOverlay>
      ) : null) : (
        <AdminSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      )}
      headerSlot={isMobileViewport ? (
        <AdminHeader
          mobile
          mobileMenuOpen={isMobileMenuOpen}
          onMobileMenuClick={toggleMobileMenu}
        />
      ) : <AdminHeader />}
      tabBarSlot={<AdminTabBar />}
      contentSlot={<AdminContentArea />}
    />
    </SharedSessionRecovery>
  );
}
