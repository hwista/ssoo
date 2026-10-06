import type { CrmReportsPreviewQuery, CrmReportsPreviewRegion } from '@ssoo/types/crm';

export interface ReportsPreviewWorkspaceQuery {
  ownerOrganizationId?: string;
  year: number;
  businessType: string;
  industryLine: string;
  region: CrmReportsPreviewRegion;
  search: string;
}

export function normalizeReportsPreviewQuery(path: string): ReportsPreviewWorkspaceQuery {
  const url = new URL(path, 'http://crm.local');
  return normalizeReportsPreviewQueryRecord(Object.fromEntries(url.searchParams.entries()));
}

export function normalizeReportsPreviewQueryRecord(
  query: Record<string, string | string[] | undefined>,
): ReportsPreviewWorkspaceQuery {
  const currentYear = new Date().getFullYear();
  const yearValue = Number(value(query.year) || currentYear);
  const region = value(query.region) as CrmReportsPreviewRegion;
  return {
    ownerOrganizationId: value(query.ownerOrganizationId),
    year: Number.isFinite(yearValue) && yearValue >= 2000 && yearValue <= 2100 ? Math.trunc(yearValue) : currentYear,
    businessType: value(query.businessType).slice(0, 120),
    industryLine: value(query.industryLine).slice(0, 120),
    region: region === 'domestic' || region === 'overseas' || region === 'unspecified' ? region : 'all',
    search: value(query.search).slice(0, 200),
  };
}

export function toRequiredReportsPreviewQuery(
  query: ReportsPreviewWorkspaceQuery,
): Required<Omit<CrmReportsPreviewQuery, 'ownerOrganizationId'>> & Pick<CrmReportsPreviewQuery, 'ownerOrganizationId'> {
  return {
    ownerOrganizationId: query.ownerOrganizationId || undefined,
    year: query.year,
    businessType: query.businessType,
    industryLine: query.industryLine,
    region: query.region,
    search: query.search,
  };
}

function value(input: string | string[] | undefined): string {
  if (Array.isArray(input)) {
    return input[0]?.trim() ?? '';
  }
  return input?.trim() ?? '';
}
