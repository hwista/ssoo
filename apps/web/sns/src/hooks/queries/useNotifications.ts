import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CommonNotificationItem,
  CommonNotificationListResult,
  CommonNotificationMarkAllReadResult,
  CommonNotificationUnreadCountResult,
} from '@ssoo/types/common';
import { createCommonNotificationApi, type CommonNotificationApiResult } from '@ssoo/web-auth';

const commonNotificationApi = createCommonNotificationApi();

const notifKeys = {
  all: ['sns', 'notifications'] as const,
  unread: () => [...notifKeys.all, 'unread'] as const,
};

async function unwrap<T>(promise: Promise<CommonNotificationApiResult<T>>, fallbackMessage: string): Promise<T> {
  const response = await promise;
  if (!response.success || response.data === undefined) {
    throw new Error(response.error || response.message || fallbackMessage);
  }
  return response.data;
}

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: [...notifKeys.all, page],
    queryFn: () => unwrap<CommonNotificationListResult>(
      commonNotificationApi.list({ page }),
      '알림 목록을 불러오지 못했습니다.',
    ),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notifKeys.unread(),
    queryFn: () => unwrap<CommonNotificationUnreadCountResult>(
      commonNotificationApi.unreadCount(),
      '읽지 않은 알림 수를 불러오지 못했습니다.',
    ),
    refetchInterval: 30000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<CommonNotificationItem>(
      commonNotificationApi.markAsRead(id),
      '알림 읽음 처리에 실패했습니다.',
    ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: notifKeys.all }); },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<CommonNotificationMarkAllReadResult>(
      commonNotificationApi.markAllAsRead(),
      '알림 전체 읽음 처리에 실패했습니다.',
    ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: notifKeys.all }); },
  });
}
