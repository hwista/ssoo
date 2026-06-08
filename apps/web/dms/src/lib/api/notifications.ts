import type {
  CommonNotificationSourceApp,
} from '@ssoo/types/common';
import { createCommonNotificationApi } from '@ssoo/web-auth';

const commonNotificationApi = createCommonNotificationApi({ defaultSourceApp: 'dms' });

export const notificationApi = {
  list: commonNotificationApi.list,
  unreadCount: (sourceApp: CommonNotificationSourceApp = 'dms') => (
    commonNotificationApi.unreadCount(sourceApp)
  ),
  markAsRead: (notificationId: string) => (
    commonNotificationApi.markAsRead(notificationId)
  ),
  markAsUnread: (notificationId: string) => (
    commonNotificationApi.markAsUnread(notificationId)
  ),
  markAllAsRead: (sourceApp: CommonNotificationSourceApp = 'dms') => (
    commonNotificationApi.markAllAsRead(sourceApp)
  ),
  markByReferencePathAsRead: (path: string, sourceApp: CommonNotificationSourceApp = 'dms') => (
    commonNotificationApi.markByReferencePathAsRead(path, sourceApp)
  ),
};
