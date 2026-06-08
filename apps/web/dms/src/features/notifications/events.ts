'use client';

import { useCallback } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCommonNotificationEventStream } from '@ssoo/web-auth';
import type {
  CommonNotificationItem,
  CommonNotificationSourceApp,
  CommonNotificationStreamEvent,
} from '@ssoo/types/common';
import { notificationKeys } from './queries';

export interface UseNotificationEventStreamOptions {
  enabled?: boolean;
  onNotification?: (
    notification: CommonNotificationItem,
    event: CommonNotificationStreamEvent,
  ) => void;
  onDomainEvent?: (event: CommonNotificationStreamEvent) => void;
}

interface NotificationStreamSubscriber {
  queryClient: QueryClient;
  onNotification?: (
    notification: CommonNotificationItem,
    event: CommonNotificationStreamEvent,
  ) => void;
  onDomainEvent?: (event: CommonNotificationStreamEvent) => void;
}

function refreshNotifications(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useNotificationEventStream(
  sourceApp: CommonNotificationSourceApp = 'dms',
  options: boolean | UseNotificationEventStreamOptions = {},
) {
  const queryClient = useQueryClient();
  const enabled = typeof options === 'boolean' ? options : options.enabled ?? true;
  const onNotification = typeof options === 'boolean' ? undefined : options.onNotification;
  const onDomainEvent = typeof options === 'boolean' ? undefined : options.onDomainEvent;
  const handleRefresh = useCallback(() => {
    refreshNotifications(queryClient);
  }, [queryClient]);

  const subscriber: NotificationStreamSubscriber = {
    queryClient,
    onNotification,
    onDomainEvent,
  };

  useCommonNotificationEventStream(sourceApp, {
    enabled,
    onRefresh: handleRefresh,
    onNotification: subscriber.onNotification,
    onDomainEvent: subscriber.onDomainEvent,
  });
}
