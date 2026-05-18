'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CommonNotificationListQuery,
  CommonNotificationListResult,
  CommonNotificationMarkAllReadResult,
  CommonNotificationUnreadCountResult,
  CommonNotificationItem,
} from '@ssoo/types/common';
import { notificationApi } from '@/lib/api/notifications';
import { getErrorMessage } from '@/lib/api/core';

export const notificationKeys = {
  all: ['dms-notifications'] as const,
  list: (query: CommonNotificationListQuery = {}) => [
    ...notificationKeys.all,
    'list',
    query.sourceApp ?? 'dms',
    query.page ?? 1,
    query.pageSize ?? 20,
    query.unreadOnly ? 'unread' : 'all',
    query.notificationType ?? '',
  ] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count', 'dms'] as const,
};

interface NotificationQueryOptions {
  enabled?: boolean;
}

async function unwrap<T>(promise: Promise<{ success: boolean; data?: T; error?: string; message?: string }>): Promise<T> {
  const response = await promise;
  if (!response.success || response.data === undefined) {
    throw new Error(getErrorMessage(response));
  }
  return response.data;
}

async function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useNotificationsQuery(
  query: CommonNotificationListQuery = { sourceApp: 'dms', page: 1, pageSize: 20 },
  options: NotificationQueryOptions = {},
) {
  return useQuery({
    queryKey: notificationKeys.list(query),
    queryFn: () => unwrap<CommonNotificationListResult>(notificationApi.list(query)),
    enabled: options.enabled ?? true,
  });
}

export function useNotificationUnreadCountQuery(options: NotificationQueryOptions = {}) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => unwrap<CommonNotificationUnreadCountResult>(notificationApi.unreadCount('dms')),
    enabled: options.enabled ?? true,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => (
      unwrap<CommonNotificationItem>(notificationApi.markAsRead(notificationId))
    ),
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient);
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => unwrap<CommonNotificationMarkAllReadResult>(
      notificationApi.markAllAsRead('dms'),
    ),
    onSuccess: async () => {
      await invalidateNotificationQueries(queryClient);
    },
  });
}
