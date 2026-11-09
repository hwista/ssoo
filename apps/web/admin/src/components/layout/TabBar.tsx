'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { SsooMdiTabBar } from '@ssoo/web-shell';
import { ADMIN_HOME_TAB, useTabStore } from '@/stores/tab.store';
import { getAdminTabIcon } from './navigation';
import { parseSsooUserSurfaceRoute, usePlatformAccess } from '@ssoo/web-auth';

export function AdminTabBar() {
  const { tabs, activeTabId, activateTab, closeTab, reorderTabs: reorderStoredTabs } = useTabStore();
  const access = usePlatformAccess();
  const canManage = access?.snapshot.isPlatformAdmin === true && access.snapshot.status === 'active';
  const visibleTabs = canManage ? tabs : tabs.filter((tab) => {
    const path = tab.path.split('?')[0];
    return ['/', '/my-organizations', '/my-services'].includes(path) || !!parseSsooUserSurfaceRoute(path)
      || (path === '/approvals' && access?.snapshot.canReview);
  });
  const reorderTabs = (from: number, to: number) => {
    const source = visibleTabs[from];
    const target = visibleTabs[to];
    if (source && target) reorderStoredTabs(tabs.indexOf(source), tabs.indexOf(target));
  };

  return (
    <SsooMdiTabBar
      tabs={visibleTabs}
      activeTabId={activeTabId}
      homeTabId={ADMIN_HOME_TAB.id}
      leftControlIconSlot={<ChevronLeft />}
      rightControlIconSlot={<ChevronRight />}
      getTabIcon={(tab) => {
        const Icon = getAdminTabIcon(tab.path);
        return <Icon />;
      }}
      getTabActionIcon={(tab) => (tab.closable ? <X /> : null)}
      getTabActionTitle={(tab) => `${tab.title} 닫기`}
      onActivateTab={(tab) => activateTab(tab.id)}
      onActionTab={(tab, event) => {
        event.stopPropagation();
        closeTab(tab.id);
      }}
      onReorderTabs={reorderTabs}
    />
  );
}
