'use client';

import { Menu } from 'lucide-react';
import { SsooSidebarBrandHeader, SsooSidebarFooter, SsooSidebarShell } from '@ssoo/web-shell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAccessStore, useSidebarStore } from '@/stores';
import { LAYOUT_SIZES } from '@/types';

import { CollapsedSidebar } from './CollapsedSidebar';
import { ExpandedSidebar } from './ExpandedSidebar';

/**
 * 사이드바 컴포넌트
 * - 펼침: 검색 + 즐겨찾기 + 열린탭 + 메뉴트리 + 관리자
 * - 접힘: 아이콘만 + hover 시 플로트 패널
 */
export function Sidebar() {
  const {
    isCollapsed,
    expandedSections,
    toggleCollapse,
    toggleSection,
  } = useSidebarStore();

  const isAccessLoading = useAccessStore((state) => state.isLoading);
  const hydrateAccess = useAccessStore((state) => state.hydrate);

  const headerSlot = (
    <SsooSidebarBrandHeader
      title="SSOT"
      subtitle="PMS · 업무 허브"
      collapsed={isCollapsed}
      revealOnHover={isCollapsed}
      actionsSlot={
        <button
          type="button"
          onClick={toggleCollapse}
          className="rounded-lg p-2 transition-colors hover:bg-white/10"
          title={isCollapsed ? '펼치기' : '접기'}
        >
          <Menu className="h-5 w-5 text-white" />
        </button>
      }
    />
  );

  const railSlot = (
    <ScrollArea variant="sidebar" className="flex-1">
      <CollapsedSidebar onSelect={(section) => section !== 'search' && toggleSection(section)} />
    </ScrollArea>
  );

  const contentSlot = (
    <ExpandedSidebar
      expandedSections={expandedSections}
      onToggleSection={toggleSection}
      onRefresh={hydrateAccess}
      isRefreshing={isAccessLoading}
    />
  );

  const footerSlot = <SsooSidebarFooter collapsed={isCollapsed} revealOnHover={isCollapsed} />;

  return (
    <SsooSidebarShell
      mode="collapsible"
      expanded={!isCollapsed}
      width={LAYOUT_SIZES.sidebar.expandedWidth}
      collapsedWidth={LAYOUT_SIZES.sidebar.collapsedWidth}
      headerSlot={headerSlot}
      railSlot={railSlot}
      contentSlot={contentSlot}
      footerSlot={footerSlot}
      contentClassName="bg-ssoo-content-bg"
    />
  );
}
