'use client';

import { FileText, X } from 'lucide-react';
import { useTabStore, HOME_TAB } from '@/stores';

/**
 * 사이드바 현재 열린 페이지 목록
 * - Home 탭 제외
 * - 탭 클릭 시 활성화
 * - 닫기 버튼
 * - PMS 디자인 표준 적용
 */
export function SidebarOpenTabs() {
  const { tabs, activeTabId, activateTab, closeTab } = useTabStore();

  // Home 탭 제외
  const openTabs = tabs.filter((tab) => tab.id !== HOME_TAB.id);

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
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-2 w-full h-control-h px-3 text-sm rounded-md transition-colors ${
              isActive
                ? 'bg-ssoo-content-border text-ssoo-primary font-medium'
                : 'text-gray-700 hover:bg-ssoo-sitemap-bg'
            }`}
          >
            <button
              onClick={() => activateTab(tab.id)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <FileText className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-ssoo-primary' : 'text-gray-500'}`} />
              <span className="truncate">{tab.title}</span>
            </button>
            {tab.closable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity"
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
