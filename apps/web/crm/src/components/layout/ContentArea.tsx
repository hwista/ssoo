'use client';

import { lazy, Suspense } from 'react';
import {
  SSOO_CONTENT_PAGE_ADAPTER_NAMES,
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SsooContentAreaEmptyState,
  SsooContentAreaState,
  SsooRegisteredMdiContentArea,
  createSsooContentPageAdapterElement,
  defineSsooMdiPageRegistry,
} from '@ssoo/web-shell';
import {
  createSsooUserSurfaceRouteContentPageElement,
  parseSsooUserSurfaceRoute,
} from '@ssoo/web-auth';
import { useTabStore, type CrmTabItem } from '@/stores/tab.store';
import { OpportunityWorkspaceMdiPage } from '@/components/pages/opportunities/OpportunityWorkspaceMdiPage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const CRM_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.crmLocalPage;
const GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.globalSearchPage;

const CrmGlobalSearchPage = lazy(() => import('@/components/pages/search/GlobalSearchPage').then((mod) => ({ default: mod.CrmGlobalSearchPage })));

function stripQuery(path: string): string {
  return path.split('?')[0] || '/';
}

function renderCrmPage(tab: CrmTabItem) {
  const pathname = stripQuery(tab.path);

  if (pathname === SSOO_GLOBAL_SEARCH_APP_PATH) {
    return (
      <Suspense fallback={<SsooContentAreaState variant="loading">페이지 로딩 중...</SsooContentAreaState>}>
        <CrmGlobalSearchPage path={tab.path} />
      </Suspense>
    );
  }

  if (tab.path === '/' || tab.path.startsWith('/?')) {
    return <OpportunityWorkspaceMdiPage path={tab.path} />;
  }

  return <SsooContentAreaEmptyState>페이지 준비 중: {tab.path}</SsooContentAreaEmptyState>;
}

function renderCrmUserSurfaceContentPage(
  tab: CrmTabItem,
  openTab: ReturnType<typeof useTabStore.getState>['openTab'],
) {
  return createSsooUserSurfaceRouteContentPageElement({
    path: tab.path,
    title: tab.title,
    apiBaseUrl: API_BASE_URL,
    onOpenProfileTab: openTab,
  });
}

export function ContentArea() {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const pageRoutes = defineSsooMdiPageRegistry<CrmTabItem>([
    {
      key: 'user-surface',
      kind: 'contentPage',
      template: 'SsooContentPageTemplate',
      match: (tab) => Boolean(parseSsooUserSurfaceRoute(tab.path)),
      render: ({ tab }) => renderCrmUserSurfaceContentPage(tab, openTab),
    },
    {
      key: 'global-search-page',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => stripQuery(tab.path) === SSOO_GLOBAL_SEARCH_APP_PATH,
      render: ({ tab }) => createSsooContentPageAdapterElement({
        adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME,
        children: renderCrmPage(tab),
      }),
    },
    {
      key: 'crm-local-pages',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: CRM_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME,
      match: () => true,
      render: ({ tab }) => createSsooContentPageAdapterElement({
        adapterName: CRM_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME,
        children: renderCrmPage(tab),
      }),
    },
  ]);

  return (
    <SsooRegisteredMdiContentArea
      tabs={tabs}
      activeTabId={activeTabId}
      getTabId={(tab) => tab.id}
      routes={pageRoutes}
      emptySlot={<SsooContentAreaEmptyState>탭을 선택하세요.</SsooContentAreaEmptyState>}
    />
  );
}
