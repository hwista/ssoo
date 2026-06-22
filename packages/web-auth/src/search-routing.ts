import type {
  CommonSearchResult,
  CommonSearchSourceApp,
} from '@ssoo/types/common';

export type SsooSearchAppUrls = Partial<Record<CommonSearchSourceApp, string | null | undefined>>;

export const DEFAULT_SSOO_SEARCH_APP_URLS: Record<CommonSearchSourceApp, string> = {
  admin: 'http://localhost:3000',
  crm: 'http://localhost:3001',
  pms: 'http://localhost:3002',
  dms: 'http://localhost:3003',
  sns: 'http://localhost:3004',
};

export const DEFAULT_SSOO_SEARCH_API_BASE_URL = 'http://localhost:4000/api';

export function getCommonSearchSourceLabel(sourceApp: CommonSearchSourceApp): string {
  return sourceApp.toUpperCase();
}

function readPublicEnv(name: string): string | null {
  const env = typeof process !== 'undefined' ? process.env : undefined;
  const value = env?.[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function getCommonSearchApiBaseUrl(apiBaseUrl?: string | null): string {
  const explicit = apiBaseUrl?.trim();
  if (explicit) return explicit;
  return readPublicEnv('NEXT_PUBLIC_API_URL') ?? DEFAULT_SSOO_SEARCH_API_BASE_URL;
}

export function getCommonSearchAppUrlsFromPublicEnv(): SsooSearchAppUrls {
  return {
    admin: readPublicEnv('NEXT_PUBLIC_ADMIN_APP_URL'),
    crm: readPublicEnv('NEXT_PUBLIC_CRM_APP_URL'),
    pms: readPublicEnv('NEXT_PUBLIC_PMS_APP_URL'),
    dms: readPublicEnv('NEXT_PUBLIC_DMS_APP_URL'),
    sns: readPublicEnv('NEXT_PUBLIC_SNS_APP_URL'),
  };
}

function normalizeBaseUrl(baseUrl?: string | null): string | null {
  const trimmed = baseUrl?.trim();
  if (!trimmed) return null;
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function normalizePath(path?: string | null): string {
  const trimmed = path?.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export interface ResolveCommonSearchResultHrefOptions {
  appUrls?: SsooSearchAppUrls;
}

export function resolveCommonSearchResultHref(
  result: Pick<CommonSearchResult, 'sourceApp' | 'target'>,
  options: ResolveCommonSearchResultHrefOptions = {},
): string | null {
  if (result.target.externalHref) {
    return result.target.externalHref;
  }

  const envAppUrls = getCommonSearchAppUrlsFromPublicEnv();
  const baseUrl = normalizeBaseUrl(
    options.appUrls?.[result.sourceApp]
    ?? envAppUrls[result.sourceApp]
    ?? DEFAULT_SSOO_SEARCH_APP_URLS[result.sourceApp],
  );
  if (!baseUrl) return null;

  try {
    return new URL(normalizePath(result.target.path), baseUrl).toString();
  } catch {
    return null;
  }
}
