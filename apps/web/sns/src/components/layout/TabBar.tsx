'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SsooMdiTabBar } from '@ssoo/web-shell';
import { SNS_HOME_TAB, useTabStore } from '@/stores';
import { getSnsShellTabIcon } from './shell-navigation';

export function TabBar() {
  const { tabs, activeTabId, activateTab, closeTab, reorderTabs } = useTabStore();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <SsooMdiTabBar
      tabs={tabs}
      activeTabId={activeTabId}
      homeTabId={SNS_HOME_TAB.id}
      leftControlIconSlot={<ChevronLeft />}
      rightControlIconSlot={<ChevronRight />}
      getTabIcon={(tab) => {
        const Icon = getSnsShellTabIcon(tab.path);
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
