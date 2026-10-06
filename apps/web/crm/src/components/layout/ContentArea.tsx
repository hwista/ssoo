'use client';

import { SsooErrorPanel } from '@ssoo/web-shell';
import { lazy, Suspense } from 'react';
import { BusinessYearManagementPage } from '@/components/pages/business-years/BusinessYearManagementPage';
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
import { BusinessPlanPerformancePreviewWorkspaceMdiPage } from '@/components/pages/business-plan-performance/BusinessPlanPerformancePreviewWorkspaceMdiPage';
import { BusinessPlanPreviewWorkspaceMdiPage } from '@/components/pages/business-plan/BusinessPlanPreviewWorkspaceMdiPage';
import { CostPlanPreviewWorkspaceMdiPage } from '@/components/pages/cost-plan/CostPlanPreviewWorkspaceMdiPage';
import { ContractWorkspaceMdiPage } from '@/components/pages/contracts/ContractWorkspaceMdiPage';
import { ContractPerformanceWorkspaceMdiPage } from '@/components/pages/contracts/ContractPerformanceWorkspaceMdiPage';
import { CustomerWorkspaceMdiPage } from '@/components/pages/customers/CustomerWorkspaceMdiPage';
import { OperationsPreviewWorkspaceMdiPage } from '@/components/pages/operations/OperationsPreviewWorkspaceMdiPage';
import { QuoteSellerProfileWorkspaceMdiPage } from '@/components/pages/quote-settings/QuoteSellerProfileWorkspaceMdiPage';
import { ReportsPreviewWorkspaceMdiPage } from '@/components/pages/reports/ReportsPreviewWorkspaceMdiPage';
import { CrmSettingsWorkspaceMdiPage } from '@/components/pages/settings/CrmSettingsWorkspaceMdiPage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const CRM_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.crmLocalPage;
const GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.globalSearchPage;

const CrmGlobalSearchPage = lazy(() => import('@/components/pages/search/GlobalSearchPage').then((mod) => ({ default: mod.CrmGlobalSearchPage })));

function stripQuery(path: string): string {
  return path.split('?')[0] || '/';
}

function renderCrmPage(tab: CrmTabItem, active = true) {
  const pathname = stripQuery(tab.path);

  if (pathname === SSOO_GLOBAL_SEARCH_APP_PATH) {
    return (
      <Suspense fallback={<SsooContentAreaState variant="loading">페이지 로딩 중...</SsooContentAreaState>}>
        <CrmGlobalSearchPage path={tab.path} />
      </Suspense>
    );
  }

  if (pathname === '/' || pathname === '/opportunities') {
    return <OpportunityWorkspaceMdiPage path={tab.path} />;
  }

  if (pathname === '/contracts') {
    return <ContractWorkspaceMdiPage path={tab.path} active={active} />;
  }

  if (pathname === '/customers') {
    return <CustomerWorkspaceMdiPage path={tab.path} />;
  }

  if (pathname === '/contract-performance') {
    return <ContractPerformanceWorkspaceMdiPage path={tab.path} active={active} />;
  }

  if (pathname === '/reports') {
    return <ReportsPreviewWorkspaceMdiPage path={tab.path} />;
  }

  if (pathname === '/business-years') return <BusinessYearManagementPage path={tab.path} />;

  if (pathname === '/business-plan') {
    return <BusinessPlanPreviewWorkspaceMdiPage path={tab.path} />;
  }

  if (pathname === '/business-plan-performance') {
    return <BusinessPlanPerformancePreviewWorkspaceMdiPage path={tab.path} active={active} />;
  }

  if (pathname === '/cost-plan') {
    return <CostPlanPreviewWorkspaceMdiPage path={tab.path} />;
  }

  if (pathname === '/operations') {
    return <OperationsPreviewWorkspaceMdiPage path={tab.path} />;
  }

  if (pathname === '/quote-settings') {
    return <QuoteSellerProfileWorkspaceMdiPage />;
  }

  if (pathname === '/operations/settings' || pathname === '/settings') {
    return <CrmSettingsWorkspaceMdiPage />;
  }

  return <SsooErrorPanel kind="not-found" title="등록되지 않은 화면입니다" description="다른 탭을 선택하거나 홈으로 이동해 주세요." />;
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
      render: ({ active, tab }) => createSsooContentPageAdapterElement({
        adapterName: CRM_LOCAL_PAGE_CONTENT_PAGE_ADAPTER_NAME,
        children: renderCrmPage(tab, active),
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
