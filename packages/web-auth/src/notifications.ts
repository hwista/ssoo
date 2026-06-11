import { useEffect } from 'react';
import type {
  CommonNotificationItem,
  CommonNotificationListQuery,
  CommonNotificationListResult,
  CommonNotificationMarkAllReadResult,
  CommonNotificationSourceApp,
  CommonNotificationStreamEvent,
  CommonNotificationStreamEventType,
  CommonNotificationUnreadCountResult,
} from '@ssoo/types/common';
import { applySharedAuthHeaders } from './storage';
import { restoreSharedAuthSession } from './session-bootstrap';

export interface CommonNotificationApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
  details?: unknown;
}

export interface CreateCommonNotificationApiOptions {
  basePath?: string;
  defaultSourceApp?: CommonNotificationSourceApp;
  credentials?: RequestCredentials;
  fetchImpl?: typeof fetch;
}

export interface CommonNotificationApi {
  list: (query?: CommonNotificationListQuery) => Promise<CommonNotificationApiResult<CommonNotificationListResult>>;
  unreadCount: (sourceApp?: CommonNotificationSourceApp) => Promise<CommonNotificationApiResult<CommonNotificationUnreadCountResult>>;
  markAsRead: (notificationId: string) => Promise<CommonNotificationApiResult<CommonNotificationItem>>;
  markAsUnread: (notificationId: string) => Promise<CommonNotificationApiResult<CommonNotificationItem>>;
  markAllAsRead: (sourceApp?: CommonNotificationSourceApp) => Promise<CommonNotificationApiResult<CommonNotificationMarkAllReadResult>>;
  markByReferencePathAsRead: (
    path: string,
    sourceApp?: CommonNotificationSourceApp,
  ) => Promise<CommonNotificationApiResult<CommonNotificationMarkAllReadResult>>;
}

const DEFAULT_NOTIFICATION_BASE_PATH = '/api/notifications';
const REFRESH_EVENT_TYPES = new Set<CommonNotificationStreamEventType>([
  'connected',
  'notification',
  'notification-read',
  'notification-unread',
  'notification-archived',
  'notifications-read-all',
]);

function normalizeBasePath(basePath: string): string {
  return basePath.replace(/\/+$/, '');
}

function buildQueryString(query: CommonNotificationListQuery = {}, defaultSourceApp?: CommonNotificationSourceApp): string {
  const params = new URLSearchParams();
  const sourceApp = query.sourceApp ?? defaultSourceApp;
  if (sourceApp) params.set('sourceApp', sourceApp);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.unreadOnly) params.set('unreadOnly', 'true');
  if (query.readOnly) params.set('readOnly', 'true');
  if (query.notificationType?.trim()) params.set('notificationType', query.notificationType.trim());

  const value = params.toString();
  return value ? `?${value}` : '';
}

function buildSourceQuery(sourceApp?: CommonNotificationSourceApp): string {
  return sourceApp ? `?sourceApp=${encodeURIComponent(sourceApp)}` : '';
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.error === 'string') {
    return record.error;
  }
  if (record.error && typeof record.error === 'object') {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.message === 'string') {
      return nested.message;
    }
  }
  if (typeof record.message === 'string') {
    return record.message;
  }
  return fallback;
}

async function requestJson<T>(
  path: string,
  options: {
    method?: 'GET' | 'PUT';
    body?: unknown;
    credentials: RequestCredentials;
    fetchImpl: typeof fetch;
  },
): Promise<CommonNotificationApiResult<T>> {
  const requestInit: RequestInit = {
    method: options.method ?? 'GET',
    credentials: options.credentials,
    headers: applySharedAuthHeaders({ 'Content-Type': 'application/json' }),
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  let response = await options.fetchImpl(path, requestInit);

  if (response.status === 401) {
    const restored = await restoreSharedAuthSession();
    if (restored.success) {
      response = await options.fetchImpl(path, {
        ...requestInit,
        headers: applySharedAuthHeaders({ 'Content-Type': 'application/json' }, { forceAuthorization: true }),
      });
    }
  }

  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: getErrorMessage(payload, response.statusText || '알림 요청에 실패했습니다.'),
    };
  }

  return {
    success: true,
    data: payload as T,
  };
}

