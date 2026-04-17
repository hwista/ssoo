'use client';

import { useAccessStore, useSidebarStore } from '@/stores';
import { LAYOUT_SIZES, FLOAT_PANEL_CONFIG } from '@/types';
import type { SidebarSection } from '@/types';
import { useRef, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

import { CollapsedSidebar } from './CollapsedSidebar';
import { ExpandedSidebar } from './ExpandedSidebar';
import { FloatingPanel } from './FloatingPanel';

/**
 * 사이드바 컴포넌트
 * - 펼침: 검색 + 즐겨찾기 + 열린탭 + 메뉴트리 + 관리자
 * - 접힘: 아이콘만 + hover 시 플로트 패널
 */
export function Sidebar() {
  const {
    isCollapsed,
    activeFloatSection,
    expandedSections,
    toggleCollapse,
    openFloatSection,
    closeFloatSection,
    toggleSection,
  } = useSidebarStore();

  const isAccessLoading = useAccessStore((state) => state.isLoading);
  const hydrateAccess = useAccessStore((state) => state.hydrate);
  const floatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 플로팅 패널 마우스 진입
  const handleMouseEnter = useCallback(
    (section: SidebarSection) => {
      if (floatTimeoutRef.current) {
        clearTimeout(floatTimeoutRef.current);
        floatTimeoutRef.current = null;
      }
      if (isCollapsed) {
        floatTimeoutRef.current = setTimeout(() => {
          openFloatSection(section);
        }, FLOAT_PANEL_CONFIG.openDelay);
      }
    },
    [isCollapsed, openFloatSection]
  );

  // 플로팅 패널 마우스 이탈
  const handleMouseLeave = useCallback(() => {
    if (floatTimeoutRef.current) {
      clearTimeout(floatTimeoutRef.current);
    }
    floatTimeoutRef.current = setTimeout(() => {
      closeFloatSection();
    }, FLOAT_PANEL_CONFIG.closeDelay);
  }, [closeFloatSection]);

  // 플로팅 패널 내부 마우스 진입 (타이머 취소)
  const handleFloatPanelMouseEnter = useCallback(() => {
    if (floatTimeoutRef.current) {
      clearTimeout(floatTimeoutRef.current);
      floatTimeoutRef.current = null;
    }
  }, []);

  const sidebarWidth = isCollapsed
    ? LAYOUT_SIZES.sidebar.collapsedWidth
    : LAYOUT_SIZES.sidebar.expandedWidth;

  return (
    <>
      <aside
        className="fixed left-0 top-0 h-full bg-ssoo-content-bg border-r border-ssoo-content-border flex flex-col transition-all duration-300 z-40"
        style={{ width: sidebarWidth }}
      >
        {/* 사이드바 헤더 - 그룹웨어 스타일 */}
        <div className="flex items-center justify-between h-header-h px-3 bg-ssoo-primary">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white rounded flex items-center justify-center">
                <span className="text-ssoo-primary font-bold text-base">S</span>
              </div>
              <span className="font-semibold text-white text-lg">SSOT</span>
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={isCollapsed ? '펼치기' : '접기'}
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 사이드바 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-ssoo-content-bg">
          {isCollapsed ? (
            <ScrollArea variant="sidebar" className="flex-1">
              <CollapsedSidebar
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            </ScrollArea>
          ) : (
              <ExpandedSidebar
                expandedSections={expandedSections}
                onToggleSection={toggleSection}
                onRefresh={hydrateAccess}
                isRefreshing={isAccessLoading}
              />
            )}
          </div>

        {/* 사이드바 푸터 - 카피라이트 (고정) */}
        <div className="flex-shrink-0 border-t border-ssoo-content-border bg-ssoo-content-bg px-3 py-2">
          {isCollapsed ? (
            <div className="text-center text-[10px] text-gray-400">
              © LS
            </div>
          ) : (
            <div className="text-xs text-gray-500 space-y-0.5">
              <div className="font-medium text-gray-600">SSOO v1.0.0</div>
              <div>© 2026 LS ITC Co., Ltd.</div>
              <div className="text-[10px] text-gray-400">All rights reserved.</div>
            </div>
          )}
        </div>
      </aside>

      {/* 플로팅 패널 */}
      {isCollapsed && activeFloatSection && (
        <FloatingPanel
          activeSection={activeFloatSection}
          onMouseEnter={handleFloatPanelMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </>
  );
}
