'use client';

import type { SidebarSection } from '@/types';
import { SIDEBAR_SECTION_LABELS } from '@/types';
import { SECTION_ICONS } from './constants';
import { useAuthStore, useMenuStore } from '@/stores';

interface CollapsedSidebarProps {
  onMouseEnter: (section: SidebarSection) => void;
  onMouseLeave: () => void;
}

/**
 * 접힌 사이드바 (아이콘만)
 */
export function CollapsedSidebar({
  onMouseEnter,
  onMouseLeave,
}: CollapsedSidebarProps) {
  const { user } = useAuthStore();
  const { adminMenus } = useMenuStore();
  
  // 관리자 메뉴 표시 여부
  const showAdminSection = user?.isAdmin && adminMenus.length > 0;
  
  // 기본 섹션 + 조건부 관리자 섹션
  const sections: SidebarSection[] = [
    'search', 
    'favorites', 
    'openTabs', 
    'menuTree',
    ...(showAdminSection ? ['admin' as SidebarSection] : []),
  ];

  return (
    <div className="flex flex-col items-center py-2 gap-1">
      {sections.map((section) => {
        const Icon = SECTION_ICONS[section];
        return (
          <button
            key={section}
            className="p-3 hover:bg-ssoo-sitemap-bg rounded-lg transition-colors"
            title={SIDEBAR_SECTION_LABELS[section]}
            onMouseEnter={() => onMouseEnter(section)}
            onMouseLeave={onMouseLeave}
          >
            <Icon className="w-5 h-5 text-ssoo-primary" />
          </button>
        );
      })}
    </div>
  );
}
