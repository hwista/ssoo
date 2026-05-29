'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  CommonNotificationItem,
  CommonNotificationSourceApp,
  CommonNotificationStreamEvent,
  CommonNotificationStreamEventType,
} from '@ssoo/types/common';
import { notificationKeys } from './queries';

const REFRESH_EVENT_TYPES = new Set<CommonNotificationStreamEventType>([
  'connected',
  'notification',
  'notification-read',
  'notification-unread',
  'notification-archived',
  'notifications-read-all',
]);

export interface UseNotificationEventStreamOptions {
  enabled?: boolean;
  onNotification?: (
    notification: CommonNotificationItem,
    event: CommonNotificationStreamEvent,
  ) => void;
  onDomainEvent?: (event: CommonNotificationStreamEvent) => void;
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
      || value.sourceApp === 'cms'
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
  } catch (error) {
    console.warn('알림 이벤트를 해석하지 못했습니다.', error);
    return null;
  }
}

interface NotificationStreamSubscriber {
  queryClient: QueryClient;
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

const notificationStreamConnections = new Map<CommonNotificationSourceApp, NotificationStreamConnection>();

function refreshNotifications(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

function shouldHandleEvent(sourceApp: CommonNotificationSourceApp, payload: CommonNotificationStreamEvent): boolean {
  return !payload.sourceApp || payload.sourceApp === sourceApp;
}

function createNotificationStreamConnection(sourceApp: CommonNotificationSourceApp): NotificationStreamConnection {
  const params = new URLSearchParams({ sourceApp });
  const eventSource = new EventSource(`/api/notifications/events?${params.toString()}`, {
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
      refreshNotifications(subscriber.queryClient);
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

  notificationStreamConnections.set(sourceApp, connection);
  return connection;
}

function getNotificationStreamConnection(sourceApp: CommonNotificationSourceApp): NotificationStreamConnection {
  return notificationStreamConnections.get(sourceApp) ?? createNotificationStreamConnection(sourceApp);
}

function releaseNotificationStreamConnection(sourceApp: CommonNotificationSourceApp, subscriber: NotificationStreamSubscriber): void {
  const connection = notificationStreamConnections.get(sourceApp);
  if (!connection) return;
  connection.subscribers.delete(subscriber);
  if (connection.subscribers.size > 0) return;
  connection.eventSource.close();
  notificationStreamConnections.delete(sourceApp);
}

export function useNotificationEventStream(
  sourceApp: CommonNotificationSourceApp = 'dms',
  options: boolean | UseNotificationEventStreamOptions = {},
) {
  const queryClient = useQueryClient();
  const enabled = typeof options === 'boolean' ? options : options.enabled ?? true;
  const onNotification = typeof options === 'boolean' ? undefined : options.onNotification;
  const onDomainEvent = typeof options === 'boolean' ? undefined : options.onDomainEvent;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const subscriber: NotificationStreamSubscriber = {
      queryClient,
      onNotification,
      onDomainEvent,
    };
    const connection = getNotificationStreamConnection(sourceApp);
    connection.subscribers.add(subscriber);

    return () => {
      releaseNotificationStreamConnection(sourceApp, subscriber);
    };
  }, [enabled, onDomainEvent, onNotification, queryClient, sourceApp]);
}
