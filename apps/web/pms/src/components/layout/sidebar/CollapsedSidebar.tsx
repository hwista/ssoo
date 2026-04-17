'use client';

import type { SidebarSection } from '@/types';
import { SIDEBAR_SECTION_LABELS } from '@/types';
import { SECTION_ICONS } from './constants';
import { useMenuStore } from '@/stores';

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
  const { adminMenus } = useMenuStore();

  const showAdminSection = adminMenus.length > 0;

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
