'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  getSsooUserSurfaceTabId,
  parseSsooUserSurfaceRouteEntry,
} from '@ssoo/web-auth';
import {
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SSOO_SHELL_METRICS,
  SsooMobileSidebarOverlay,
  SsooWorkbenchShell,
  getSsooGlobalSearchQueryFromPath,
  getSsooGlobalSearchTitle,
} from '@ssoo/web-shell';
import { PROJECT_SETTINGS_PATH } from '@/lib/constants/routes';
import { useLayoutStore, useSidebarStore, useTabStore } from '@/stores';
import { Sidebar } from './sidebar';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';

/**
 * 메인 앱 레이아웃
 * - Desktop: Sidebar + Header + TabBar + Content
 * - Mobile: Header + TabBar + Content + overlay sidebar
 * - 내부 업무는 탭으로 전환하고 공식 검색·사용자 주소는 기존 탭으로 연결
 */
export function AppLayout() {
  const {
    deviceType,
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
  } = useLayoutStore();
  const { isCollapsed } = useSidebarStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTab = useTabStore((state) => state.openTab);
  const updateTabPath = useTabStore((state) => state.updateTabPath);
  const currentPath = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const workParams = new URLSearchParams(currentPath.split('?')[1] ?? '');
    const workProjectId = workParams.get('projectId');
    const workTab = workParams.get('tab');
    if (workParams.get('workNotification') === 'true' && workProjectId && /^\d+$/.test(workProjectId) && (workTab === 'tasks' || workTab === 'controls')) {
      openTab({ menuCode: 'project.detail', menuId: `project.detail.${workProjectId}`, title: '프로젝트 업무 알림',
        path: '/project/detail', params: { id: workProjectId, managementTab: workTab }, closable: true, activate: true });
      return;
    }
    const userSurfaceRoute = parseSsooUserSurfaceRouteEntry(currentPath);
    if (userSurfaceRoute) {
      const tabId = getSsooUserSurfaceTabId(userSurfaceRoute.kind, userSurfaceRoute.userId);
      openTab({
        menuCode: tabId,
        menuId: tabId,
        title: userSurfaceRoute.title,
        path: userSurfaceRoute.path,
        icon: userSurfaceRoute.kind === 'personal-settings' ? 'Settings' : 'User',
        closable: true,
        activate: true,
      });
      return;
    }

    if (!currentPath.startsWith(SSOO_GLOBAL_SEARCH_APP_PATH)) {
      if (currentPath === PROJECT_SETTINGS_PATH) {
        openTab({
          menuCode: 'PMS-SETTINGS',
          menuId: 'pms-settings',
          title: '프로젝트 사용 설정',
          path: PROJECT_SETTINGS_PATH,
          icon: 'Settings',
          closable: true,
          activate: true,
        });
      }
      return;
    }

    const query = getSsooGlobalSearchQueryFromPath(currentPath);
    const tabId = openTab({
      menuCode: 'PMS-GLOBAL-SEARCH',
      menuId: 'pms-global-search',
      title: getSsooGlobalSearchTitle(query),
      path: currentPath,
      icon: 'Search',
      params: query ? { q: query } : undefined,
      closable: true,
      activate: true,
    });
    if (tabId) updateTabPath(tabId, currentPath);
  }, [currentPath, openTab, updateTabPath]);

  useEffect(() => {
    if (deviceType === 'desktop' && isMobileMenuOpen) {
      closeMobileMenu();
    }
  }, [closeMobileMenu, deviceType, isMobileMenuOpen]);

  const isMobileViewport = deviceType === 'mobile';
  const mobileSidebarWidth = `min(${SSOO_SHELL_METRICS.sidebar.expandedWidth}px, calc(100vw - 32px))`;

  return (
    <SsooWorkbenchShell
      sidebarMode={isMobileViewport ? 'none' : 'collapsible'}
      sidebarExpanded={!isCollapsed}
      sidebarSlot={isMobileViewport ? (isMobileMenuOpen ? (
        <SsooMobileSidebarOverlay
          id="pms-mobile-sidebar"
          onDismiss={closeMobileMenu}
          label="PMS 모바일 메뉴"
        >
          <Sidebar
            expanded
            width={mobileSidebarWidth}
            onToggleCollapse={closeMobileMenu}
            toggleLabel="모바일 메뉴 닫기"
            variant="mobile"
          />
        </SsooMobileSidebarOverlay>
      ) : null) : (
        <Sidebar />
      )}
      headerSlot={isMobileViewport ? (
        <Header
          mobile
          mobileMenuOpen={isMobileMenuOpen}
          onMobileMenuClick={toggleMobileMenu}
        />
      ) : <Header />}
      tabBarSlot={<TabBar />}
      contentSlot={<ContentArea />}
    />
  );
}
