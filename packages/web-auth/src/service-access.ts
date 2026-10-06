import type { CrmOpportunityGlobalAccessSnapshot } from '@ssoo/types/crm';
import type { DmsAccessSnapshot } from '@ssoo/types/dms';
import type { PmsAccessMenuItem, PmsAccessSnapshot } from '@ssoo/types/pms';
import type { SnsAccessSnapshot } from '@ssoo/types/sns';
import { isSafeSsooRecoveryHref } from '@ssoo/web-shell';
import { createSharedAxiosApiClient, SharedApiError } from './axios-api-client';
import { getCommonSearchApiBaseUrl, resolveCommonSearchResultHref } from './search-routing';

export type SsooRecoveryApp = 'admin' | 'crm' | 'pms' | 'dms' | 'sns';
export interface AccessibleSsooService { code: SsooRecoveryApp; label: string; href: string }
export interface SsooServiceAccessResult { services: AccessibleSsooService[]; hasUnverifiedServices: boolean }

function hasAccessibleMenu(menus: PmsAccessMenuItem[]): boolean {
  return menus.some(menu => menu.isVisible && ((Boolean(menu.menuPath) && menu.accessType !== 'none') || hasAccessibleMenu(menu.children)));
}

/** Only server-confirmed home access is advertised; individual resource checks still run in each app. */
export async function loadAccessibleSsooServices(excludeApp?: SsooRecoveryApp): Promise<SsooServiceAccessResult> {
  const client = createSharedAxiosApiClient({ baseURL: getCommonSearchApiBaseUrl() });
  async function canEnter<T>(path: string, check: (data: T) => boolean): Promise<boolean> {
    try {
      const response = await client.get<{ success: boolean; data?: T }>(path);
      if (!response.data.success || !response.data.data) throw new Error('접근 권한 확인 실패');
      return check(response.data.data);
    } catch (error) {
      if (error instanceof SharedApiError && error.status === 403) return false;
      throw error;
    }
  }
  const checks: { code: SsooRecoveryApp; label: string; check: () => Promise<boolean> }[] = [
    { code: 'admin', label: '시스템 관리', check: () => canEnter<unknown>('/access/ops/catalog', () => true) },
    { code: 'crm', label: '영업관리', check: () => canEnter<CrmOpportunityGlobalAccessSnapshot>('/crm/opportunities/access/me', value => value.features.canViewOpportunity) },
    { code: 'pms', label: '프로젝트관리', check: () => canEnter<PmsAccessSnapshot>('/menus/my', value => hasAccessibleMenu(value.generalMenus)) },
    { code: 'dms', label: '문서관리', check: () => canEnter<DmsAccessSnapshot>('/dms/access/me', value => value.isAuthenticated && value.features.canReadDocuments) },
    { code: 'sns', label: '협업 서비스', check: () => canEnter<SnsAccessSnapshot>('/sns/access/me', value => value.features.canReadFeed) },
  ];
  const candidates = checks.filter(check => check.code !== excludeApp);
  const results = await Promise.allSettled(candidates.map(check => check.check()));
  const services: AccessibleSsooService[] = [];
  let hasUnverifiedServices = false;
  results.forEach((result, index) => {
    if (result.status === 'rejected') { hasUnverifiedServices = true; return; }
    if (!result.value) return;
    const { code, label } = candidates[index];
    const href = resolveCommonSearchResultHref({ sourceApp: code, target: { sourceApp: code, path: '/' } });
    if (href && isSafeSsooRecoveryHref(href)) services.push({ code, label, href });
    else hasUnverifiedServices = true;
  });
  return { services, hasUnverifiedServices };
}
