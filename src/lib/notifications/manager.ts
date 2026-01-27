// 알림 관리자 - 알림 생성, 전송, 저장 통합 관리
import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationPreferences,
  NotificationFilter,
  NotificationStats,
  CreateNotificationInput,
  DEFAULT_NOTIFICATION_PREFERENCES
} from './types';
import { sendNotificationEmail, sendDigestEmail } from './email';
import { sendNotificationToTeams, sendDigestToTeams } from './teams';

// 알림 저장소 (메모리 기반, 실제로는 DB 사용)
const notifications = new Map<string, Notification>();
const userNotifications = new Map<string, Set<string>>(); // userId -> Set<notificationId>
const userPreferences = new Map<string, NotificationPreferences>();

// 알림 ID 생성
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 앱 기본 URL
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || '';
}

// 알림 생성
export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const id = generateNotificationId();
  const userPrefs = getUserPreferences(input.recipientId);

  // 사용자 설정에 따른 채널 결정
  const typeConfig = userPrefs.types[input.type];
  const enabledChannels = input.channels || typeConfig?.channels || ['in_app'];
  const filteredChannels = enabledChannels.filter(ch =>
    userPrefs.channels[ch] && typeConfig?.enabled !== false
  );

  const notification: Notification = {
    id,
    type: input.type,
    title: input.title,
    message: input.message,
    priority: input.priority || 'normal',
    status: 'pending',
    channels: filteredChannels,
    recipientId: input.recipientId,
    recipientEmail: input.recipientEmail,
    senderId: input.senderId,
    senderName: input.senderName,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    resourcePath: input.resourcePath,
    actionUrl: input.actionUrl,
    actionLabel: input.actionLabel,
    metadata: input.metadata,
    createdAt: Date.now(),
    expiresAt: input.expiresAt
  };

  // 저장
  notifications.set(id, notification);

  // 사용자별 인덱스 업데이트
  if (!userNotifications.has(input.recipientId)) {
    userNotifications.set(input.recipientId, new Set());
  }
  userNotifications.get(input.recipientId)!.add(id);

  // 알림 전송
  await sendNotification(notification);

  return notification;
}

// 알림 전송
async function sendNotification(notification: Notification): Promise<void> {
  const baseUrl = getBaseUrl();
  const userPrefs = getUserPreferences(notification.recipientId);
  let sentAny = false;

  for (const channel of notification.channels) {
    try {
      switch (channel) {
        case 'in_app':
          // 인앱 알림은 이미 저장됨
          sentAny = true;
          break;

        case 'email':
          if (notification.recipientEmail && userPrefs.email?.address) {
            const emailResult = await sendNotificationEmail(
              notification,
              userPrefs.email.address,
              notification.senderName || '사용자',
              baseUrl
            );
            if (emailResult.success) sentAny = true;
          }
          break;

        case 'teams':
          if (userPrefs.teams?.webhookUrl) {
            const teamsResult = await sendNotificationToTeams(
              notification,
              { webhookUrl: userPrefs.teams.webhookUrl },
              baseUrl
            );
            if (teamsResult.success) sentAny = true;
          }
          break;
      }
    } catch (error) {
      console.error(`알림 전송 오류 (${channel}):`, error);
    }
  }

  // 상태 업데이트
  notification.status = sentAny ? 'sent' : 'failed';
  notification.sentAt = Date.now();
  notifications.set(notification.id, notification);
}

// 알림 조회
export function getNotification(notificationId: string): Notification | null {
  return notifications.get(notificationId) || null;
}

