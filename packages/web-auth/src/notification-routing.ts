import type {
  CommonNotificationItem,
  CommonNotificationJsonValue,
  CommonNotificationSourceApp,
} from '@ssoo/types/common';

export type SsooNotificationAppUrls = Partial<Record<CommonNotificationSourceApp, string | null | undefined>>;

export const DEFAULT_SSOO_NOTIFICATION_APP_URLS: Record<CommonNotificationSourceApp, string | null> = {
  system: null,
  admin: 'http://localhost:3000',
  crm: 'http://localhost:3001',
  pms: 'http://localhost:3002',
  dms: 'http://localhost:3003',
  sns: 'http://localhost:3004',
};

export function getCommonNotificationPayloadString(
  item: CommonNotificationItem,
  key: string,
): string | undefined {
  const value: CommonNotificationJsonValue | undefined = item.action?.payload?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function getCommonNotificationPath(item: CommonNotificationItem): string | undefined {
  return getCommonNotificationPayloadString(item, 'path') ?? item.reference?.path;
}

function getNotificationTargetPath(
  item: Pick<CommonNotificationItem, 'reference' | 'action'>,
): string | undefined {
  const payloadPath = item.action?.payload?.path;
  return typeof payloadPath === 'string' && payloadPath.trim().length > 0
    ? payloadPath.trim()
    : item.reference?.path;
}

export function getCommonNotificationSourceLabel(sourceApp: CommonNotificationSourceApp): string {
  if (sourceApp === 'system') return '시스템';
  return sourceApp.toUpperCase();
}

function normalizePath(path?: string | null): string {
  const trimmedPath = path?.trim();
  if (!trimmedPath) return '/';
  return trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
}

function normalizeBaseUrl(baseUrl?: string | null): string | null {
  const trimmedUrl = baseUrl?.trim();
  if (!trimmedUrl) return null;
  return trimmedUrl.endsWith('/') ? trimmedUrl : `${trimmedUrl}/`;
}

export interface ResolveCommonNotificationHrefOptions {
  appUrls?: SsooNotificationAppUrls;
  path?: string | null;
}

export function resolveCommonNotificationHref(
  item: Pick<CommonNotificationItem, 'sourceApp' | 'reference' | 'action'>,
  options: ResolveCommonNotificationHrefOptions = {},
): string | null {
  const sourceApp = item.sourceApp;
  if (sourceApp === 'system') return null;

  const baseUrl = normalizeBaseUrl(
    options.appUrls?.[sourceApp] ?? DEFAULT_SSOO_NOTIFICATION_APP_URLS[sourceApp],
  );
  if (!baseUrl) return null;

  const path = normalizePath(options.path ?? getNotificationTargetPath(item));
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    const fallbackUrl = DEFAULT_SSOO_NOTIFICATION_APP_URLS[sourceApp];
    return fallbackUrl ? new URL(path, normalizeBaseUrl(fallbackUrl) ?? fallbackUrl).toString() : null;
  }
}
