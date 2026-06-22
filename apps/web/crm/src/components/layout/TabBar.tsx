'use client';

import { BarChart3, ChevronLeft, ChevronRight, Home, X } from 'lucide-react';
import { SsooMdiTabBar } from '@ssoo/web-shell';
import { CRM_HOME_TAB, useTabStore } from '@/stores/tab.store';

function getCrmTabIcon(path: string) {
  return path === CRM_HOME_TAB.path ? Home : BarChart3;
}

export function TabBar() {
  const { tabs, activeTabId, activateTab, closeTab, reorderTabs } = useTabStore();

  return (
    <SsooMdiTabBar
      tabs={tabs}
      activeTabId={activeTabId}
      homeTabId={CRM_HOME_TAB.id}
      leftControlIconSlot={<ChevronLeft />}
      rightControlIconSlot={<ChevronRight />}
      getTabIcon={(tab) => {
        const Icon = getCrmTabIcon(tab.path);
        return <Icon />;
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
