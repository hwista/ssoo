'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  'notification-archived',
  'notifications-read-all',
]);

export interface UseNotificationEventStreamOptions {
  enabled?: boolean;
  onNotification?: (
    notification: CommonNotificationItem,
    event: CommonNotificationStreamEvent,
  ) => void;
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

export function useNotificationEventStream(
  sourceApp: CommonNotificationSourceApp = 'dms',
  options: boolean | UseNotificationEventStreamOptions = {},
) {
  const queryClient = useQueryClient();
  const enabled = typeof options === 'boolean' ? options : options.enabled ?? true;
  const onNotification = typeof options === 'boolean' ? undefined : options.onNotification;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams({ sourceApp });
    const eventSource = new EventSource(`/api/notifications/events?${params.toString()}`, {
      withCredentials: true,
    });

    const refreshNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    const handleRefreshEvent: EventListener = (event) => {
      const payload = parseNotificationStreamEvent(event);
      if (!payload || !REFRESH_EVENT_TYPES.has(payload.type)) {
        return;
      }
      if (payload.sourceApp && payload.sourceApp !== sourceApp) {
        return;
      }
      refreshNotifications();
      if (payload.type === 'notification' && payload.notification) {
        onNotification?.(payload.notification, payload);
      }
    };

    eventSource.addEventListener('connected', handleRefreshEvent);
    eventSource.addEventListener('notification', handleRefreshEvent);
    eventSource.addEventListener('notification-read', handleRefreshEvent);
    eventSource.addEventListener('notification-archived', handleRefreshEvent);
    eventSource.addEventListener('notifications-read-all', handleRefreshEvent);

    return () => {
      eventSource.removeEventListener('connected', handleRefreshEvent);
      eventSource.removeEventListener('notification', handleRefreshEvent);
      eventSource.removeEventListener('notification-read', handleRefreshEvent);
      eventSource.removeEventListener('notification-archived', handleRefreshEvent);
      eventSource.removeEventListener('notifications-read-all', handleRefreshEvent);
      eventSource.close();
    };
  }, [enabled, onNotification, queryClient, sourceApp]);
}
