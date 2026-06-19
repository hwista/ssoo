'use client';

import { Suspense, lazy } from 'react';
import { useTabStore } from '@/stores';
import { TabContext } from '@/hooks/useCurrentTab';
import type { TabItem } from '@/types';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.globalSearchPage;
const PMS_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.pmsLocalPage;

// 페이지 컴포넌트 동적 import (named export 사용)
const pageComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  '/home': lazy(() => import('@/components/pages/home/DashboardPage').then(m => ({ default: m.HomeDashboardPage }))),
  '/my-projects': lazy(() => import('@/components/pages/work-queues/WorkQueuePages').then(m => ({ default: m.MyProjectsPage }))),
  '/action-required': lazy(() => import('@/components/pages/work-queues/WorkQueuePages').then(m => ({ default: m.ActionRequiredPage }))),
  '/closeout': lazy(() => import('@/components/pages/work-queues/WorkQueuePages').then(m => ({ default: m.CloseoutPage }))),
  '/operations': lazy(() => import('@/components/pages/work-queues/WorkQueuePages').then(m => ({ default: m.OperationsOverviewPage }))),
  // Legacy/status routes kept for existing tabs and deep state while the sidebar IA moves to work-queue entries.
  '/request': lazy(() => import('@/components/pages/request/ListPage').then(m => ({ default: m.RequestListPage }))),
  '/request/create': lazy(() => import('@/components/pages/request/CreatePage').then(m => ({ default: m.RequestCreatePage }))),
  '/proposal': lazy(() => import('@/components/pages/proposal/ListPage').then(m => ({ default: m.ProposalListPage }))),
  '/execution': lazy(() => import('@/components/pages/execution/ListPage').then(m => ({ default: m.ExecutionListPage }))),
  '/transition': lazy(() => import('@/components/pages/transition/ListPage').then(m => ({ default: m.TransitionListPage }))),
  '/project/detail': lazy(() => import('@/components/pages/project/DetailPage').then(m => ({ default: m.ProjectDetailPage }))),
  // Settings/Admin pages are no longer primary PMS sidebar entries; keep routable as direct admin paths.
  [SSOO_GLOBAL_SEARCH_APP_PATH]: lazy(() => import('@/components/pages/search/GlobalSearchPage').then(m => ({ default: m.PmsGlobalSearchPage }))),
  '/admin/code': lazy(() => import('@/components/pages/admin/CodeManagementPage').then(m => ({ default: m.CodeManagementPage }))),
  '/admin/role': lazy(() => import('@/components/pages/admin/RoleManagementPage').then(m => ({ default: m.RoleManagementPage }))),
  '/admin/menu': lazy(() => import('@/components/pages/admin/MenuManagementPage').then(m => ({ default: m.MenuManagementPage }))),
  '/admin/customer': lazy(() => import('@/components/pages/admin/CustomerManagementPage').then(m => ({ default: m.CustomerManagementPage }))),
};

function stripQuery(path: string): string {
  return path.split('?')[0] || '/';
}

function renderPmsPage(tab: TabItem) {
  const path = tab.path;
  if (!path) return null;

  const PageComponent = pageComponents[stripQuery(path)];

  if (!PageComponent) {
    return (
      <SsooContentAreaState
        title={tab.title}
        description={`페이지 준비 중: ${path}`}
      />
    );
  }

  return (
    <TabContext.Provider value={tab}>
      <Suspense fallback={<SsooContentAreaState variant="loading" tone="default">페이지 로딩 중...</SsooContentAreaState>}>
        <PageComponent />
      </Suspense>
    </TabContext.Provider>
  );
}

function renderPmsUserSurfaceContentPage(
  tab: TabItem,
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
    children: userSurfaceRoute ? (
      <SsooUserSurfacePage
        surface={userSurfaceRoute.kind}
        userId={userSurfaceRoute.userId}
        apiBaseUrl={API_BASE_URL}
        onOpenProfile={(nextUserId) => {
          const title = getSsooUserSurfaceTabTitle('user-profile');
          openTab({
            menuCode: getSsooUserSurfaceTabId('user-profile', nextUserId),
            menuId: getSsooUserSurfaceTabId('user-profile', nextUserId),
            title,
            icon: 'User',
            path: getSsooUserSurfaceTabPath('user-profile', nextUserId),
            closable: true,
            activate: true,
          });
        }}
      />
    ) : (
      <SsooContentAreaState title="알 수 없는 사용자 표면입니다." description={`경로: ${tab.path}`} />
    ),
  });
}

/**
 * 메인 콘텐츠 영역 (Keep-Alive MDI)
 *
 * - 모든 열린 탭의 컴포넌트를 동시에 마운트
 * - 비활성 탭은 CSS display:none으로 숨김 (DOM 유지)
 * - 탭 전환 시 unmount/remount 없이 상태 보존
 *   → 스크롤 위치, 폼 입력, 페이지네이션, 검색 필터 유지
 */
export function ContentArea() {
  const { tabs, activeTabId, openTab } = useTabStore();
  const pageRoutes = defineSsooMdiPageRegistry<TabItem>([
    {
      key: 'user-surface',
      kind: 'contentPage',
      template: 'SsooContentPageTemplate',
      match: (tab) => Boolean(tab.path && parseSsooUserSurfaceRoute(tab.path)),
      render: ({ tab }) => renderPmsUserSurfaceContentPage(tab, openTab),
    },
    {
      key: 'global-search-page',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => Boolean(tab.path && stripQuery(tab.path) === SSOO_GLOBAL_SEARCH_APP_PATH),
      render: ({ tab }) => createSsooContentPageAdapterElement({
        adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME,
        children: renderPmsPage(tab),
      }),
    },
    {
      key: 'pms-local-pages',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: PMS_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => Boolean(tab.path && pageComponents[stripQuery(tab.path)]),
      render: ({ tab }) => createSsooContentPageAdapterElement({
        adapterName: PMS_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME,
        children: renderPmsPage(tab),
      }),
    },
  ]);

  if (tabs.length === 0) {
    return (
      <SsooContentAreaEmptyState>탭을 선택하세요.</SsooContentAreaEmptyState>
    );
  }

  return (
    <SsooRegisteredMdiContentArea
      tabs={tabs}
      activeTabId={activeTabId}
      getTabId={(tab) => tab.id}
      routes={pageRoutes}
      unknownRouteSlot={(tab) => (
        <SsooContentAreaState
          title={tab.title}
          description={`페이지 준비 중: ${tab.path}`}
        />
      )}
    />
  );
}
