// 실시간 공동 편집 시스템

// 사용자 커서/선택 정보
export interface UserCursor {
  userId: string;
  userName: string;
  userColor: string;
  position: number;           // 커서 위치
  selection?: {
    start: number;
    end: number;
  };
  lastUpdate: number;
}

// 편집 작업 타입
export type OperationType = 'insert' | 'delete' | 'replace';

// 편집 작업
export interface Operation {
  id: string;
  userId: string;
  type: OperationType;
  position: number;
  content?: string;           // insert/replace 시
  length?: number;            // delete/replace 시
  timestamp: number;
}

// 협업 세션
export interface CollaborationSession {
  id: string;
  filePath: string;
  createdAt: number;
  lastActivity: number;
  participants: Map<string, UserCursor>;
  operations: Operation[];
  currentContent: string;
  version: number;
}

// 세션 참가자 정보
export interface Participant {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
  isActive: boolean;
  cursor?: UserCursor;
}

// 동기화 상태
export interface SyncState {
  sessionId: string;
  version: number;
  participants: Participant[];
  pendingOperations: Operation[];
}

// 사용자 색상 팔레트
const userColors = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899'
];

// 세션 저장소 (메모리 기반, 실제로는 Redis 등 사용)
const sessions = new Map<string, CollaborationSession>();
const fileToSession = new Map<string, string>();

// 세션 ID 생성
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 작업 ID 생성
function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 사용자 색상 할당
function assignUserColor(session: CollaborationSession): string {
  const usedColors = new Set(
    Array.from(session.participants.values()).map(p => p.userColor)
  );

  for (const color of userColors) {
    if (!usedColors.has(color)) {
      return color;
    }
  }

  // 모든 색상 사용 중이면 랜덤 선택
  return userColors[Math.floor(Math.random() * userColors.length)];
}

// 세션 생성 또는 참가
export function joinSession(
  filePath: string,
  userId: string,
  userName: string,
  initialContent: string
): { session: CollaborationSession; userColor: string } {
  let sessionId = fileToSession.get(filePath);
  let session: CollaborationSession;

  if (sessionId && sessions.has(sessionId)) {
    // 기존 세션 참가
    session = sessions.get(sessionId)!;
  } else {
    // 새 세션 생성
    sessionId = generateSessionId();
    session = {
      id: sessionId,
      filePath,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      participants: new Map(),
      operations: [],
      currentContent: initialContent,
      version: 0
    };
    sessions.set(sessionId, session);
    fileToSession.set(filePath, sessionId);
  }

  // 사용자 추가/업데이트
  const userColor = session.participants.has(userId)
    ? session.participants.get(userId)!.userColor
    : assignUserColor(session);

  session.participants.set(userId, {
    userId,
    userName,
    userColor,
    position: 0,
    lastUpdate: Date.now()
  });

  session.lastActivity = Date.now();

  return { session, userColor };
}

// 세션 나가기
export function leaveSession(filePath: string, userId: string): boolean {
  const sessionId = fileToSession.get(filePath);
  if (!sessionId) return false;

  const session = sessions.get(sessionId);
  if (!session) return false;

  session.participants.delete(userId);

  // 참가자가 없으면 세션 정리 (5분 후)
  if (session.participants.size === 0) {
    setTimeout(() => {
      const currentSession = sessions.get(sessionId);
      if (currentSession && currentSession.participants.size === 0) {
        sessions.delete(sessionId);
        fileToSession.delete(filePath);
      }
    }, 5 * 60 * 1000);
  }

  return true;
}

// 커서 위치 업데이트
export function updateCursor(
  filePath: string,
  userId: string,
  position: number,
  selection?: { start: number; end: number }
): boolean {
  const sessionId = fileToSession.get(filePath);
  if (!sessionId) return false;

  const session = sessions.get(sessionId);
  if (!session) return false;

  const cursor = session.participants.get(userId);
  if (!cursor) return false;

  cursor.position = position;
  cursor.selection = selection;
  cursor.lastUpdate = Date.now();
  session.lastActivity = Date.now();

  return true;
}

