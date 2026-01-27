/**
 * 알림 핸들러
 * @description 알림 관리 (조회, 생성, 읽음처리, 설정)
 */

import {
  createNotification,
  getNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserPreferences,
  updateUserPreferences,
  getNotificationStats,
  sendTestEmail,
  sendTestTeamsMessage,
  validateEmailConfig,
  validateTeamsConfig,
  CreateNotificationInput,
  NotificationFilter
} from '@/lib/notifications';

// ============================================================================
// Types
// ============================================================================

export type HandlerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  [key: string]: unknown;
}

interface NotificationStats {
  total: number;
  unread: number;
  [key: string]: unknown;
}

interface NotificationsListResponse {
  notifications: Notification[];
  total: number;
  unread: number;
}

interface NotificationResponse {
  notification: Notification;
}

interface StatsResponse {
  stats: NotificationStats;
}

interface PreferencesResponse {
  preferences: unknown;
}

interface ConfigValidationResponse {
  valid: boolean;
  message?: string;
  [key: string]: unknown;
}

interface ActionResponse {
  success?: boolean;
  count?: number;
  message: string;
  notification?: unknown;
  preferences?: unknown;
}

// ============================================================================
// GET Handler - 알림 목록 조회 / 통계 조회
// ============================================================================

export async function getNotifications(params: {
  userId?: string;
  action?: string;
  notificationId?: string;
  channel?: string;
  limit?: string;
  offset?: string;
  unreadOnly?: string;
  types?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { userId, action, notificationId, channel, limit, offset, unreadOnly, types } = params;

    if (!userId && action !== 'validateConfig') {
      return {
        success: false,
        error: '사용자 ID가 필요해요',
        status: 400
      };
    }

    // 설정 검증
    if (action === 'validateConfig') {
      if (channel === 'email') {
        const result = validateEmailConfig();
        return {
          success: true,
          data: result
        };
      }
      if (channel === 'teams') {
        const result = validateTeamsConfig();
        return {
          success: true,
          data: result
        };
      }
      return {
        success: false,
        error: '채널을 지정해주세요 (email 또는 teams)',
        status: 400
      };
    }

    // 특정 알림 조회
    if (notificationId) {
      const notification = getNotification(notificationId);
      if (!notification) {
        return {
          success: false,
          error: '알림을 찾을 수 없어요',
          status: 404
        };
      }
      return {
        success: true,
        data: { notification }
      };
    }

    // 통계 조회
    if (action === 'stats') {
      const stats = getNotificationStats(userId!);
      return {
        success: true,
        data: { stats }
      };
    }

    // 설정 조회
    if (action === 'preferences') {
      const preferences = getUserPreferences(userId!);
      return {
        success: true,
        data: { preferences }
      };
    }

    // 알림 목록 조회
    const filter: NotificationFilter = {
      userId: userId!,
      limit: parseInt(limit || '50'),
      offset: parseInt(offset || '0'),
      unreadOnly: unreadOnly === 'true'
    };

    if (types) {
      filter.types = types.split(',') as NotificationFilter['types'];
    }

    const notifications = getUserNotifications(userId!, filter);
    const stats = getNotificationStats(userId!);

    return {
      success: true,
      data: {
        notifications,
        total: stats.total,
        unread: stats.unread
      }
    };

  } catch (error) {
    console.error('알림 조회 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알림 조회 중 오류가 발생했어요',
      status: 500
    };
  }
}

// ============================================================================
// POST Handler - 알림 생성 / 액션 수행
// ============================================================================

type NotificationAction = 'create' | 'markAsRead' | 'markAllAsRead' | 'delete' | 'updatePreferences' | 'testEmail' | 'testTeams';

