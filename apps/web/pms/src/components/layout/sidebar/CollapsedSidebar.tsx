'use client';

import { SsooCollapsedRailButton } from '@ssoo/web-shell';
import type { SidebarSection } from '@/types';
import { SIDEBAR_SECTION_LABELS } from '@/types';
import { SECTION_ICONS } from './constants';
import { useMenuStore } from '@/stores';

interface CollapsedSidebarProps {
  onSelect?: (section: SidebarSection) => void;
}

/**
 * 접힌 사이드바 (아이콘만)
 */
export function CollapsedSidebar({ onSelect }: CollapsedSidebarProps) {
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
          <SsooCollapsedRailButton
            key={section}
            icon={Icon}
            label={SIDEBAR_SECTION_LABELS[section]}
            onClick={() => onSelect?.(section)}
          />
        );
      })}
    </div>
  );
}
