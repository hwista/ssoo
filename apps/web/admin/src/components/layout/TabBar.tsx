'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SsooMdiTabBar } from '@ssoo/web-shell';
import { ADMIN_HOME_TAB, useTabStore } from '@/stores/tab.store';
import { getAdminTabIcon } from './navigation';

export function AdminTabBar() {
  const { tabs, activeTabId, activateTab, closeTab, reorderTabs } = useTabStore();

  return (
    <SsooMdiTabBar
      tabs={tabs}
      activeTabId={activeTabId}
      homeTabId={ADMIN_HOME_TAB.id}
      leftControlIconSlot={<ChevronLeft />}
      rightControlIconSlot={<ChevronRight />}
      getTabIcon={(tab) => {
        const Icon = getAdminTabIcon(tab.path);
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
