'use client';

import { useTabStore } from '@/stores';
import { X } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';
import {
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarTreeActionButton,
  SsooSidebarTreeNodeIcon,
} from '@ssoo/web-shell';

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
    <SsooSidebarSearchableTree<(typeof openTabs)[number]>
      nodes={openTabs}
      getNodeId={(tab) => tab.id}
      getNodeLabel={(tab) => tab.title}
      getNodeTitle={(tab) => tab.title}
      getNodeSearchText={(tab) => [tab.title, tab.menuCode, tab.path ?? '']}
      isNodeActive={(tab) => tab.id === activeTabId}
      renderNodeIcon={(tab, state) => {
        const IconComponent = getIconComponent(tab.icon);
        return IconComponent ? (
          <SsooSidebarTreeNodeIcon icon={IconComponent} active={state.active} />
        ) : null;
      }}
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
