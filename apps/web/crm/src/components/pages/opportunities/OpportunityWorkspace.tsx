import type {
  CrmDashboardResponse,
  CrmOpportunityListQuery,
  CrmOpportunityListResponse,
  CrmOpportunitySort,
  CrmSourceOpportunityStatus,
  CrmOpportunityStatus,
} from '@ssoo/types/crm';
import { OpportunityWorkspaceClient, type OpportunityWorkspaceQuery } from './OpportunityWorkspaceClient';
import { crmDashboardFallback } from './dashboardFallback';

const API_BASE_URL = process.env.CRM_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

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

function normalizeQuery(query: Record<string, string | string[] | undefined> = {}): OpportunityWorkspaceQuery {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  const status = value('status') as CrmOpportunityStatus | 'all';
  const sourceStatus = value('sourceStatus') as CrmSourceOpportunityStatus | 'all';
  const sort = value('sort') as CrmOpportunitySort;
  const sourceSurface = value('sourceSurface');
  return {
    search: sourceSurface === 'list' ? value('search') : value('search').trim(),
    status: ['draft', 'qualified', 'proposal', 'won', 'lost', 'hold'].includes(status) ? status : 'all',
    sourceStatus: ['진행중', '검토중', '계약완료', '실패'].includes(sourceStatus) ? sourceStatus : 'all',
    sort: ['customer-asc', 'updated-desc', 'revenue-desc', 'profit-desc', 'margin-desc'].includes(sort) ? sort : 'customer-asc',
    selected: value('selected'),
    sourceSurface: ['dashboard', 'list', 'form', 'contract-document'].includes(sourceSurface)
      ? sourceSurface as OpportunityWorkspaceQuery['sourceSurface']
      : sourceSurface === 'workspace' || Object.keys(query).length > 0 ? 'workspace' : 'home',
    create: value('create') === 'opportunity',
  };
}

async function loadOpportunities(query: Required<Omit<CrmOpportunityListQuery, 'view'>> & { sourceSurface?: string }): Promise<CrmOpportunityListResponse> {
  try {
    const params = new URLSearchParams();
    if (query.sourceSurface === 'list') params.set('view', 'source-list');
    if (query.search) params.set('search', query.search);
    if (query.status !== 'all') params.set('status', query.status);
    if (query.sourceStatus !== 'all') params.set('sourceStatus', query.sourceStatus);
    if (query.sort !== 'customer-asc') params.set('sort', query.sort);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/crm/opportunities${suffix}`, { cache: 'no-store' });
    if (!response.ok) return fallback;
    const payload = await response.json();
    return payload?.data ?? fallback;
  } catch {
    return fallback;
  }
}

async function loadDashboard(): Promise<CrmDashboardResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/crm/dashboard`, { cache: 'no-store' });
    if (!response.ok) return crmDashboardFallback;
    const payload = await response.json();
    return payload?.data ?? crmDashboardFallback;
  } catch {
    return crmDashboardFallback;
  }
}

export async function OpportunityWorkspace({ query = {} }: { query?: Record<string, string | string[] | undefined> }) {
  const normalizedQuery = normalizeQuery(query);
  const [data, dashboard] = await Promise.all([
    loadOpportunities(normalizedQuery),
    loadDashboard(),
  ]);

  return <OpportunityWorkspaceClient data={data} dashboard={dashboard} query={normalizedQuery} />;
}
