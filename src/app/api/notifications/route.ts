/**
 * 알림 API
 * @description 얇은 라우팅 레이어 - 핸들러로 위임
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getNotifications, 
  handleNotificationAction, 
  removeNotification 
} from '@/server/handlers/notifications.handler';

// 알림 목록 조회 / 통계 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await getNotifications({
    userId: searchParams.get('userId') || undefined,
    action: searchParams.get('action') || undefined,
    notificationId: searchParams.get('notificationId') || undefined,
    channel: searchParams.get('channel') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
    unreadOnly: searchParams.get('unreadOnly') || undefined,
    types: searchParams.get('types') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 알림 생성 / 액션 수행
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = await handleNotificationAction(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 알림 삭제 (DELETE 메서드)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await removeNotification({
    notificationId: searchParams.get('notificationId') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
