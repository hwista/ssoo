'use client';

import type { CrmOpportunityListResponse, CrmOpportunitySort, CrmOpportunityStatus } from '@ssoo/types/crm';
import { OpportunityWorkspaceClient, type OpportunityWorkspaceQuery } from './OpportunityWorkspaceClient';

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
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const status = searchParams.get('status') as CrmOpportunityStatus | 'all' | null;
  const sort = searchParams.get('sort') as CrmOpportunitySort | null;

  return {
    search: (searchParams.get('search') ?? '').trim(),
    status: status && ['draft', 'qualified', 'proposal', 'won', 'lost', 'hold'].includes(status) ? status : 'all',
    sort: sort && ['revenue-desc', 'margin-desc'].includes(sort) ? sort : 'updated-desc',
    selected: searchParams.get('selected') ?? '',
  };
}

export function OpportunityWorkspaceMdiPage({ path }: { path: string }) {
  return <OpportunityWorkspaceClient data={fallback} query={normalizeQuery(path)} />;
}
