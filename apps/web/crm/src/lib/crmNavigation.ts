import { defineSsooHomeEntry } from '@ssoo/web-shell';

export const CRM_HOME_ENTRY = defineSsooHomeEntry({ path: '/', pageTitle: '대시보드' });
export const CRM_OPPORTUNITY_WORKSPACE_PATH = '/opportunities';
export const CRM_OPPORTUNITY_WORKSPACE_TITLE = '영업기회 작업공간';

/** Legacy root queries are domain routes, except the explicit dashboard alias. */
export function normalizeCrmNavigationPath(path: string): string {
  const [withoutHash, hash] = path.split('#', 2);
  const [pathname = '/', search = ''] = withoutHash.split('?', 2);
  const params = new URLSearchParams(search);
  if (pathname !== '/' && pathname !== CRM_OPPORTUNITY_WORKSPACE_PATH) return path;
  if (params.get('sourceSurface') === 'dashboard') return CRM_HOME_ENTRY.path;
  if (pathname === '/' && params.size === 0) return CRM_HOME_ENTRY.path;
  return `${CRM_OPPORTUNITY_WORKSPACE_PATH}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`;
}
