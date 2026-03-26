'use client';

import type { SidebarSection as SidebarSectionType } from '@/types';
import { Star, Layers, FolderTree, RefreshCw, Shield } from 'lucide-react';
import { Search } from './Search';
import { Favorites } from './Favorites';
import { OpenTabs } from './OpenTabs';
import { MenuTree } from './MenuTree';
import { AdminMenu } from './AdminMenu';
import { Section } from './Section';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore, useMenuStore } from '@/stores';

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
  const { user } = useAuthStore();
  const { adminMenus } = useMenuStore();
  
  // 관리자 메뉴 표시 여부: isAdmin && 관리자 메뉴가 있는 경우
  const showAdminSection = user?.isAdmin && adminMenus.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* 검색 + 새로고침 (고정) */}
      <div className="p-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Search />
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-control-h w-control-h flex items-center justify-center hover:bg-ssoo-sitemap-bg rounded-lg transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw
              className={`w-4 h-4 text-ssoo-primary ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* 스크롤 영역 (검색란 아래) */}
      <ScrollArea variant="sidebar" className="flex-1">
        {/* 즐겨찾기 */}
        <Section
        title="즐겨찾기"
        icon={Star}
        isExpanded={expandedSections.includes('favorites')}
        onToggle={() => onToggleSection('favorites')}
      >
        <Favorites />
      </Section>

      {/* 현재 열린 페이지 */}
      <Section
        title="현재 열린 페이지"
        icon={Layers}
        isExpanded={expandedSections.includes('openTabs')}
        onToggle={() => onToggleSection('openTabs')}
      >
        <OpenTabs />
      </Section>

      {/* 전체 메뉴 */}
      <Section
        title="전체 메뉴"
        icon={FolderTree}
        isExpanded={expandedSections.includes('menuTree')}
        onToggle={() => onToggleSection('menuTree')}
      >
        <MenuTree />
      </Section>

        {/* 관리자 메뉴 (isAdmin 사용자만) */}
        {showAdminSection && (
          <Section
            title="관리자"
            icon={Shield}
            isExpanded={expandedSections.includes('admin')}
            onToggle={() => onToggleSection('admin')}
          >
            <AdminMenu />
          </Section>
        )}
      </ScrollArea>
    </div>
  );
}
