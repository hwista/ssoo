'use client';

import type { CommonSearchResult } from '@ssoo/types/common';
import { useCommonGlobalSearchAdapter } from '@ssoo/web-auth';
import { SsooGlobalSearchPage } from '@ssoo/web-shell';
import { useCurrentTab } from '@/hooks/useCurrentTab';
import { useTabStore } from '@/stores';

export function PmsGlobalSearchPage() {
  const currentTab = useCurrentTab();
  const openTab = useTabStore((state) => state.openTab);
  const globalSearch = useCommonGlobalSearchAdapter({
    currentApp: 'pms',
    currentPath: currentTab?.path,
    openCurrentAppResult: (result: CommonSearchResult) => {
      openTab({
        menuCode: `PMS-SEARCH-${result.entityType.toUpperCase()}`,
        menuId: `pms-search-${result.id}`,
        title: result.title,
        path: result.target.path,
        icon: 'Search',
        params: { id: result.metadata?.projectId ?? result.id },
        closable: true,
        activate: true,
      });
    },
  });

  return (
    <SsooGlobalSearchPage
      initialQuery={globalSearch.initialQuery}
      initialSourceApp={globalSearch.initialSourceApp}
      search={globalSearch.search}
      onOpenResult={globalSearch.openResult}
    />
  );
}
