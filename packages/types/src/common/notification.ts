export type CommonNotificationSourceApp =
  | 'system'
  | 'dms'
  | 'cms'
  | 'pms'
  | 'admin';

export type CommonNotificationSeverity =
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type CommonNotificationActionType =
  | 'none'
  | 'open-dms-document'
  | 'focus-dms-access-request'
  | 'retry-dms-publish'
  | 'open-dms-settings-section'
  | 'open-cms-reference';

export type CommonNotificationJsonValue =
  | string
  | number
  | boolean
  | null
  | CommonNotificationJsonValue[]
  | { [key: string]: CommonNotificationJsonValue };

export interface CommonNotificationAction {
  type: CommonNotificationActionType;
  label?: string;
  payload?: Record<string, CommonNotificationJsonValue>;
}

export interface CommonNotificationReference {
  type?: string;
  id?: string;
  path?: string;
}

export interface CommonNotificationItem {
  id: string;
  recipientUserId: string;
  actorUserId?: string;
  sourceApp: CommonNotificationSourceApp;
  notificationType: string;
  severity: CommonNotificationSeverity;
  title: string;
  message?: string;
  reference?: CommonNotificationReference;
  action?: CommonNotificationAction;
  dedupeKey?: string;
  isRead: boolean;
  readAt?: string;
  archivedAt?: string;
  createdAt: string;
}

export interface CommonNotificationListQuery {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  sourceApp?: CommonNotificationSourceApp;
  notificationType?: string;
}

export interface CommonNotificationListResult {
  items: CommonNotificationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CommonNotificationUnreadCountResult {
  count: number;
}

export interface CommonNotificationMarkAllReadResult {
  count: number;
}

export interface CommonNotificationArchiveResult {
  count: number;
}

export type CommonNotificationStreamEventType =
  | 'connected'
  | 'heartbeat'
  | 'notification'
  | 'notification-read'
  | 'notification-archived'
  | 'notifications-read-all';

export interface CommonNotificationStreamEvent {
  type: CommonNotificationStreamEventType;
  sourceApp?: CommonNotificationSourceApp;
  notification?: CommonNotificationItem;
  notificationId?: string;
  readCount?: number;
  archivedCount?: number;
  emittedAt: string;
}
