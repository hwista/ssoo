import type {
  CrmContractListResponse,
  CrmContractSort,
  CrmContractStatus,
} from '@ssoo/types/crm';
import { ContractWorkspaceClient, type ContractWorkspaceQuery } from './ContractWorkspaceClient';
import { contractFallback } from './contractWorkspaceFallback';

const API_BASE_URL = process.env.CRM_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function normalizeQuery(query: Record<string, string | string[] | undefined> = {}): ContractWorkspaceQuery {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  const status = value('status') as CrmContractStatus | 'all';
  const sort = value('sort') as CrmContractSort;
  const sourceSurface = value('sourceSurface');
  return {
    search: (sourceSurface === 'list' || sourceSurface === 'billing-actual') ? value('search') : value('search').trim(),
    status: ['review', 'active', 'completed', 'terminated'].includes(status) ? status : 'all',
    sort: ['updated-desc', 'revenue-desc', 'margin-desc', 'start-asc', 'created-desc', 'customer-asc'].includes(sort) ? sort : (sourceSurface === 'list' || sourceSurface === 'billing-actual') ? 'created-desc' : 'updated-desc',
    selected: value('selected'),
    sourceSurface: ['list', 'form', 'billing-actual'].includes(sourceSurface)
      ? sourceSurface as ContractWorkspaceQuery['sourceSurface']
      : '',
    billingView: value('view') === 'list' || !value('selected') ? 'list' : 'detail',
    create: value('create') === 'contract',
  };
}

async function loadContracts(query: ContractWorkspaceQuery): Promise<CrmContractListResponse> {
  try {
    const params = new URLSearchParams();
    if (query.sourceSurface === 'list' || query.sourceSurface === 'billing-actual') params.set('view', 'source-list');
    if (query.search) params.set('search', query.search);
    if (query.status !== 'all') params.set('status', query.status);
    params.set('sort', query.sort);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/crm/contracts${suffix}`, { cache: 'no-store' });
    if (!response.ok) return contractFallback;
    const payload = await response.json();
    return payload?.data ?? contractFallback;
  } catch {
    return contractFallback;
  }
}

export async function ContractWorkspace({ query = {} }: { query?: Record<string, string | string[] | undefined> }) {
  const normalizedQuery = normalizeQuery(query);
  const data = await loadContracts(normalizedQuery);

  return <ContractWorkspaceClient data={data} query={normalizedQuery} />;
}