// 작업 적용
export function applyOperation(
  filePath: string,
  userId: string,
  type: OperationType,
  position: number,
  content?: string,
  length?: number
): { success: boolean; operation?: Operation; newVersion?: number } {
  const sessionId = fileToSession.get(filePath);
  if (!sessionId) return { success: false };

  const session = sessions.get(sessionId);
  if (!session) return { success: false };

  const operation: Operation = {
    id: generateOperationId(),
    userId,
    type,
    position,
    content,
    length,
    timestamp: Date.now()
  };

  // 작업 적용
  let newContent = session.currentContent;

  switch (type) {
    case 'insert':
      if (content) {
        newContent =
          newContent.slice(0, position) +
          content +
          newContent.slice(position);
      }
      break;

    case 'delete':
      if (length) {
        newContent =
          newContent.slice(0, position) +
          newContent.slice(position + length);
      }
      break;

    case 'replace':
      if (content && length !== undefined) {
        newContent =
          newContent.slice(0, position) +
          content +
          newContent.slice(position + length);
      }
      break;
  }

  session.currentContent = newContent;
  session.operations.push(operation);
  session.version++;
  session.lastActivity = Date.now();

  // 다른 참가자의 커서 위치 조정
  adjustCursors(session, operation);

  // 오래된 작업 정리 (최근 100개만 유지)
  if (session.operations.length > 100) {
    session.operations = session.operations.slice(-100);
  }

  return {
    success: true,
    operation,
    newVersion: session.version
  };
}

// 다른 사용자의 커서 위치 조정
function adjustCursors(session: CollaborationSession, operation: Operation): void {
  const { type, position, content, length } = operation;

  for (const [userId, cursor] of session.participants) {
    if (userId === operation.userId) continue;

    let delta = 0;

    switch (type) {
      case 'insert':
        if (content && cursor.position >= position) {
          delta = content.length;
        }
        break;

      case 'delete':
        if (length && cursor.position >= position) {
          if (cursor.position < position + length) {
            // 커서가 삭제 범위 내에 있으면 삭제 시작 위치로 이동
            cursor.position = position;
            continue;
          }
          delta = -length;
        }
        break;

      case 'replace':
        if (content && length !== undefined && cursor.position >= position) {
          if (cursor.position < position + length) {
            cursor.position = position + content.length;
            continue;
          }
          delta = content.length - length;
        }
        break;
    }

    cursor.position = Math.max(0, cursor.position + delta);
  }
}

// 세션 상태 조회
export function getSessionState(filePath: string, sinceVersion?: number): SyncState | null {
  const sessionId = fileToSession.get(filePath);
  if (!sessionId) return null;

  const session = sessions.get(sessionId);
  if (!session) return null;

  // 비활성 참가자 정리 (30초 이상 업데이트 없음)
  const now = Date.now();
  const activeThreshold = 30000;

  const participants: Participant[] = [];
  for (const [userId, cursor] of session.participants) {
    const isActive = (now - cursor.lastUpdate) < activeThreshold;
    participants.push({
      id: userId,
      name: cursor.userName,
      color: cursor.userColor,
      joinedAt: cursor.lastUpdate,
      isActive,
      cursor: isActive ? cursor : undefined
    });
  }

  // sinceVersion 이후의 작업만 반환
  const pendingOperations = sinceVersion !== undefined
    ? session.operations.filter((_, i) => i >= sinceVersion)
    : [];

  return {
    sessionId: session.id,
    version: session.version,
    participants,
    pendingOperations
  };
}

// 세션 콘텐츠 조회
export function getSessionContent(filePath: string): { content: string; version: number } | null {
  const sessionId = fileToSession.get(filePath);
  if (!sessionId) return null;

  const session = sessions.get(sessionId);
  if (!session) return null;

  return {
    content: session.currentContent,
    version: session.version
  };
}

// 전체 콘텐츠 동기화 (충돌 해결용)
export function syncContent(
  filePath: string,
  content: string,
  userId: string
): { success: boolean; version: number } {
  const sessionId = fileToSession.get(filePath);
  if (!sessionId) return { success: false, version: 0 };

  const session = sessions.get(sessionId);
  if (!session) return { success: false, version: 0 };

  session.currentContent = content;
  session.version++;
  session.operations = []; // 작업 히스토리 초기화
  session.lastActivity = Date.now();

  return { success: true, version: session.version };
}

// 세션 정보 조회
export function getSession(filePath: string): CollaborationSession | null {
  const sessionId = fileToSession.get(filePath);
  if (!sessionId) return null;

  return sessions.get(sessionId) || null;
}

// 모든 활성 세션 목록
export function getActiveSessions(): { filePath: string; participantCount: number; lastActivity: number }[] {
  const result: { filePath: string; participantCount: number; lastActivity: number }[] = [];

  for (const [filePath, sessionId] of fileToSession) {
    const session = sessions.get(sessionId);
    if (session) {
      result.push({
        filePath,
        participantCount: session.participants.size,
        lastActivity: session.lastActivity
      });
    }
  }

  return result;
}
