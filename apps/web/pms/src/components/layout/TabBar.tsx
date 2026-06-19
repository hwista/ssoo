'use client';

import { useTabStore, HOME_TAB } from '@/stores';
import { SsooMdiTabBar } from '@ssoo/web-shell';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';

/**
 * MDI 탭바 컴포넌트
 * - 열린 탭 목록 표시
 * - 탭 활성화, 닫기
 * - 스크롤 네비게이션
 * - 드래그로 탭 순서 변경
 */
export function TabBar() {
  const { tabs, activeTabId, activateTab, closeTab, reorderTabs } = useTabStore();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <SsooMdiTabBar
      tabs={tabs}
      activeTabId={activeTabId}
      homeTabId={HOME_TAB.menuCode}
      leftControlIconSlot={<ChevronLeft />}
      rightControlIconSlot={<ChevronRight />}
      getTabIcon={(tab) => {
        const IconComponent = getIconComponent(tab.icon);
        return IconComponent ? <IconComponent /> : null;
      }}
      getTabActionIcon={(tab) => (tab.closable ? <X /> : null)}
      onActivateTab={(tab) => activateTab(tab.id)}
      onActionTab={(tab, event) => {
        event.stopPropagation();
        closeTab(tab.id);
      }}
      onReorderTabs={reorderTabs}
    />
  );
}
