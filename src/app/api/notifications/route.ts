import { NextRequest, NextResponse } from 'next/server';
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

// 알림 목록 조회 / 통계 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const notificationId = searchParams.get('notificationId');

    if (!userId && action !== 'validateConfig') {
      return NextResponse.json(
        { error: '사용자 ID가 필요해요' },
        { status: 400 }
      );
    }

    // 설정 검증
    if (action === 'validateConfig') {
      const channel = searchParams.get('channel');
      if (channel === 'email') {
        const result = validateEmailConfig();
        return NextResponse.json({ success: true, ...result });
      }
      if (channel === 'teams') {
        const result = validateTeamsConfig();
        return NextResponse.json({ success: true, ...result });
      }
      return NextResponse.json(
        { error: '채널을 지정해주세요 (email 또는 teams)' },
        { status: 400 }
      );
    }

    // 특정 알림 조회
    if (notificationId) {
      const notification = getNotification(notificationId);
      if (!notification) {
        return NextResponse.json(
          { error: '알림을 찾을 수 없어요' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, notification });
    }

    // 통계 조회
    if (action === 'stats') {
      const stats = getNotificationStats(userId!);
      return NextResponse.json({ success: true, stats });
    }

    // 설정 조회
    if (action === 'preferences') {
      const preferences = getUserPreferences(userId!);
      return NextResponse.json({ success: true, preferences });
    }

    // 알림 목록 조회
    const filter: NotificationFilter = {
      userId: userId!,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      unreadOnly: searchParams.get('unreadOnly') === 'true'
    };

    const types = searchParams.get('types');
    if (types) {
      filter.types = types.split(',') as NotificationFilter['types'];
    }

    const notifications = getUserNotifications(userId!, filter);
    const stats = getNotificationStats(userId!);

    return NextResponse.json({
      success: true,
      notifications,
      total: stats.total,
      unread: stats.unread
    });

  } catch (error) {
    console.error('알림 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알림 조회 중 오류가 발생했어요' },
      { status: 500 }
    );
  }
}

// 알림 생성 / 액션 수행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      // 알림 생성
      case 'create': {
        const input: CreateNotificationInput = {
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
          metadata: body.metadata
        };

        if (!input.recipientId || !input.type || !input.title || !input.message) {
          return NextResponse.json(
            { error: '필수 정보가 누락되었어요 (recipientId, type, title, message)' },
            { status: 400 }
          );
        }

        const notification = await createNotification(input);

        return NextResponse.json({
          success: true,
          notification
        });
      }

      // 알림 읽음 처리
      case 'markAsRead': {
        const { notificationId } = body;

        if (!notificationId) {
          return NextResponse.json(
            { error: '알림 ID가 필요해요' },
            { status: 400 }
          );
        }

        const success = markAsRead(notificationId);

        return NextResponse.json({
          success,
          message: success ? '읽음 처리했어요' : '알림을 찾을 수 없어요'
        });
      }

      // 모든 알림 읽음 처리
      case 'markAllAsRead': {
        const { userId } = body;

        if (!userId) {
          return NextResponse.json(
            { error: '사용자 ID가 필요해요' },
            { status: 400 }
          );
        }

        const count = markAllAsRead(userId);

        return NextResponse.json({
          success: true,
          count,
          message: `${count}개의 알림을 읽음 처리했어요`
        });
      }

      // 알림 삭제
      case 'delete': {
        const { notificationId } = body;

        if (!notificationId) {
          return NextResponse.json(
            { error: '알림 ID가 필요해요' },
            { status: 400 }
          );
        }

        const success = deleteNotification(notificationId);

        return NextResponse.json({
          success,
          message: success ? '알림을 삭제했어요' : '알림을 찾을 수 없어요'
        });
      }

      // 설정 업데이트
      case 'updatePreferences': {
        const { userId, preferences } = body;

        if (!userId) {
          return NextResponse.json(
            { error: '사용자 ID가 필요해요' },
            { status: 400 }
          );
        }

        const updated = updateUserPreferences(userId, preferences);

        return NextResponse.json({
          success: true,
          preferences: updated
        });
      }

      // 테스트 이메일 전송
      case 'testEmail': {
        const { email } = body;

        if (!email) {
          return NextResponse.json(
            { error: '이메일 주소가 필요해요' },
            { status: 400 }
          );
        }

        const result = await sendTestEmail(email);

        return NextResponse.json({
          success: result.success,
          message: result.success ? '테스트 이메일을 전송했어요' : result.error
        });
      }

      // 테스트 Teams 메시지 전송
      case 'testTeams': {
        const { webhookUrl } = body;

        const result = await sendTestTeamsMessage(
          webhookUrl ? { webhookUrl } : undefined
        );

        return NextResponse.json({
          success: result.success,
          message: result.success ? 'Teams 테스트 메시지를 전송했어요' : result.error
        });
      }

      default:
        return NextResponse.json(
          { error: '알 수 없는 액션이에요' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('알림 작업 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알림 작업 중 오류가 발생했어요' },
      { status: 500 }
    );
  }
}

// 알림 삭제 (DELETE 메서드)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');

    if (!notificationId) {
      return NextResponse.json(
        { error: '알림 ID가 필요해요' },
        { status: 400 }
      );
    }

    const success = deleteNotification(notificationId);

    return NextResponse.json({
      success,
      message: success ? '알림을 삭제했어요' : '알림을 찾을 수 없어요'
    });

  } catch (error) {
    console.error('알림 삭제 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알림 삭제 중 오류가 발생했어요' },
      { status: 500 }
    );
  }
}
