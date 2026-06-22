'use client';

import { useCommonGlobalSearchAdapter } from '@ssoo/web-auth';
import { SsooGlobalSearchPage } from '@ssoo/web-shell';
import { getSnsShellTabOptions } from '@/components/layout/shell-navigation';
import { useTabStore } from '@/stores';

export function SnsGlobalSearchPage({ path }: { path?: string }) {
  const openTab = useTabStore((state) => state.openTab);
  const globalSearch = useCommonGlobalSearchAdapter({
    currentApp: 'sns',
    currentPath: path,
    openCurrentAppResult: (result) => {
      openTab(getSnsShellTabOptions(result.target.path));
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
