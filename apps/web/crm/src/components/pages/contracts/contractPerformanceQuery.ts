import type { CrmContractPerformanceQuery, CrmContractPerformanceRegion } from '@ssoo/types/crm';

export interface ContractPerformanceWorkspaceQuery {
  year: number;
  businessType: string;
  industryLine: string;
  region: CrmContractPerformanceRegion;
  search: string;
  mode: 'operations' | 'source-compatible';
}

function normalizeYear(value: string): number {
  const year = Number(value || new Date().getFullYear());
  return Number.isFinite(year) && year >= 2000 && year <= 2100 ? Math.trunc(year) : new Date().getFullYear();
}

function normalizeRegion(value: string): CrmContractPerformanceRegion {
  return ['all', 'domestic', 'overseas', 'unspecified'].includes(value)
    ? value as CrmContractPerformanceRegion
    : 'all';
}

export function normalizeContractPerformanceQuery(path: string): ContractPerformanceWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  return {
    year: normalizeYear(searchParams.get('year') ?? ''),
    businessType: (searchParams.get('businessType') ?? '').trim(),
    industryLine: (searchParams.get('industryLine') ?? '').trim(),
    region: normalizeRegion(searchParams.get('region') ?? ''),
    search: (searchParams.get('search') ?? '').trim(),
    mode: searchParams.get('mode') === 'source-compatible' ? 'source-compatible' : 'operations',
  };
}

export function toRequiredPerformanceQuery(query: ContractPerformanceWorkspaceQuery): Required<CrmContractPerformanceQuery> {
  return {
    mode: query.mode,
    year: query.year,
    businessType: query.businessType,
    industryLine: query.industryLine,
    region: query.region,
    search: query.search,
  };
}

export function normalizeContractPerformanceQueryRecord(
  query: Record<string, string | string[] | undefined> = {},
): ContractPerformanceWorkspaceQuery {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  return {
    year: normalizeYear(value('year')),
    businessType: value('businessType').trim(),
    industryLine: value('industryLine').trim(),
    region: normalizeRegion(value('region')),
    search: value('search').trim(),
    mode: value('mode') === 'source-compatible' ? 'source-compatible' : 'operations',
  };
}
