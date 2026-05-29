import type {
  CommonNotificationListQuery,
  CommonNotificationListResult,
  CommonNotificationMarkAllReadResult,
  CommonNotificationUnreadCountResult,
  CommonNotificationItem,
  CommonNotificationSourceApp,
} from '@ssoo/types/common';
import { get, put } from './core';

function buildQueryString(query: CommonNotificationListQuery = {}) {
  const params = new URLSearchParams();
  params.set('sourceApp', query.sourceApp ?? 'dms');
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.unreadOnly) params.set('unreadOnly', 'true');
  if (query.readOnly) params.set('readOnly', 'true');
  if (query.notificationType?.trim()) params.set('notificationType', query.notificationType.trim());

  return `?${params.toString()}`;
}

function buildSourceQuery(sourceApp: CommonNotificationSourceApp = 'dms') {
  return `?sourceApp=${encodeURIComponent(sourceApp)}`;
}

export const notificationApi = {
  list: (query: CommonNotificationListQuery = {}) => (
    get<CommonNotificationListResult>(`/api/notifications${buildQueryString(query)}`)
  ),
  unreadCount: (sourceApp: CommonNotificationSourceApp = 'dms') => (
    get<CommonNotificationUnreadCountResult>(`/api/notifications/unread-count${buildSourceQuery(sourceApp)}`)
  ),
  markAsRead: (notificationId: string) => (
    put<CommonNotificationItem>(`/api/notifications/${encodeURIComponent(notificationId)}/read`)
  ),
  markAsUnread: (notificationId: string) => (
    put<CommonNotificationItem>(`/api/notifications/${encodeURIComponent(notificationId)}/unread`)
  ),
  markAllAsRead: (sourceApp: CommonNotificationSourceApp = 'dms') => (
    put<CommonNotificationMarkAllReadResult>(`/api/notifications/read-all${buildSourceQuery(sourceApp)}`)
  ),
  markByReferencePathAsRead: (path: string, sourceApp: CommonNotificationSourceApp = 'dms') => (
    put<CommonNotificationMarkAllReadResult>('/api/notifications/read-by-reference', { path, sourceApp })
  ),
};
