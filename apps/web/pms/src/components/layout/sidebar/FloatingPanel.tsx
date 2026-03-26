'use client';

import type { SidebarSection as SidebarSectionType } from '@/types';
import { SIDEBAR_SECTION_LABELS } from '@/types';
import { Search } from './Search';
import { Favorites } from './Favorites';
import { OpenTabs } from './OpenTabs';
import { MenuTree } from './MenuTree';
import { AdminMenu } from './AdminMenu';
import { SECTION_ICONS } from './constants';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FloatingPanelProps {
  activeSection: SidebarSectionType;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * 플로팅 패널 컴포넌트
 * - 접힌 사이드바에서 hover 시 표시
 */
export function FloatingPanel({
  activeSection,
  onMouseEnter,
  onMouseLeave,
}: FloatingPanelProps) {
  const Icon = SECTION_ICONS[activeSection];

  return (
    <div
      className="fixed left-14 top-[60px] w-72 max-h-[calc(100vh-80px)] bg-white border border-ssoo-content-border rounded-lg shadow-lg overflow-hidden z-50"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3 h-control-h border-b border-ssoo-content-border bg-ssoo-content-bg">
        <Icon className="w-4 h-4 text-ssoo-primary" />
        <span className="text-sm font-medium text-ssoo-primary">
          {SIDEBAR_SECTION_LABELS[activeSection]}
        </span>
      </div>

      {/* 내용 */}
      <ScrollArea 
        variant="sidebar" 
        className="max-h-[calc(100vh-140px)] p-2"
      >
        {activeSection === 'search' && <Search />}
        {activeSection === 'favorites' && <Favorites />}
        {activeSection === 'openTabs' && <OpenTabs />}
        {activeSection === 'menuTree' && <MenuTree />}
        {activeSection === 'admin' && <AdminMenu />}
      </ScrollArea>
    </div>
  );
}
