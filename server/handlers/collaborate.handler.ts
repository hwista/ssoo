/**
 * 협업 세션 핸들러
 * @description 실시간 협업 세션 관리 (참가, 커서, 작업, 동기화)
 */

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

// ============================================================================
// Types
// ============================================================================

export type HandlerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

// GET response types
interface SessionStateResponse {
  active: boolean;
  message?: string;
  filePath?: string;
  version?: number;
  participants?: unknown[];
  operations?: unknown[];
  [key: string]: unknown;
}

interface ActiveSessionsResponse {
  sessions: unknown[];
}

// POST response types
interface JoinSessionResponse {
  message: string;
  sessionId: string;
  userColor: string;
  version: number;
  participantCount: number;
}

interface LeaveSessionResponse {
  success: boolean;
  message: string;
}

interface UpdateCursorResponse {
  success: boolean;
  message: string;
}

interface OperationResponse {
  operation: unknown;
  version: number;
}

interface SyncResponse {
  success: boolean;
  version: number;
  message: string;
}

interface ContentResponse {
  content: string;
  version: number;
}

// ============================================================================
// GET Handler - 세션 상태 조회 / 활성 세션 목록
// ============================================================================

export async function getCollaborationStatus(params: {
  filePath?: string;
  sinceVersion?: string;
  listActive?: string;
}): Promise<HandlerResult<SessionStateResponse | ActiveSessionsResponse>> {
  try {
    const { filePath, sinceVersion, listActive } = params;

    // 활성 세션 목록
    if (listActive === 'true') {
      const sessions = getActiveSessions();
      return {
        success: true,
        data: { sessions }
      };
    }

    if (!filePath) {
      return {
        success: false,
        error: '파일 경로가 필요합니다',
        status: 400
      };
    }

    // 세션 상태 조회
    const state = getSessionState(
      filePath,
      sinceVersion ? parseInt(sinceVersion) : undefined
    );

    if (!state) {
      return {
        success: true,
        data: {
          active: false,
          message: '활성 세션이 없습니다'
        }
      };
    }

    return {
      success: true,
      data: {
        active: true,
        ...state
      }
    };

  } catch (error) {
    console.error('협업 세션 조회 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '조회 중 오류가 발생했습니다',
      status: 500
    };
  }
}

// ============================================================================
// POST Handler - 세션 참가 / 작업 수행
// ============================================================================

type CollaborateAction = 'join' | 'leave' | 'updateCursor' | 'operation' | 'sync' | 'getContent';
type CollaboratePostResult = JoinSessionResponse | LeaveSessionResponse | UpdateCursorResponse | OperationResponse | SyncResponse | ContentResponse;

export async function handleCollaborateAction(body: {
  action: CollaborateAction;
  filePath: string;
  userId?: string;
  userName?: string;
  content?: string;
  position?: number;
  selection?: unknown;
  type?: string;
  length?: number;
}): Promise<HandlerResult<CollaboratePostResult>> {
  try {
    const { action, filePath, userId, userName, content, position, selection, type, length } = body;

    if (!filePath) {
      return {
        success: false,
        error: '파일 경로가 필요합니다',
        status: 400
      };
    }

    switch (action) {
      // 세션 참가
      case 'join': {
        if (!userId || !userName) {
          return {
            success: false,
            error: '사용자 정보가 필요합니다',
            status: 400
          };
        }

        const { session, userColor } = joinSession(filePath, userId, userName, content || '');

        return {
          success: true,
          data: {
            message: '세션에 참가했습니다',
            sessionId: session.id,
            userColor,
            version: session.version,
            participantCount: session.participants.size
          }
        };
      }

      // 세션 나가기
      case 'leave': {
        if (!userId) {
          return {
            success: false,
            error: '사용자 ID가 필요합니다',
            status: 400
          };
        }

        const leaveSuccess = leaveSession(filePath, userId);

        return {
          success: true,
          data: {
            success: leaveSuccess,
            message: leaveSuccess ? '세션을 나갔습니다' : '세션을 찾을 수 없습니다'
          }
        };
      }

      // 커서 위치 업데이트
      case 'updateCursor': {
        if (!userId || position === undefined) {
          return {
            success: false,
            error: '사용자 ID와 커서 위치가 필요합니다',
            status: 400
          };
        }

        const cursorSuccess = updateCursor(filePath, userId, position as number, selection as { start: number; end: number } | undefined);

        return {
          success: true,
          data: {
            success: cursorSuccess,
            message: cursorSuccess ? '커서가 업데이트되었습니다' : '세션을 찾을 수 없습니다'
          }
        };
      }

      // 편집 작업
      case 'operation': {
        if (!userId || !type || position === undefined) {
          return {
            success: false,
            error: '필수 정보가 누락되었습니다',
            status: 400
          };
        }

        const result = applyOperation(
          filePath,
          userId,
          type as OperationType,
          position as number,
          content,
          length as number | undefined
        );

        if (!result.success) {
          return {
            success: false,
            error: '세션을 찾을 수 없습니다',
            status: 404
          };
        }

        return {
          success: true,
          data: {
            operation: result.operation,
            version: result.newVersion ?? 0
          }
        };
      }

      // 전체 동기화
      case 'sync': {
        if (!userId || content === undefined) {
          return {
            success: false,
            error: '사용자 ID와 콘텐츠가 필요합니다',
            status: 400
          };
        }

        const syncResult = syncContent(filePath, content, userId);

        return {
          success: true,
          data: {
            success: syncResult.success,
            version: syncResult.version,
            message: syncResult.success ? '동기화 완료' : '세션을 찾을 수 없습니다'
          }
        };
      }

      // 콘텐츠 조회
      case 'getContent': {
        const contentResult = getSessionContent(filePath);

        if (!contentResult) {
          return {
            success: false,
            error: '세션을 찾을 수 없습니다',
            status: 404
          };
        }

        return {
          success: true,
          data: contentResult
        };
      }

      default:
        return {
          success: false,
          error: '알 수 없는 액션입니다',
          status: 400
        };
    }

  } catch (error) {
    console.error('협업 작업 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '작업 중 오류가 발생했습니다',
      status: 500
    };
  }
}
