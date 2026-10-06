import type { CrmCostPlanPreviewQuery, CrmCostPlanPreviewRegion } from '@ssoo/types/crm';

export interface CostPlanPreviewWorkspaceQuery {
  ownerOrganizationId?: string;
  year: number;
  businessType: string;
  industryLine: string;
  region: CrmCostPlanPreviewRegion;
  search: string;
  sourceSurface: 'internal-cost' | 'ams-vendor' | 'ams-cost' | '';
}

export function normalizeCostPlanPreviewQuery(path: string): CostPlanPreviewWorkspaceQuery {
  const [, queryString = ''] = path.split('?');
  const searchParams = new URLSearchParams(queryString);
  const year = Number(searchParams.get('year') ?? new Date().getFullYear());
  const region = searchParams.get('region') as CrmCostPlanPreviewRegion | null;
  return {
    year: Number.isFinite(year) && year >= 2000 ? Math.trunc(year) : new Date().getFullYear(),
    ownerOrganizationId: (searchParams.get('ownerOrganizationId') ?? '').trim(),
    businessType: (searchParams.get('businessType') ?? '').trim(),
    industryLine: (searchParams.get('industryLine') ?? '').trim(),
    region: region && ['all', 'domestic', 'overseas', 'unspecified'].includes(region) ? region : 'all',
    search: (searchParams.get('search') ?? '').trim(),
    sourceSurface: ['internal-cost', 'ams-vendor', 'ams-cost'].includes(searchParams.get('sourceSurface') ?? '')
      ? searchParams.get('sourceSurface') as CostPlanPreviewWorkspaceQuery['sourceSurface']
      : '',
  };
}

export function toRequiredCostPlanPreviewQuery(query: CostPlanPreviewWorkspaceQuery): Required<Omit<CrmCostPlanPreviewQuery, 'ownerOrganizationId'>> & Pick<CrmCostPlanPreviewQuery, 'ownerOrganizationId'> {
  return {
    year: query.year,
    ownerOrganizationId: query.ownerOrganizationId || undefined,
    businessType: query.businessType,
    industryLine: query.industryLine,
    region: query.region,
    search: query.search,
  };
}

export function normalizeCostPlanPreviewQueryRecord(
  query: Record<string, string | string[] | undefined> = {},
): CostPlanPreviewWorkspaceQuery {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  const year = Number(value('year') || new Date().getFullYear());
  const region = value('region') as CrmCostPlanPreviewRegion;
  return {
    year: Number.isFinite(year) && year >= 2000 ? Math.trunc(year) : new Date().getFullYear(),
    ownerOrganizationId: value('ownerOrganizationId').trim(),
    businessType: value('businessType').trim(),
    industryLine: value('industryLine').trim(),
    region: ['all', 'domestic', 'overseas', 'unspecified'].includes(region) ? region : 'all',
    search: value('search').trim(),
    sourceSurface: ['internal-cost', 'ams-vendor', 'ams-cost'].includes(value('sourceSurface'))
      ? value('sourceSurface') as CostPlanPreviewWorkspaceQuery['sourceSurface']
      : '',
  };
}
