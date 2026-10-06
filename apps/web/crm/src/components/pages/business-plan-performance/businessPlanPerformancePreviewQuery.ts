import type {
  CrmBusinessPlanPerformanceMode,
  CrmBusinessPlanPerformanceQuery,
  CrmBusinessPlanPreviewRegion,
} from '@ssoo/types/crm';

export interface BusinessPlanPerformancePreviewWorkspaceQuery {
  ownerOrganizationId?: string;
  year: number;
  mode: CrmBusinessPlanPerformanceMode;
  businessType: string;
  industryLine: string;
  region: CrmBusinessPlanPreviewRegion;
  search: string;
}

export function normalizeBusinessPlanPerformancePreviewQuery(path: string): BusinessPlanPerformancePreviewWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const year = Number(searchParams.get('year') ?? new Date().getFullYear());
  const mode = searchParams.get('mode');
  const region = searchParams.get('region') as CrmBusinessPlanPreviewRegion | null;
  return {
    year: Number.isFinite(year) && year >= 2000 && year <= 2100 ? Math.trunc(year) : new Date().getFullYear(),
    mode: mode === 'source-compatible' ? 'source-compatible' : 'extended-actual',
    ownerOrganizationId: (searchParams.get('ownerOrganizationId') ?? '').trim(),
    businessType: (searchParams.get('businessType') ?? '').trim(),
    industryLine: (searchParams.get('industryLine') ?? '').trim(),
    region: region && ['all', 'domestic', 'overseas', 'unspecified'].includes(region) ? region : 'all',
    search: (searchParams.get('search') ?? '').trim(),
  };
}

export function toRequiredBusinessPlanPerformancePreviewQuery(
  query: BusinessPlanPerformancePreviewWorkspaceQuery,
): Required<Omit<CrmBusinessPlanPerformanceQuery, 'ownerOrganizationId'>> & Pick<CrmBusinessPlanPerformanceQuery, 'ownerOrganizationId'> {
  return {
    year: query.year,
    mode: query.mode,
    ownerOrganizationId: query.ownerOrganizationId || undefined,
    businessType: query.businessType,
    industryLine: query.industryLine,
    region: query.region,
    search: query.search,
  };
}

export function normalizeBusinessPlanPerformancePreviewQueryRecord(
  query: Record<string, string | string[] | undefined> = {},
): BusinessPlanPerformancePreviewWorkspaceQuery {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  const year = Number(value('year') || new Date().getFullYear());
  const mode = value('mode');
  const region = value('region') as CrmBusinessPlanPreviewRegion;
  return {
    year: Number.isFinite(year) && year >= 2000 && year <= 2100 ? Math.trunc(year) : new Date().getFullYear(),
    mode: mode === 'source-compatible' ? 'source-compatible' : 'extended-actual',
    ownerOrganizationId: value('ownerOrganizationId').trim(),
    businessType: value('businessType').trim(),
    industryLine: value('industryLine').trim(),
    region: ['all', 'domestic', 'overseas', 'unspecified'].includes(region) ? region : 'all',
    search: value('search').trim(),
  };
}
