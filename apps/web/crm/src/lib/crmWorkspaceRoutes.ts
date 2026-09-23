import { SSOO_GLOBAL_SEARCH_APP_PATH, createSsooGlobalSearchOpenRequest, getSsooGlobalSearchQueryFromPath } from '@ssoo/web-shell';
import { CRM_HOME_TAB, type OpenCrmTabOptions } from '@/stores/tab.store';

interface CrmWorkspaceRouteDefinition {
  pathname: string;
  title: string;
}

const CRM_WORKSPACE_ROUTE_DEFINITIONS: readonly CrmWorkspaceRouteDefinition[] = [
  { pathname: '/customers', title: '고객/활동' },
  { pathname: '/quote-settings', title: '견적 설정' },
  { pathname: '/contracts', title: '계약 원장' },
  { pathname: '/contract-performance', title: '계약대비실적' },
  { pathname: '/reports', title: '보고 Preview' },
  { pathname: '/business-plan', title: '사업계획 Preview' },
  { pathname: '/business-plan-performance', title: '사업계획대비실적 Preview' },
  { pathname: '/cost-plan', title: '원가/AMS Preview' },
  { pathname: '/operations', title: '운영 기준·제어' },
  { pathname: '/operations/settings', title: 'CRM 시스템 설정' },
  { pathname: '/settings', title: 'CRM 시스템 설정' },
];

function splitPath(path: string): { pathname: string; search: string } {
  const [pathname = '/', search = ''] = path.split('?', 2);
  return {
    pathname: pathname || '/',
    search,
  };
}

export function getCrmWorkspaceTabOptions(path: string): OpenCrmTabOptions | null {
  const normalizedPath = path || CRM_HOME_TAB.path;
  const { pathname, search } = splitPath(normalizedPath);

  if (pathname === SSOO_GLOBAL_SEARCH_APP_PATH) {
    const request = createSsooGlobalSearchOpenRequest(getSsooGlobalSearchQueryFromPath(normalizedPath));
    return {
      id: request.query ? `crm-global-search-${request.encodedQuery}` : 'crm-global-search',
      title: request.title,
      path: normalizedPath,
      closable: true,
    };
  }

  if (pathname === CRM_HOME_TAB.path) {
    const params = new URLSearchParams(search);
    const sourceSurface = params.get('sourceSurface');
    if (sourceSurface === 'dashboard') {
      return { id: 'crm-source-dashboard', title: '대시보드', path: normalizedPath, closable: true };
    }
    if (sourceSurface === 'list') {
      return { id: 'crm-source-opportunity-list', title: '영업기회 현황', path: normalizedPath, closable: true };
    }
    if (sourceSurface === 'form') {
      return {
        id: params.get('create') === 'opportunity' ? 'crm-opportunity-create' : 'crm-source-opportunity-form',
        title: params.get('create') === 'opportunity' ? '영업기회 등록' : '영업기회 조회',
        path: normalizedPath,
        closable: true,
      };
    }
    if (sourceSurface === 'contract-document') {
      return { id: 'crm-source-contract-document', title: '계약서 생성', path: normalizedPath, closable: true };
    }
    if (params.get('create') === 'opportunity') {
      return {
        id: 'crm-opportunity-create',
        title: '새 기회',
        path: normalizedPath,
        closable: true,
      };
    }

    return {
      ...CRM_HOME_TAB,
      path: normalizedPath,
    };
  }

  const route = CRM_WORKSPACE_ROUTE_DEFINITIONS.find((candidate) => candidate.pathname === pathname);
  if (!route) return null;

  if (pathname === '/contract-performance' && new URLSearchParams(search).get('mode') === 'source-compatible') {
    return { id: 'crm-source-contract-performance', title: '계약대비실적(월별)', path: normalizedPath, closable: true };
  }

  if (pathname === '/business-plan-performance' && new URLSearchParams(search).get('mode') === 'source-compatible') {
    return { id: 'crm-source-business-plan-performance', title: '사업계획대비실적(월별)', path: normalizedPath, closable: true };
  }

  if (pathname === '/business-plan' && new URLSearchParams(search).get('mode') === 'source-compatible') {
    return { id: 'crm-source-business-plan', title: '사업계획 등록', path: normalizedPath, closable: true };
  }

  if (pathname === '/quote-settings' && new URLSearchParams(search).get('mode') === 'source-compatible') {
    return { id: 'crm-source-company-profile', title: '회사 정보', path: normalizedPath, closable: true };
  }

  if (pathname === '/cost-plan') {
    const sourceSurface = new URLSearchParams(search).get('sourceSurface');
    if (sourceSurface === 'internal-cost') return { id: 'crm-source-internal-cost', title: '내부원가 등록', path: normalizedPath, closable: true };
    if (sourceSurface === 'ams-vendor') return { id: 'crm-source-ams-vendor', title: '공급업체 관리', path: normalizedPath, closable: true };
    if (sourceSurface === 'ams-cost') return { id: 'crm-source-ams-cost', title: '연간 외부원가', path: normalizedPath, closable: true };
  }

  if (pathname === '/contracts') {
    const params = new URLSearchParams(search);
    const sourceSurface = params.get('sourceSurface');
    if (sourceSurface === 'list') {
      return { id: 'crm-source-contract-list', title: '계약현황', path: normalizedPath, closable: true };
    }
    if (sourceSurface === 'form') {
      const create = params.get('create') === 'contract';
      return {
        id: create ? 'crm-source-contract-create' : 'crm-source-contract-form',
        title: create ? '계약등록' : '계약 조회',
        path: normalizedPath,
        closable: true,
      };
    }
    if (sourceSurface === 'billing-actual') {
      return { id: 'crm-source-billing-actual', title: '계약청구실적', path: normalizedPath, closable: true };
    }
  }

  return {
    id: isCrmSystemSettingsPath(route.pathname) ? '/operations/settings' : route.pathname,
    title: route.title,
    path: normalizedPath,
    closable: true,
  };
}

export function isCrmMenuPathActive(activePath: string | undefined, menuPath: string): boolean {
  if (!activePath) return false;
  const active = splitPath(activePath);
  const menu = splitPath(menuPath);
  if (active.pathname !== menu.pathname) return false;

  const menuParams = new URLSearchParams(menu.search);
  const activeParams = new URLSearchParams(active.search);
  if (menuParams.size > 0) {
    return [...menuParams.entries()].every(([key, value]) => activeParams.get(key) === value);
  }
  if (menu.pathname === '/') {
    return !activeParams.has('sourceSurface') && !activeParams.has('create');
  }
  if (menu.pathname === '/contracts') {
    return !activeParams.has('sourceSurface');
  }
  if (menu.pathname === '/contract-performance') {
    return !activeParams.has('mode');
  }
  if (menu.pathname === '/business-plan-performance') {
    return !activeParams.has('mode');
  }
  if (menu.pathname === '/business-plan') {
    return !activeParams.has('mode');
  }
  if (menu.pathname === '/quote-settings') {
    return !activeParams.has('mode');
  }
  if (menu.pathname === '/cost-plan') {
    return !activeParams.has('sourceSurface');
  }
  return true;
}

export function isCrmSystemSettingsPath(path: string): boolean {
  const { pathname } = splitPath(path);
  return pathname === '/settings' || pathname === '/operations/settings';
}