export async function handleNotificationAction(body: {
  action: NotificationAction;
  userId?: string;
  notificationId?: string;
  email?: string;
  webhookUrl?: string;
  preferences?: unknown;
  type?: string;
  title?: string;
  message?: string;
  priority?: string;
  channels?: string[];
  recipientId?: string;
  recipientEmail?: string;
  senderId?: string;
  senderName?: string;
  resourceType?: string;
  resourceId?: string;
  resourcePath?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: unknown;
}): Promise<HandlerResult<ActionResponse>> {
  try {
    const { action } = body;

    switch (action) {
      // 알림 생성
      case 'create': {
        const input = {
          type: body.type,
          title: body.title,
          message: body.message,
          priority: body.priority,
          channels: body.channels,
          recipientId: body.recipientId,
          recipientEmail: body.recipientEmail,
          senderId: body.senderId,
          senderName: body.senderName,
          resourceType: body.resourceType,
          resourceId: body.resourceId,
          resourcePath: body.resourcePath,
          actionUrl: body.actionUrl,
          actionLabel: body.actionLabel,
          metadata: body.metadata as Record<string, unknown> | undefined
        } as CreateNotificationInput;

        if (!input.recipientId || !input.type || !input.title || !input.message) {
          return {
            success: false,
            error: '필수 정보가 누락되었어요 (recipientId, type, title, message)',
            status: 400
          };
        }

        const notification = await createNotification(input);

        return {
          success: true,
          data: {
            message: '알림이 생성되었어요',
            notification
          }
        };
      }

      // 알림 읽음 처리
      case 'markAsRead': {
        const { notificationId } = body;

        if (!notificationId) {
          return {
            success: false,
            error: '알림 ID가 필요해요',
            status: 400
          };
        }

        const readSuccess = markAsRead(notificationId);

        return {
          success: true,
          data: {
            success: readSuccess,
            message: readSuccess ? '읽음 처리했어요' : '알림을 찾을 수 없어요'
          }
        };
      }

      // 모든 알림 읽음 처리
      case 'markAllAsRead': {
        const { userId } = body;

        if (!userId) {
          return {
            success: false,
            error: '사용자 ID가 필요해요',
            status: 400
          };
        }

        const count = markAllAsRead(userId);

        return {
          success: true,
          data: {
            success: true,
            count,
            message: `${count}개의 알림을 읽음 처리했어요`
          }
        };
      }

      // 알림 삭제
      case 'delete': {
        const { notificationId } = body;

        if (!notificationId) {
          return {
            success: false,
            error: '알림 ID가 필요해요',
            status: 400
          };
        }

        const deleteSuccess = deleteNotification(notificationId);

        return {
          success: true,
          data: {
            success: deleteSuccess,
            message: deleteSuccess ? '알림을 삭제했어요' : '알림을 찾을 수 없어요'
          }
        };
      }

      // 설정 업데이트
      case 'updatePreferences': {
        const { userId, preferences } = body;

        if (!userId) {
          return {
            success: false,
            error: '사용자 ID가 필요해요',
            status: 400
          };
        }

        const updated = updateUserPreferences(userId, preferences as Parameters<typeof updateUserPreferences>[1]);

        return {
          success: true,
          data: {
            success: true,
            preferences: updated,
            message: '설정이 업데이트되었어요'
          }
        };
      }

      // 테스트 이메일 전송
      case 'testEmail': {
        const { email } = body;

        if (!email) {
          return {
            success: false,
            error: '이메일 주소가 필요해요',
            status: 400
          };
        }

        const result = await sendTestEmail(email);

        return {
          success: true,
          data: {
            success: result.success,
            message: result.success ? '테스트 이메일을 전송했어요' : (result.error || '전송 실패')
          }
        };
      }

      // 테스트 Teams 메시지 전송
      case 'testTeams': {
        const { webhookUrl } = body;

        const result = await sendTestTeamsMessage(
          webhookUrl ? { webhookUrl } : undefined
        );

        return {
          success: true,
          data: {
            success: result.success,
            message: result.success ? 'Teams 테스트 메시지를 전송했어요' : (result.error || '전송 실패')
          }
        };
      }

      default:
        return {
          success: false,
          error: '알 수 없는 액션이에요',
          status: 400
        };
    }

  } catch (error) {
    console.error('알림 작업 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알림 작업 중 오류가 발생했어요',
      status: 500
    };
  }
}

// ============================================================================
// DELETE Handler - 알림 삭제
// ============================================================================

export async function removeNotification(params: {
  notificationId?: string;
}): Promise<HandlerResult<{ message: string }>> {
  try {
    const { notificationId } = params;

    if (!notificationId) {
      return {
        success: false,
        error: '알림 ID가 필요해요',
        status: 400
      };
    }

    const success = deleteNotification(notificationId);

    return {
      success: true,
      data: {
        message: success ? '알림을 삭제했어요' : '알림을 찾을 수 없어요'
      }
    };

  } catch (error) {
    console.error('알림 삭제 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알림 삭제 중 오류가 발생했어요',
      status: 500
    };
  }
}
