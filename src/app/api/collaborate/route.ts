import { NextRequest, NextResponse } from 'next/server';
import {
  joinSession,
  leaveSession,
  updateCursor,
  applyOperation,
  getSessionState,
  getSessionContent,
  syncContent,
  getActiveSessions,
  OperationType
} from '@/lib/collaboration';

// 세션 상태 조회 / 활성 세션 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    const sinceVersion = searchParams.get('sinceVersion');
    const listActive = searchParams.get('listActive');

    // 활성 세션 목록
    if (listActive === 'true') {
      const sessions = getActiveSessions();
      return NextResponse.json({
        success: true,
        sessions
      });
    }

    if (!filePath) {
      return NextResponse.json(
        { error: '파일 경로가 필요합니다' },
        { status: 400 }
      );
    }

    // 세션 상태 조회
    const state = getSessionState(
      filePath,
      sinceVersion ? parseInt(sinceVersion) : undefined
    );

    if (!state) {
      return NextResponse.json({
        success: true,
        active: false,
        message: '활성 세션이 없습니다'
      });
    }

    return NextResponse.json({
      success: true,
      active: true,
      ...state
    });

  } catch (error) {
    console.error('협업 세션 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 세션 참가 / 작업 수행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, filePath, userId, userName, content } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: '파일 경로가 필요합니다' },
        { status: 400 }
      );
    }

    switch (action) {
      // 세션 참가
      case 'join': {
        if (!userId || !userName) {
          return NextResponse.json(
            { error: '사용자 정보가 필요합니다' },
            { status: 400 }
          );
        }

        const { session, userColor } = joinSession(filePath, userId, userName, content || '');

        return NextResponse.json({
          success: true,
          message: '세션에 참가했습니다',
          sessionId: session.id,
          userColor,
          version: session.version,
          participantCount: session.participants.size
        });
      }

      // 세션 나가기
      case 'leave': {
        if (!userId) {
          return NextResponse.json(
            { error: '사용자 ID가 필요합니다' },
            { status: 400 }
          );
        }

        const success = leaveSession(filePath, userId);

        return NextResponse.json({
          success,
          message: success ? '세션을 나갔습니다' : '세션을 찾을 수 없습니다'
        });
      }

      // 커서 위치 업데이트
      case 'updateCursor': {
        const { position, selection } = body;

        if (!userId || position === undefined) {
          return NextResponse.json(
            { error: '사용자 ID와 커서 위치가 필요합니다' },
            { status: 400 }
          );
        }

        const success = updateCursor(filePath, userId, position, selection);

        return NextResponse.json({
          success,
          message: success ? '커서가 업데이트되었습니다' : '세션을 찾을 수 없습니다'
        });
      }

      // 편집 작업
      case 'operation': {
        const { type, position, length } = body;

        if (!userId || !type || position === undefined) {
          return NextResponse.json(
            { error: '필수 정보가 누락되었습니다' },
            { status: 400 }
          );
        }

        const result = applyOperation(
          filePath,
          userId,
          type as OperationType,
          position,
          content,
          length
        );

        if (!result.success) {
          return NextResponse.json(
            { error: '세션을 찾을 수 없습니다' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          operation: result.operation,
          version: result.newVersion
        });
      }

      // 전체 동기화
      case 'sync': {
        if (!userId || content === undefined) {
          return NextResponse.json(
            { error: '사용자 ID와 콘텐츠가 필요합니다' },
            { status: 400 }
          );
        }

        const result = syncContent(filePath, content, userId);

        return NextResponse.json({
          success: result.success,
          version: result.version,
          message: result.success ? '동기화 완료' : '세션을 찾을 수 없습니다'
        });
      }

      // 콘텐츠 조회
      case 'getContent': {
        const result = getSessionContent(filePath);

        if (!result) {
          return NextResponse.json(
            { error: '세션을 찾을 수 없습니다' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          ...result
        });
      }

      default:
        return NextResponse.json(
          { error: '알 수 없는 액션입니다' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('협업 작업 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '작업 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
