'use client';

import { lazy, Suspense } from 'react';
import {
  SSOO_CONTENT_PAGE_ADAPTER_NAMES,
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SsooContentAreaEmptyState,
  SsooContentAreaState,
  SsooRegisteredMdiContentArea,
  createSsooContentPageAdapterElement,
  createSsooSharedSurfaceContentPageElement,
  defineSsooMdiPageRegistry,
} from '@ssoo/web-shell';
import {
  SsooUserSurfacePage,
  getSsooUserSurfacePageDescription,
  getSsooUserSurfaceTabId,
  getSsooUserSurfaceTabPath,
  getSsooUserSurfaceTabTitle,
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

function renderCrmPage(tab: CrmTabItem, openTab: ReturnType<typeof useTabStore.getState>['openTab']) {
  const pathname = stripQuery(tab.path);
  const userSurfaceRoute = parseSsooUserSurfaceRoute(tab.path);

  if (userSurfaceRoute) {
    return (
      <SsooUserSurfacePage
        surface={userSurfaceRoute.kind}
        userId={userSurfaceRoute.userId}
        apiBaseUrl={API_BASE_URL}
        onOpenProfile={(nextUserId) => {
          openTab({
            id: getSsooUserSurfaceTabId('user-profile', nextUserId),
            title: getSsooUserSurfaceTabTitle('user-profile'),
            path: getSsooUserSurfaceTabPath('user-profile', nextUserId),
            closable: true,
            activate: true,
          });
        }}
      />
    );
  }

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
  const userSurfaceRoute = parseSsooUserSurfaceRoute(tab.path);

  return createSsooSharedSurfaceContentPageElement({
    surfaceId: userSurfaceRoute ? `ssoo-user-${userSurfaceRoute.kind}` : 'ssoo-user-surface',
    title: userSurfaceRoute?.title ?? tab.title,
    description: userSurfaceRoute
      ? getSsooUserSurfacePageDescription(userSurfaceRoute.kind)
      : undefined,
    pageTone: userSurfaceRoute?.kind === 'personal-settings' ? 'settings' : 'neutral',
    children: renderCrmPage(tab, openTab),
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
        children: renderCrmPage(tab, openTab),
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
        children: renderCrmPage(tab, openTab),
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
