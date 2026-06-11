'use client';

import type { SidebarSection as SidebarSectionType } from '@/types';
import { ChevronDown, ChevronRight, Star, Layers, FolderTree, RefreshCw, Shield } from 'lucide-react';
import {
  SsooSidebarSection,
  SsooSidebarSectionChevron,
  SsooSidebarToolbar,
  SsooSidebarToolbarAction,
} from '@ssoo/web-shell';
import { Search } from './Search';
import { Favorites } from './Favorites';
import { OpenTabs } from './OpenTabs';
import { MenuTree } from './MenuTree';
import { AdminMenu } from './AdminMenu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMenuStore } from '@/stores';

interface ExpandedSidebarProps {
  expandedSections: SidebarSectionType[];
  onToggleSection: (section: SidebarSectionType) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/**
 * 펼친 사이드바 (전체 UI)
 */
export function ExpandedSidebar({
  expandedSections,
  onToggleSection,
  onRefresh,
  isRefreshing,
}: ExpandedSidebarProps) {
  const { adminMenus } = useMenuStore();

  const showAdminSection = adminMenus.length > 0;

  return (
    <div className="flex flex-col h-full">
      <SsooSidebarToolbar>
        <div className="flex items-center gap-1">
          <Search />
          <SsooSidebarToolbarAction
            label="새로고침"
            icon={RefreshCw}
            onClick={onRefresh}
            disabled={isRefreshing}
            loading={isRefreshing}
          />
        </div>
      </SsooSidebarToolbar>

      <ScrollArea variant="sidebar" className="flex-1">
        <SsooSidebarSection
          title="즐겨찾기"
          icon={Star}
          collapsible
          expanded={expandedSections.includes('favorites')}
          onToggle={() => onToggleSection('favorites')}
          actionSlot={<SsooSidebarSectionChevron expanded={expandedSections.includes('favorites')} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
        >
          <Favorites />
        </SsooSidebarSection>

        <SsooSidebarSection
          title="현재 열린 페이지"
          icon={Layers}
          collapsible
          expanded={expandedSections.includes('openTabs')}
          onToggle={() => onToggleSection('openTabs')}
          actionSlot={<SsooSidebarSectionChevron expanded={expandedSections.includes('openTabs')} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
        >
          <OpenTabs />
        </SsooSidebarSection>

        <SsooSidebarSection
          title="전체 메뉴"
          icon={FolderTree}
          collapsible
          expanded={expandedSections.includes('menuTree')}
          onToggle={() => onToggleSection('menuTree')}
          actionSlot={<SsooSidebarSectionChevron expanded={expandedSections.includes('menuTree')} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
        >
          <MenuTree />
        </SsooSidebarSection>

        {showAdminSection && (
          <SsooSidebarSection
            title="관리자"
            icon={Shield}
            collapsible
            expanded={expandedSections.includes('admin')}
            onToggle={() => onToggleSection('admin')}
            actionSlot={<SsooSidebarSectionChevron expanded={expandedSections.includes('admin')} expandedIcon={ChevronDown} collapsedIcon={ChevronRight} />}
          >
            <AdminMenu />
          </SsooSidebarSection>
        )}
      </ScrollArea>
    </div>
  );
}
