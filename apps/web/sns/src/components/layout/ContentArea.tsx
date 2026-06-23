'use client';

import { Suspense, lazy, useEffect } from 'react';
import {
  SSOO_CONTENT_PAGE_ADAPTER_NAMES,
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SsooContentAreaEmptyState,
  SsooContentAreaSurface,
  SsooContentAreaState,
  SsooRegisteredMdiContentArea,
  createSsooContentPageAdapterElement,
  defineSsooMdiPageRegistry,
} from '@ssoo/web-shell';
import {
  createSsooUserSurfaceRouteContentPageElement,
  getSsooUserSurfaceTabId,
  getSsooUserSurfaceTabTitle,
  parseSsooUserSurfaceRoute,
  parseSsooUserSurfaceRouteEntry,
  type SsooUserSurfaceRoute,
} from '@ssoo/web-auth';
import { useTabStore, type SnsTabItem } from '@/stores';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.globalSearchPage;
const ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.routeHandoffPage;
const SNS_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.snsLocalPage;

const FeedPage = lazy(() => import('@/components/pages/feed/FeedPage').then((mod) => ({ default: mod.FeedPage })));
const BoardListPage = lazy(() => import('@/components/pages/board/BoardListPage').then((mod) => ({ default: mod.BoardListPage })));
const BoardDetailPage = lazy(() => import('@/components/pages/board/BoardDetailPage').then((mod) => ({ default: mod.BoardDetailPage })));
const SearchPage = lazy(() => import('@/components/pages/search/SearchPage').then((mod) => ({ default: mod.SearchPage })));
const SnsGlobalSearchPage = lazy(() => import('@/components/pages/global-search/GlobalSearchPage').then((mod) => ({ default: mod.SnsGlobalSearchPage })));

function stripQuery(path: string): string {
  return path.split('?')[0] || '/';
}

function getPathTail(path: string, prefix: string): string {
  return decodeURIComponent(stripQuery(path).slice(prefix.length));
}

function LegacyUserSurfaceRedirect({
  tabId,
  route,
  openTab,
  closeTab,
}: {
  tabId: string;
  route: SsooUserSurfaceRoute;
  openTab: ReturnType<typeof useTabStore.getState>['openTab'];
  closeTab: ReturnType<typeof useTabStore.getState>['closeTab'];
}) {
  useEffect(() => {
    openTab({
      id: getSsooUserSurfaceTabId(route.kind, route.userId),
      title: getSsooUserSurfaceTabTitle(route.kind),
      path: route.path,
      closable: true,
      activate: true,
    });
    closeTab(tabId);
  }, [closeTab, openTab, route, tabId]);

  return (
    <SsooContentAreaState variant="loading">
      사용자 표면으로 이동 중...
    </SsooContentAreaState>
  );
}

function renderSnsUserSurfaceContentPage(
  tab: SnsTabItem,
  openTab: ReturnType<typeof useTabStore.getState>['openTab'],
) {
  return createSsooUserSurfaceRouteContentPageElement({
    path: tab.path,
    title: tab.title,
    apiBaseUrl: API_BASE_URL,
    onOpenProfileTab: openTab,
  });
}

function renderSnsPage(tab: SnsTabItem) {
  const pathname = stripQuery(tab.path);

  if (pathname === '/') {
    return <FeedPage />;
  }
  if (pathname === '/board') {
    return <BoardListPage />;
  }
  if (pathname.startsWith('/board/')) {
    return <BoardDetailPage boardId={getPathTail(pathname, '/board/')} />;
  }
  if (pathname === SSOO_GLOBAL_SEARCH_APP_PATH) {
    return <SnsGlobalSearchPage path={tab.path} />;
  }
  if (pathname === '/search') {
    return <SearchPage />;
  }

  return (
    <SsooContentAreaEmptyState>페이지 준비 중: {tab.path}</SsooContentAreaEmptyState>
  );
}

function renderSnsRegisteredPage(tab: SnsTabItem) {
  return (
    <SsooContentAreaSurface padding="lg" scroll="auto" tone="default">
      <Suspense fallback={<SsooContentAreaState variant="loading">페이지 로딩 중...</SsooContentAreaState>}>
        {renderSnsPage(tab)}
      </Suspense>
    </SsooContentAreaSurface>
  );
}

function renderSnsGlobalSearchContentPage(tab: SnsTabItem) {
  return createSsooContentPageAdapterElement({
    adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME,
    children: (
      <Suspense fallback={<SsooContentAreaState variant="loading">페이지 로딩 중...</SsooContentAreaState>}>
        <SnsGlobalSearchPage path={tab.path} />
      </Suspense>
    ),
  });
}

function renderSnsUserSurfaceHandoffContentPage(
  tab: SnsTabItem,
  openTab: ReturnType<typeof useTabStore.getState>['openTab'],
  closeTab: ReturnType<typeof useTabStore.getState>['closeTab'],
) {
  const route = parseSsooUserSurfaceRouteEntry(tab.path);

  return createSsooContentPageAdapterElement({
    adapterName: ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME,
    children: route ? (
      <LegacyUserSurfaceRedirect
        tabId={tab.id}
        route={route}
        openTab={openTab}
        closeTab={closeTab}
      />
    ) : (
      <SsooContentAreaState title="알 수 없는 사용자 표면입니다." description={`경로: ${tab.path}`} />
    ),
  });
}

export function ContentArea() {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const pageRoutes = defineSsooMdiPageRegistry<SnsTabItem>([
    {
      key: 'user-surface',
      kind: 'contentPage',
      template: 'SsooContentPageTemplate',
      match: (tab) => Boolean(parseSsooUserSurfaceRoute(tab.path)),
      render: ({ tab }) => renderSnsUserSurfaceContentPage(tab, openTab),
    },
    {
      key: 'legacy-user-surface-handoff',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => !parseSsooUserSurfaceRoute(tab.path) && Boolean(parseSsooUserSurfaceRouteEntry(tab.path)),
      render: ({ tab }) => renderSnsUserSurfaceHandoffContentPage(tab, openTab, closeTab),
    },
    {
      key: 'global-search-page',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => stripQuery(tab.path) === SSOO_GLOBAL_SEARCH_APP_PATH,
      render: ({ tab }) => renderSnsGlobalSearchContentPage(tab),
    },
    {
      key: 'sns-local-pages',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: SNS_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME,
      match: () => true,
      render: ({ tab }) => createSsooContentPageAdapterElement({
        adapterName: SNS_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME,
        children: renderSnsRegisteredPage(tab),
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
