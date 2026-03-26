import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface NotificationItem {
  id: string;
  actorUserId: string;
  notificationType: string;
  referenceType: string;
  referenceId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actor?: {
    userName: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export const notificationsApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<ApiResponse<{ items: NotificationItem[]; total: number }>>(
      '/chs/notifications',
      { params }
    ),

  markRead: (id: string) =>
    apiClient.put<ApiResponse<void>>(`/chs/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.put<ApiResponse<void>>('/chs/notifications/read-all'),

  unreadCount: () =>
    apiClient.get<ApiResponse<{ count: number }>>(
      '/chs/notifications/unread-count'
    ),
};
