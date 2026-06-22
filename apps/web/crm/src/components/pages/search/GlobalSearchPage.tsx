'use client';

import type { CommonSearchResult } from '@ssoo/types/common';
import { useCommonGlobalSearchAdapter } from '@ssoo/web-auth';
import { SsooGlobalSearchPage } from '@ssoo/web-shell';
import { useTabStore } from '@/stores/tab.store';

export function CrmGlobalSearchPage({ path }: { path?: string }) {
  const openTab = useTabStore((state) => state.openTab);
  const globalSearch = useCommonGlobalSearchAdapter({
    currentApp: 'crm',
    currentPath: path,
    openCurrentAppResult: (result: CommonSearchResult) => {
      openTab({
        id: `crm-search-${result.id}`,
        title: result.title,
        path: result.target.path,
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
