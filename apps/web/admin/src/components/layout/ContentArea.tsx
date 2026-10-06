'use client';

import { SsooErrorPanel } from '@ssoo/web-shell';
import { Suspense, lazy } from 'react';
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
import { useTabStore, type AdminTabItem } from '@/stores/tab.store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const ADMIN_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.adminLocalPage;
const GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.globalSearchPage;

const DashboardPage = lazy(() => import('@/components/pages/dashboard/DashboardPage'));
const UsersPage = lazy(() => import('@/components/pages/users/UserManagementPage').then((mod) => ({ default: mod.UserManagementPage })));
const OrganizationsPage = lazy(() => import('@/components/pages/organizations/OrgManagementPage').then((mod) => ({ default: mod.OrgManagementPage })));
const CodesPage = lazy(() => import('@/components/pages/codes/CodeManagementPage').then((mod) => ({ default: mod.CodeManagementPage })));
const RolesPage = lazy(() => import('@/components/pages/roles/AccessManagementPage').then((mod) => ({ default: mod.AccessManagementPage })));
const AuthPage = lazy(() => import('@/components/pages/auth/AuthPolicyPage').then((mod) => ({ default: mod.AuthPolicyPage })));
const AiOperationsPage = lazy(() => import('@/components/pages/ai/AiOperationsPage').then((mod) => ({ default: mod.AiOperationsPage })));
const AdminGlobalSearchPage = lazy(() => import('@/components/pages/search/GlobalSearchPage').then((mod) => ({ default: mod.AdminGlobalSearchPage })));

function LoadingFallback() {
  return (
    <SsooContentAreaState variant="loading">페이지 로딩 중...</SsooContentAreaState>
  );
}

function stripQuery(path: string): string {
  return path.split('?')[0] || '/';
}

function renderAdminPage(tab: AdminTabItem) {
  const pathname = stripQuery(tab.path);

  if (pathname === '/') return <DashboardPage />;
  if (pathname === '/users') return <UsersPage path={tab.path} />;
  if (pathname === '/organizations') return <OrganizationsPage />;
  if (pathname === '/codes') return <CodesPage path={tab.path} />;
  if (pathname === '/roles') return <RolesPage />;
  if (pathname === '/auth') return <AuthPage />;
  if (pathname === '/ai-operations') return <AiOperationsPage />;
  if (pathname === SSOO_GLOBAL_SEARCH_APP_PATH) return <AdminGlobalSearchPage path={tab.path} />;

  return <SsooErrorPanel kind="not-found" title="등록되지 않은 화면입니다" description="다른 탭을 선택하거나 홈으로 이동해 주세요." />;
}

function renderAdminUserSurfaceContentPage(
  tab: AdminTabItem,
  openTab: ReturnType<typeof useTabStore.getState>['openTab'],
) {
  return createSsooUserSurfaceRouteContentPageElement({
    path: tab.path,
    title: tab.title,
    apiBaseUrl: API_BASE_URL,
    onOpenProfileTab: openTab,
    wrapChildren: (children) => (
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    ),
  });
}

export function AdminContentArea() {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const pageRoutes = defineSsooMdiPageRegistry<AdminTabItem>([
    {
      key: 'user-surface',
      kind: 'contentPage',
      template: 'SsooContentPageTemplate',
      match: (tab) => Boolean(parseSsooUserSurfaceRoute(tab.path)),
      render: ({ tab }) => renderAdminUserSurfaceContentPage(tab, openTab),
    },
    {
      key: 'global-search-page',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => stripQuery(tab.path) === SSOO_GLOBAL_SEARCH_APP_PATH,
      render: ({ tab }) => (
        createSsooContentPageAdapterElement({
          adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME,
          children: (
            <Suspense fallback={<LoadingFallback />}>
              {renderAdminPage(tab)}
            </Suspense>
          ),
        })
      ),
    },
    {
      key: 'admin-local-pages',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: ADMIN_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME,
      match: () => true,
      render: ({ tab }) => createSsooContentPageAdapterElement({
        adapterName: ADMIN_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME,
        children: (
          <Suspense fallback={<LoadingFallback />}>
            {renderAdminPage(tab)}
          </Suspense>
        ),
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
