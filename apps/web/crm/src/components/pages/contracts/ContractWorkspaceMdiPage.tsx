'use client';

import type { CrmContractSort, CrmContractStatus } from '@ssoo/types/crm';
import { ContractWorkspaceClient, type ContractWorkspaceQuery } from './ContractWorkspaceClient';
import { contractFallback } from './contractWorkspaceFallback';

function normalizeQuery(path: string): ContractWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const status = searchParams.get('status') as CrmContractStatus | 'all' | null;
  const sort = searchParams.get('sort') as CrmContractSort | null;
  const sourceSurface = searchParams.get('sourceSurface');

  return {
    search: (sourceSurface === 'list' || sourceSurface === 'billing-actual') ? searchParams.get('search') ?? '' : (searchParams.get('search') ?? '').trim(),
    status: status && ['review', 'active', 'completed', 'terminated'].includes(status) ? status : 'all',
    sort: sort && ['updated-desc', 'revenue-desc', 'margin-desc', 'start-asc', 'created-desc', 'customer-asc'].includes(sort) ? sort : (sourceSurface === 'list' || sourceSurface === 'billing-actual') ? 'created-desc' : 'updated-desc',
    selected: searchParams.get('selected') ?? '',
    sourceSurface: sourceSurface && ['list', 'form', 'billing-actual'].includes(sourceSurface)
      ? sourceSurface as ContractWorkspaceQuery['sourceSurface']
      : '',
    billingView: searchParams.get('view') === 'list' || !searchParams.get('selected') ? 'list' : 'detail',
    create: searchParams.get('create') === 'contract',
  };
}

export function ContractWorkspaceMdiPage({ path, active }: { path: string; active: boolean }) {
  return <ContractWorkspaceClient data={contractFallback} query={normalizeQuery(path)} active={active} />;
}
