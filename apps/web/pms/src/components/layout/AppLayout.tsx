'use client';

import { SsooWorkbenchShell } from '@ssoo/web-shell';
import { useLayoutStore, useSidebarStore } from '@/stores';
import { LAYOUT_SIZES } from '@/types';
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

  // 모바일은 별도 UI (추후 개발)
  if (deviceType === 'mobile') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8">
          <h1 className="heading-1 mb-2">모바일 버전 준비 중</h1>
          <p className="text-gray-600">데스크톱에서 접속해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <SsooWorkbenchShell
      sidebarMode="collapsible"
      sidebarExpanded={!isCollapsed}
      sidebarWidth={LAYOUT_SIZES.sidebar.expandedWidth}
      collapsedSidebarWidth={LAYOUT_SIZES.sidebar.collapsedWidth}
      sidebarSlot={<Sidebar />}
      headerSlot={<Header />}
      tabBarSlot={<TabBar />}
      contentSlot={<ContentArea />}
    />
  );
}