// 사용자 알림 목록 조회
export function getUserNotifications(
  userId: string,
  filter?: NotificationFilter
): Notification[] {
  const userNotifIds = userNotifications.get(userId);
  if (!userNotifIds) return [];

  let result: Notification[] = [];

  for (const id of userNotifIds) {
    const notification = notifications.get(id);
    if (!notification) continue;

    // 필터 적용
    if (filter) {
      if (filter.types && !filter.types.includes(notification.type)) continue;
      if (filter.status && !filter.status.includes(notification.status)) continue;
      if (filter.channels && !filter.channels.some(ch => notification.channels.includes(ch))) continue;
      if (filter.startDate && notification.createdAt < filter.startDate) continue;
      if (filter.endDate && notification.createdAt > filter.endDate) continue;
      if (filter.unreadOnly && notification.readAt) continue;
    }

    // 만료된 알림 제외
    if (notification.expiresAt && notification.expiresAt < Date.now()) continue;

    result.push(notification);
  }

  // 최신순 정렬
  result.sort((a, b) => b.createdAt - a.createdAt);

  // 페이지네이션
  if (filter?.offset) {
    result = result.slice(filter.offset);
  }
  if (filter?.limit) {
    result = result.slice(0, filter.limit);
  }

  return result;
}

// 알림 읽음 처리
export function markAsRead(notificationId: string): boolean {
  const notification = notifications.get(notificationId);
  if (!notification) return false;

  notification.status = 'read';
  notification.readAt = Date.now();
  notifications.set(notificationId, notification);

  return true;
}

// 모든 알림 읽음 처리
export function markAllAsRead(userId: string): number {
  const userNotifIds = userNotifications.get(userId);
  if (!userNotifIds) return 0;

  let count = 0;
  for (const id of userNotifIds) {
    const notification = notifications.get(id);
    if (notification && !notification.readAt) {
      notification.status = 'read';
      notification.readAt = Date.now();
      notifications.set(id, notification);
      count++;
    }
  }

  return count;
}

// 알림 삭제
export function deleteNotification(notificationId: string): boolean {
  const notification = notifications.get(notificationId);
  if (!notification) return false;

  notifications.delete(notificationId);

  const userNotifIds = userNotifications.get(notification.recipientId);
  if (userNotifIds) {
    userNotifIds.delete(notificationId);
  }

  return true;
}

// 사용자 알림 설정 조회
export function getUserPreferences(userId: string): NotificationPreferences {
  const prefs = userPreferences.get(userId);
  if (prefs) return prefs;

  // 기본 설정 반환
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    userId
  };
}

// 사용자 알림 설정 업데이트
export function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, 'userId'>>
): NotificationPreferences {
  const current = getUserPreferences(userId);

  const updated: NotificationPreferences = {
    ...current,
    ...updates,
    userId,
    channels: {
      ...current.channels,
      ...updates.channels
    },
    types: {
      ...current.types,
      ...updates.types
    },
    updatedAt: Date.now()
  };

  userPreferences.set(userId, updated);
  return updated;
}

// 알림 통계 조회
export function getNotificationStats(userId: string): NotificationStats {
  const userNotifList = getUserNotifications(userId);

  const stats: NotificationStats = {
    total: userNotifList.length,
    unread: 0,
    byType: {} as Record<NotificationType, number>,
    byChannel: {} as Record<NotificationChannel, number>
  };

  for (const notification of userNotifList) {
    // 읽지 않은 알림 수
    if (!notification.readAt) {
      stats.unread++;
    }

    // 유형별 통계
    stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;

    // 채널별 통계
    for (const channel of notification.channels) {
      stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
    }
  }

  return stats;
}

// 다이제스트 전송 (일괄 알림)
export async function sendDigest(
  userId: string,
  channel: 'email' | 'teams'
): Promise<boolean> {
  const userPrefs = getUserPreferences(userId);
  const unreadNotifications = getUserNotifications(userId, { unreadOnly: true });

  if (unreadNotifications.length === 0) return true;

  const baseUrl = getBaseUrl();

  try {
    if (channel === 'email' && userPrefs.email?.address) {
      const result = await sendDigestEmail(
        unreadNotifications,
        userPrefs.email.address,
        '사용자',
        baseUrl
      );
      return result.success;
    }

    if (channel === 'teams' && userPrefs.teams?.webhookUrl) {
      const result = await sendDigestToTeams(
        unreadNotifications,
        { webhookUrl: userPrefs.teams.webhookUrl },
        baseUrl
      );
      return result.success;
    }

    return false;
  } catch (error) {
    console.error('다이제스트 전송 오류:', error);
    return false;
  }
}

