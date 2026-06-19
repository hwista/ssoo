'use client';

import { FileText, X } from 'lucide-react';
import { useTabStore, HOME_TAB } from '@/stores';
import {
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarTreeActionButton,
} from '@ssoo/web-shell';

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
      <SsooSidebarEmptyState>
        열린 페이지가 없습니다.
      </SsooSidebarEmptyState>
    );
  }

  return (
    <SsooSidebarSearchableTree<(typeof openTabs)[number]>
      nodes={openTabs}
      getNodeId={(tab) => tab.id}
      getNodeLabel={(tab) => tab.title}
      getNodeTitle={(tab) => tab.title}
      getNodeSearchText={(tab) => [tab.title, tab.path]}
      getNodeIcon={() => FileText}
      isNodeActive={(tab) => tab.id === activeTabId}
      renderNodeTrailingAction={(tab) => (
        tab.closable ? (
          <SsooSidebarTreeActionButton
            label={`${tab.title} 닫기`}
            icon={X}
            onClick={() => closeTab(tab.id)}
          />
        ) : null
      )}
      onNodeSelect={(tab) => activateTab(tab.id)}
      emptyState={<SsooSidebarEmptyState>열린 페이지가 없습니다.</SsooSidebarEmptyState>}
    />
  );
}
