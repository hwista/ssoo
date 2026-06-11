'use client';

import { useTabStore } from '@/stores';
import { X } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';
import { SsooSidebarEmptyState, SsooSidebarList, SsooSidebarListItem } from '@ssoo/web-shell';

/**
 * 사이드바 현재 열린 탭 목록
 * - 홈 탭(/home)은 항상 고정이므로 제외
 */
export function OpenTabs() {
  const { tabs, activeTabId, activateTab, closeTab } = useTabStore();

  // 홈 탭 제외 (항상 열려있는 고정 탭)
  const openTabs = tabs.filter((tab) => tab.path !== '/home');

  if (openTabs.length === 0) {
    return (
      <SsooSidebarEmptyState>
        열린 페이지가 없습니다.
      </SsooSidebarEmptyState>
    );
  }

  return (
    <SsooSidebarList padded={false}>
      {openTabs.map((tab) => {
        const IconComponent = getIconComponent(tab.icon);
        const isActive = tab.id === activeTabId;

        return (
          <SsooSidebarListItem
            key={tab.id}
            icon={IconComponent ?? undefined}
            label={tab.title}
            title={tab.title}
            active={isActive}
            onSelect={() => activateTab(tab.id)}
            trailingAction={
              tab.closable ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="flex h-control-h-sm w-control-h-sm items-center justify-center rounded opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100"
                  aria-label={`${tab.title} 닫기`}
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              ) : null
            }
          />
        );
      })}
    </SsooSidebarList>
  );
}