// 알림 이벤트 헬퍼 함수들

// 문서 변경 알림
export async function notifyDocumentChanged(
  recipientId: string,
  documentPath: string,
  changerName: string,
  changerId: string
): Promise<Notification> {
  return createNotification({
    type: 'document_changed',
    title: '문서가 변경되었어요',
    message: `${changerName}님이 "${documentPath}" 문서를 수정했어요.`,
    recipientId,
    senderId: changerId,
    senderName: changerName,
    resourceType: 'file',
    resourcePath: documentPath,
    actionUrl: `/wiki/${encodeURIComponent(documentPath)}`,
    actionLabel: '문서 보기'
  });
}

// 댓글 알림
export async function notifyCommentAdded(
  recipientId: string,
  documentPath: string,
  commenterName: string,
  commenterId: string,
  commentPreview: string
): Promise<Notification> {
  return createNotification({
    type: 'comment_added',
    title: '새 댓글이 달렸어요',
    message: `${commenterName}님이 "${documentPath}"에 댓글을 남겼어요: "${commentPreview.slice(0, 50)}${commentPreview.length > 50 ? '...' : ''}"`,
    recipientId,
    senderId: commenterId,
    senderName: commenterName,
    resourceType: 'comment',
    resourcePath: documentPath,
    actionUrl: `/wiki/${encodeURIComponent(documentPath)}#comments`,
    actionLabel: '댓글 보기'
  });
}

// 멘션 알림
export async function notifyMention(
  recipientId: string,
  documentPath: string,
  mentionerName: string,
  mentionerId: string,
  context: string
): Promise<Notification> {
  return createNotification({
    type: 'mention',
    title: '멘션되었어요',
    message: `${mentionerName}님이 "${documentPath}"에서 회원님을 멘션했어요: "${context.slice(0, 50)}${context.length > 50 ? '...' : ''}"`,
    recipientId,
    senderId: mentionerId,
    senderName: mentionerName,
    resourceType: 'file',
    resourcePath: documentPath,
    actionUrl: `/wiki/${encodeURIComponent(documentPath)}`,
    actionLabel: '확인하기',
    priority: 'high'
  });
}

// 협업 초대 알림
export async function notifyCollaborationInvite(
  recipientId: string,
  documentPath: string,
  inviterName: string,
  inviterId: string
): Promise<Notification> {
  return createNotification({
    type: 'collaboration_invite',
    title: '협업 초대를 받았어요',
    message: `${inviterName}님이 "${documentPath}" 문서의 공동 편집에 초대했어요.`,
    recipientId,
    senderId: inviterId,
    senderName: inviterName,
    resourceType: 'file',
    resourcePath: documentPath,
    actionUrl: `/wiki/${encodeURIComponent(documentPath)}/edit`,
    actionLabel: '편집 참여하기',
    priority: 'high'
  });
}

// 시스템 알림
export async function notifySystem(
  recipientId: string,
  title: string,
  message: string,
  actionUrl?: string
): Promise<Notification> {
  return createNotification({
    type: 'system',
    title,
    message,
    recipientId,
    actionUrl,
    actionLabel: actionUrl ? '자세히 보기' : undefined
  });
}

// 오래된 알림 정리 (30일 이상)
export function cleanupOldNotifications(daysOld: number = 30): number {
  const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  let count = 0;

  for (const [id, notification] of notifications) {
    if (notification.createdAt < cutoffTime) {
      deleteNotification(id);
      count++;
    }
  }

  return count;
}

// 내보내기: index.ts에서 사용
export {
  notifications,
  userNotifications,
  userPreferences
};