export function createCommonNotificationApi(
  options: CreateCommonNotificationApiOptions = {},
): CommonNotificationApi {
  const basePath = normalizeBasePath(options.basePath ?? DEFAULT_NOTIFICATION_BASE_PATH);
  const defaultSourceApp = options.defaultSourceApp;
  const credentials = options.credentials ?? 'same-origin';
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    list: (query = {}) => requestJson<CommonNotificationListResult>(
      `${basePath}${buildQueryString(query, defaultSourceApp)}`,
      { credentials, fetchImpl },
    ),
    unreadCount: (sourceApp = defaultSourceApp) => requestJson<CommonNotificationUnreadCountResult>(
      `${basePath}/unread-count${buildSourceQuery(sourceApp)}`,
      { credentials, fetchImpl },
    ),
    markAsRead: (notificationId: string) => requestJson<CommonNotificationItem>(
      `${basePath}/${encodeURIComponent(notificationId)}/read`,
      { method: 'PUT', credentials, fetchImpl },
    ),
    markAsUnread: (notificationId: string) => requestJson<CommonNotificationItem>(
      `${basePath}/${encodeURIComponent(notificationId)}/unread`,
      { method: 'PUT', credentials, fetchImpl },
    ),
    markAllAsRead: (sourceApp = defaultSourceApp) => requestJson<CommonNotificationMarkAllReadResult>(
      `${basePath}/read-all${buildSourceQuery(sourceApp)}`,
      { method: 'PUT', credentials, fetchImpl },
    ),
    markByReferencePathAsRead: (path: string, sourceApp = defaultSourceApp) => requestJson<CommonNotificationMarkAllReadResult>(
      `${basePath}/read-by-reference`,
      { method: 'PUT', body: { path, sourceApp }, credentials, fetchImpl },
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNotificationStreamEvent(value: unknown): value is CommonNotificationStreamEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.type === 'string'
    && typeof value.emittedAt === 'string'
    && (
      value.sourceApp === undefined
      || value.sourceApp === 'system'
      || value.sourceApp === 'dms'
      || value.sourceApp === 'sns'
      || value.sourceApp === 'pms'
      || value.sourceApp === 'admin'
    )
  );
}

