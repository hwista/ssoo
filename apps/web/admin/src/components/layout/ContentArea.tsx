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
  usePlatformAccess,
} from '@ssoo/web-auth';
import { normalizeAdminPath } from './navigation';
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
const MyOrganizationsPage = lazy(() => import('@/components/pages/access/MyOrganizationsPage').then((mod) => ({ default: mod.MyOrganizationsPage })));
const MyServicesPage = lazy(() => import('@/components/pages/access/MyServicesPage').then((mod) => ({ default: mod.MyServicesPage })));
const ApprovalsPage = lazy(() => import('@/components/pages/access/ApprovalsPage').then((mod) => ({ default: mod.ApprovalsPage })));
const ApplicationManagementPage = lazy(() => import('@/components/pages/access/ApplicationManagementPage').then((mod) => ({ default: mod.ApplicationManagementPage })));

const MembershipManagementPage = lazy(() => import('@/components/pages/access/MembershipManagementPage').then(mod => ({default: mod.MembershipManagementPage})));
const OperationHistoryPage = lazy(() => import('@/components/pages/access/OperationHistoryPage').then(mod => ({default: mod.OperationHistoryPage})));
const EmailOperationsPage = lazy(() => import('@/components/pages/auth/EmailOperationsPage').then(mod => ({default: mod.EmailOperationsPage})));

function LoadingFallback() {
  return (
    <SsooContentAreaState variant="loading">페이지 로딩 중...</SsooContentAreaState>
  );
}

function stripQuery(path: string): string {
  return path.split('?')[0] || '/';
}

function renderAdminPage(tab: AdminTabItem, canManage: boolean) {
  const path = normalizeAdminPath(tab.path);
  const pathname = stripQuery(path);

  if (pathname === '/my-organizations' || (pathname === '/' && !canManage)) return <MyOrganizationsPage />;
  if (pathname === '/my-services') return <MyServicesPage />;
  if (pathname === '/approvals') return <ApprovalsPage path={path} />;
  if (!canManage) return <SsooErrorPanel kind="forbidden" title="관리 권한이 필요합니다" description="내 업무 메뉴에서 소속과 서비스 이용을 관리할 수 있습니다." />;
  if (pathname === '/') return <DashboardPage />;
  if (pathname === '/users') return <UsersPage path={tab.path} />;
  if (pathname === '/accounts') return <UsersPage path={path} mode="accounts" />;
  if (pathname === '/memberships') return <MembershipManagementPage path={path} />;
  if (pathname === '/organizations') return <OrganizationsPage key={path} path={path} />;
  if (pathname === '/applications') return <ApplicationManagementPage />;
  if (pathname === '/service-grants') return <ApplicationManagementPage key={path} path={path} view="grants" />;
  if (pathname === '/codes') return <CodesPage path={tab.path} />;
  if (pathname === '/roles') return <RolesPage path={path} />;
  if (pathname === '/organization-permissions') return <RolesPage path={path} section="organization-permissions" />;
  if (pathname === '/user-permissions') return <RolesPage path={path} section="user-permissions" />;
  if (pathname === '/access-diagnosis') return <RolesPage path={path} section="inspect" />;
  if (pathname === '/approval-authorities') return <RolesPage path={path} section="approval-authorities" />;
  if (pathname === '/operation-history') return <OperationHistoryPage path={path} />;
  if (pathname === '/email-operations') return <EmailOperationsPage />;
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
  const access = usePlatformAccess();
  const canManage = access?.snapshot.isPlatformAdmin === true && access.snapshot.status === 'active';
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
              {renderAdminPage(tab, canManage)}
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
            {renderAdminPage(tab, canManage)}
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
