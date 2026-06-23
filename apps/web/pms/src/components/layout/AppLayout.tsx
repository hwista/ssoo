'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  getSsooUserSurfaceTabId,
  parseSsooUserSurfaceRouteEntry,
} from '@ssoo/web-auth';
import {
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SsooAppFrame,
  SsooContentAreaState,
  SsooWorkbenchShell,
  getSsooGlobalSearchQueryFromPath,
  getSsooGlobalSearchTitle,
} from '@ssoo/web-shell';
import { useLayoutStore, useSidebarStore, useTabStore } from '@/stores';
import { Sidebar } from './sidebar';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';

/**
 * 메인 앱 레이아웃
 * - Desktop: Sidebar + Header + TabBar + Content
 * - Mobile: 별도 UI (추후 개발)
 * - 탭 시스템 전용: URL 직접 접근 미지원
 */
export function AppLayout() {
  const { deviceType } = useLayoutStore();
  const { isCollapsed } = useSidebarStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTab = useTabStore((state) => state.openTab);
  const currentPath = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
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
      return;
    }

    const query = getSsooGlobalSearchQueryFromPath(currentPath);
    openTab({
      menuCode: 'PMS-GLOBAL-SEARCH',
      menuId: 'pms-global-search',
      title: getSsooGlobalSearchTitle(query),
      path: currentPath,
      icon: 'Search',
      params: query ? { q: query } : undefined,
      closable: true,
      activate: true,
    });
  }, [currentPath, openTab]);

  // 모바일은 별도 UI (추후 개발)
  if (deviceType === 'mobile') {
    return (
      <SsooAppFrame
        mode="content-only"
        contentSlot={(
          <SsooContentAreaState
            title="모바일 버전 준비 중"
            description="데스크톱에서 접속해주세요."
          />
        )}
      />
    );
  }

  return (
    <SsooWorkbenchShell
      sidebarMode="collapsible"
      sidebarExpanded={!isCollapsed}
      sidebarSlot={<Sidebar />}
      headerSlot={<Header />}
      tabBarSlot={<TabBar />}
      contentSlot={<ContentArea />}
    />
  );
}
