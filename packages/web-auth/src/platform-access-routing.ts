import { resolveCommonSearchResultHref } from './search-routing';

export const PLATFORM_ACCESS_PATHS = {
  organizations: '/my-organizations',
  services: '/my-services',
  approvals: '/approvals',
} as const;

export function getPlatformAccessHref(path: string): string {
  return resolveCommonSearchResultHref({ sourceApp: 'admin', target: { sourceApp: 'admin', path } }) ?? path;
}
