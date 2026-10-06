'use client';

import { normalizeCrmNavigationPath } from '@/lib/crmNavigation';

import type { CrmOpportunityListResponse, CrmOpportunitySort, CrmOpportunityStatus, CrmSourceOpportunityStatus } from '@ssoo/types/crm';
import { OpportunityWorkspaceClient, type OpportunityWorkspaceQuery } from './OpportunityWorkspaceClient';
import { crmDashboardFallback } from './dashboardFallback';

const fallback: CrmOpportunityListResponse = {
  summary: {
    totalCount: 0,
    filteredCount: 0,
    qualifiedCount: 0,
    proposalCount: 0,
    wonCount: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalMargin: 0,
    grossMarginRate: 0,
    boundaryNotice: '계약/청구/매출/원가는 CRM, 실행 수행은 PMS, 계정/권한/법인/조직은 공용 Admin 경계로 분리합니다.',
    unimplementedIntegrations: ['견적 생성', '계약 전환', 'DMS 연결', 'PMS 인계'],
    activeFilters: { search: '', status: 'all', sort: 'updated-desc' },
  },
  items: [],
};

function normalizeQuery(path: string): OpportunityWorkspaceQuery {
  const normalizedPath = normalizeCrmNavigationPath(path);
  const [, queryString = ''] = normalizedPath.split('?');
  const searchParams = new URLSearchParams(queryString);
  const status = searchParams.get('status') as CrmOpportunityStatus | 'all' | null;
  const sourceStatus = searchParams.get('sourceStatus') as CrmSourceOpportunityStatus | 'all' | null;
  const sort = searchParams.get('sort') as CrmOpportunitySort | null;
  const sourceSurface = searchParams.get('sourceSurface');

  return {
    search: sourceSurface === 'list' ? searchParams.get('search') ?? '' : (searchParams.get('search') ?? '').trim(),
    status: status && ['draft', 'qualified', 'proposal', 'won', 'lost', 'hold'].includes(status) ? status : 'all',
    sourceStatus: sourceStatus && ['진행중', '검토중', '계약완료', '실패'].includes(sourceStatus) ? sourceStatus : 'all',
    sort: sort && ['customer-asc', 'updated-desc', 'revenue-desc', 'profit-desc', 'margin-desc'].includes(sort) ? sort : 'customer-asc',
    selected: searchParams.get('selected') ?? '',
    sourceSurface: sourceSurface && ['dashboard', 'list', 'form', 'contract-document'].includes(sourceSurface)
      ? sourceSurface as OpportunityWorkspaceQuery['sourceSurface']
      : normalizedPath === '/' ? 'home' : 'workspace',
    create: searchParams.get('create') === 'opportunity',
  };
}

export function OpportunityWorkspaceMdiPage({ path }: { path: string }) {
  return <OpportunityWorkspaceClient data={fallback} dashboard={crmDashboardFallback} query={normalizeQuery(path)} />;
}
