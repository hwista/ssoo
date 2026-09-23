'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { CommonSearchResult } from '@ssoo/types/common';
import { useCommonGlobalSearchAdapter } from '@ssoo/web-auth';
import { SSOO_GLOBAL_SEARCH_APP_PATH, SsooGlobalSearchPage } from '@ssoo/web-shell';
import { useCurrentTab } from '@/hooks/useCurrentTab';
import { useTabStore } from '@/stores';

export function PmsGlobalSearchPage() {
  const currentTab = useCurrentTab();
  const pathname = usePathname();
  const router = useRouter();
  const openTab = useTabStore((state) => state.openTab);
  const updateTabPath = useTabStore((state) => state.updateTabPath);
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
      sidecarNarrowBehavior="auto-close"
      initialQuery={globalSearch.initialQuery}
      initialSourceApp={globalSearch.initialSourceApp}
      search={globalSearch.search}
      onOpenResult={globalSearch.openResult}
      onSourceFilterChange={(sourceApp, context) => {
        if (!currentTab) return;
        const params = new URLSearchParams();
        if (context.sourceQuery) params.set('q', context.sourceQuery);
        if (sourceApp) params.set('sourceApp', sourceApp);
        const query = params.toString();
        const path = query ? `${SSOO_GLOBAL_SEARCH_APP_PATH}?${query}` : SSOO_GLOBAL_SEARCH_APP_PATH;
        updateTabPath(currentTab.id, path);
        if (pathname === SSOO_GLOBAL_SEARCH_APP_PATH) router.replace(path);
      }}
    />
  );
}
