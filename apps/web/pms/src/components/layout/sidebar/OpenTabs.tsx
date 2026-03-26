'use client';

import { useTabStore } from '@/stores';
import { X } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';

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
      <div className="px-3 py-2 text-xs text-gray-400">
        열린 페이지가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {openTabs.map((tab) => {
        const IconComponent = getIconComponent(tab.icon);
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className={`flex items-center gap-2 w-full h-control-h px-3 text-sm rounded-md transition-colors group ${
              isActive
                ? 'bg-ssoo-content-border text-ssoo-primary font-medium'
                : 'text-gray-700 hover:bg-ssoo-sitemap-bg'
            }`}
          >
            <button
              onClick={() => activateTab(tab.id)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              {IconComponent && (
                <IconComponent className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{tab.title}</span>
            </button>
              {tab.closable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 h-control-h-sm w-control-h-sm flex items-center justify-center hover:bg-gray-200 rounded transition-opacity"
                >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