function parseNotificationStreamEvent(event: Event): CommonNotificationStreamEvent | null {
  if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(event.data);
    return isNotificationStreamEvent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function shouldHandleEvent(sourceApp: CommonNotificationSourceApp, payload: CommonNotificationStreamEvent): boolean {
  return !payload.sourceApp || payload.sourceApp === sourceApp;
}

export interface UseCommonNotificationEventStreamOptions {
  enabled?: boolean;
  eventsPath?: string;
  onRefresh?: (event: CommonNotificationStreamEvent) => void;
  onNotification?: (
    notification: CommonNotificationItem,
    event: CommonNotificationStreamEvent,
  ) => void;
  onDomainEvent?: (event: CommonNotificationStreamEvent) => void;
}

interface NotificationStreamSubscriber {
  onRefresh?: (event: CommonNotificationStreamEvent) => void;
  onNotification?: (
    notification: CommonNotificationItem,
    event: CommonNotificationStreamEvent,
  ) => void;
  onDomainEvent?: (event: CommonNotificationStreamEvent) => void;
}

interface NotificationStreamConnection {
  eventSource: EventSource;
  subscribers: Set<NotificationStreamSubscriber>;
}

const notificationStreamConnections = new Map<string, NotificationStreamConnection>();

function getConnectionKey(sourceApp: CommonNotificationSourceApp, eventsPath: string): string {
  return `${eventsPath}::${sourceApp}`;
}

function createEventSourceUrl(sourceApp: CommonNotificationSourceApp, eventsPath: string): string {
  const params = new URLSearchParams({ sourceApp });
  return `${eventsPath}${eventsPath.includes('?') ? '&' : '?'}${params.toString()}`;
}

function createNotificationStreamConnection(
  sourceApp: CommonNotificationSourceApp,
  eventsPath: string,
): NotificationStreamConnection {
  const eventSource = new EventSource(createEventSourceUrl(sourceApp, eventsPath), {
    withCredentials: true,
  });
  const connection: NotificationStreamConnection = {
    eventSource,
    subscribers: new Set(),
  };

  const handleRefreshEvent: EventListener = (event) => {
    const payload = parseNotificationStreamEvent(event);
    if (!payload || !REFRESH_EVENT_TYPES.has(payload.type) || !shouldHandleEvent(sourceApp, payload)) {
      return;
    }

    for (const subscriber of connection.subscribers) {
      subscriber.onRefresh?.(payload);
      if (payload.type === 'notification' && payload.notification) {
        subscriber.onNotification?.(payload.notification, payload);
      }
    }
  };

  const handleDomainEvent: EventListener = (event) => {
    const payload = parseNotificationStreamEvent(event);
    if (!payload || payload.type !== 'domain-event' || !shouldHandleEvent(sourceApp, payload)) {
      return;
    }

    for (const subscriber of connection.subscribers) {
      subscriber.onDomainEvent?.(payload);
    }
  };

  eventSource.addEventListener('connected', handleRefreshEvent);
  eventSource.addEventListener('domain-event', handleDomainEvent);
  eventSource.addEventListener('notification', handleRefreshEvent);
  eventSource.addEventListener('notification-read', handleRefreshEvent);
  eventSource.addEventListener('notification-unread', handleRefreshEvent);
  eventSource.addEventListener('notification-archived', handleRefreshEvent);
  eventSource.addEventListener('notifications-read-all', handleRefreshEvent);

  notificationStreamConnections.set(getConnectionKey(sourceApp, eventsPath), connection);
  return connection;
}

function getNotificationStreamConnection(
  sourceApp: CommonNotificationSourceApp,
  eventsPath: string,
): NotificationStreamConnection {
  return notificationStreamConnections.get(getConnectionKey(sourceApp, eventsPath))
    ?? createNotificationStreamConnection(sourceApp, eventsPath);
}

function releaseNotificationStreamConnection(
  sourceApp: CommonNotificationSourceApp,
  eventsPath: string,
  subscriber: NotificationStreamSubscriber,
): void {
  const key = getConnectionKey(sourceApp, eventsPath);
  const connection = notificationStreamConnections.get(key);
  if (!connection) return;
  connection.subscribers.delete(subscriber);
  if (connection.subscribers.size > 0) return;
  connection.eventSource.close();
  notificationStreamConnections.delete(key);
}

export function useCommonNotificationEventStream(
  sourceApp: CommonNotificationSourceApp,
  options: boolean | UseCommonNotificationEventStreamOptions = {},
): void {
  const enabled = typeof options === 'boolean' ? options : options.enabled ?? true;
  const eventsPath = typeof options === 'boolean'
    ? `${DEFAULT_NOTIFICATION_BASE_PATH}/events`
    : options.eventsPath ?? `${DEFAULT_NOTIFICATION_BASE_PATH}/events`;
  const onRefresh = typeof options === 'boolean' ? undefined : options.onRefresh;
  const onNotification = typeof options === 'boolean' ? undefined : options.onNotification;
  const onDomainEvent = typeof options === 'boolean' ? undefined : options.onDomainEvent;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const subscriber: NotificationStreamSubscriber = {
      onRefresh,
      onNotification,
      onDomainEvent,
    };
    const connection = getNotificationStreamConnection(sourceApp, eventsPath);
    connection.subscribers.add(subscriber);

    return () => {
      releaseNotificationStreamConnection(sourceApp, eventsPath, subscriber);
    };
  }, [enabled, eventsPath, onDomainEvent, onNotification, onRefresh, sourceApp]);
}
