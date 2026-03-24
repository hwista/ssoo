import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/endpoints/notifications';

const notifKeys = {
  all: ['chs', 'notifications'] as const,
  unread: () => [...notifKeys.all, 'unread'] as const,
};

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: [...notifKeys.all, page],
    queryFn: () => notificationsApi.list({ page }),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notifKeys.unread(),
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all });
      qc.invalidateQueries({ queryKey: notifKeys.unread() });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all });
      qc.invalidateQueries({ queryKey: notifKeys.unread() });
    },
  });
}
