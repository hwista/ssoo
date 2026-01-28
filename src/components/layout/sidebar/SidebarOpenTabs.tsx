'use client';

import { ChevronDown, ChevronRight, FileText, X } from 'lucide-react';
import { useTabStore, HOME_TAB } from '@/stores';

interface SidebarOpenTabsProps {
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * 사이드바 열린 탭 목록
 * - Home 탭 제외
 * - 탭 클릭 시 활성화
 * - 닫기 버튼
 */
export function SidebarOpenTabs({ isExpanded, onToggle }: SidebarOpenTabsProps) {
  const { tabs, activeTabId, activateTab, closeTab } = useTabStore();

  // Home 탭 제외
  const openTabs = tabs.filter((tab) => tab.id !== HOME_TAB.id);

  return (
    <div className="border-b border-gray-200">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span>열린 문서</span>
        {openTabs.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">
            {openTabs.length}
          </span>
        )}
      </button>

      {/* 탭 목록 */}
      {isExpanded && (
        <div className="pb-2">
          {openTabs.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">
              열린 문서가 없습니다
            </div>
          ) : (
            openTabs.map((tab) => {
              const isActive = tab.id === activeTabId;

              return (
                <div
                  key={tab.id}
                  className={`group flex items-center gap-2 px-3 py-1.5 mx-2 rounded cursor-pointer ${
                    isActive
                      ? 'bg-[#003366]/10 text-[#003366]'
                      : 'hover:bg-gray-200/50 text-gray-600'
                  }`}
                >
                  <button
                    onClick={() => activateTab(tab.id)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">{tab.title}</span>
                  </button>
                  {tab.closable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-300/50 rounded transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
