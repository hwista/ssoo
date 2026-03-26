export type NotificationType =
  | 'like'
  | 'comment'
  | 'mention'
  | 'follow'
  | 'endorsement'
  | 'post_in_board';

export interface Notification {
  id: string;
  recipientUserId: string;
  actorUserId: string;
  notificationType: NotificationType;
  referenceType: string;
  referenceId: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
