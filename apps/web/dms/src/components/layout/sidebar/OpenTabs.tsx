'use client';

import { FileText, X } from 'lucide-react';
import { useTabStore, HOME_TAB } from '@/stores';
import { FlatList, FlatListItem } from './FlatList';

/**
 * 사이드바 현재 열린 페이지 목록
 * - Home 탭 제외
 * - 탭 클릭 시 활성화
 * - 닫기 버튼
 * - PMS 디자인 표준 적용
 */
export function OpenTabs() {
  const { tabs, activeTabId, activateTab, closeTab } = useTabStore();

  // Home 탭 제외
  const openTabs = tabs.filter((tab) => tab.id !== HOME_TAB.id);

  if (openTabs.length === 0) {
    return (
      <div className="px-3 py-2 text-caption text-gray-400">
        열린 페이지가 없습니다.
      </div>
    );
  }

  return (
    <FlatList>
      {openTabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        return (
          <FlatListItem
            key={tab.id}
            icon={FileText}
            label={tab.title}
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
                  className="h-control-h-sm w-control-h-sm opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 rounded flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              ) : null
            }
          />
        );
      })}
    </FlatList>
  );
}
