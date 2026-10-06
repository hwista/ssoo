import type { CrmContractPerformanceResponse } from '@ssoo/types/crm';
import { ContractPerformanceWorkspaceClient } from './ContractPerformanceWorkspaceClient';
import {
  normalizeContractPerformanceQueryRecord,
  toRequiredPerformanceQuery,
} from './contractPerformanceQuery';
import { contractPerformanceFallback } from './contractPerformanceFallback';

const API_BASE_URL = process.env.CRM_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function loadPerformance(query: ReturnType<typeof toRequiredPerformanceQuery>): Promise<CrmContractPerformanceResponse> {
  try {
    const params = new URLSearchParams();
    params.set('year', String(query.year));
    params.set('mode', query.mode);
    if (query.businessType) params.set('businessType', query.businessType);
    if (query.industryLine) params.set('industryLine', query.industryLine);
    if (query.region !== 'all') params.set('region', query.region);
    if (query.search) params.set('search', query.search);
    const response = await fetch(`${API_BASE_URL}/crm/contracts/monthly-performance?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) return contractPerformanceFallback;
    const payload = await response.json();
    return payload?.data ?? contractPerformanceFallback;
  } catch {
    return contractPerformanceFallback;
  }
}

export async function ContractPerformanceWorkspace({ query = {} }: { query?: Record<string, string | string[] | undefined> }) {
  const normalizedQuery = normalizeContractPerformanceQueryRecord(query);
  const data = await loadPerformance(toRequiredPerformanceQuery(normalizedQuery));

  return <ContractPerformanceWorkspaceClient data={data} query={normalizedQuery} />;
}
