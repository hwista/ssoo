import { logger } from '@/lib/utils/errorUtils';
import { getPool } from '@/server/services/db';
import { fail, ok, type AppResult } from '@/server/shared/result';

export interface PersistedChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: unknown[];
  persistedToDb: boolean;
}

const CLIENT_ID_REGEX = /^[a-zA-Z0-9_-]{8,80}$/;
const SESSION_ID_REGEX = /^[a-zA-Z0-9._:-]{8,120}$/;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGES_COUNT = 200;
const MAX_MESSAGES_BYTES = 512_000;

let chatTableInitialized = false;

function isValidClientId(value: string): boolean {
  return CLIENT_ID_REGEX.test(value);
}

function isValidSessionId(value: string): boolean {
  return SESSION_ID_REGEX.test(value);
}

function validateMessages(messages: unknown[]): { valid: boolean; reason?: string } {
  if (!Array.isArray(messages)) return { valid: false, reason: 'messages는 배열이어야 합니다.' };
  if (messages.length > MAX_MESSAGES_COUNT) {
    return { valid: false, reason: `messages는 최대 ${MAX_MESSAGES_COUNT}개까지 저장할 수 있습니다.` };
  }
  const serialized = JSON.stringify(messages);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_MESSAGES_BYTES) {
    return { valid: false, reason: `messages payload는 최대 ${MAX_MESSAGES_BYTES} bytes까지 저장할 수 있습니다.` };
  }
  return { valid: true };
}

class ChatSessionService {
  private async ensureTable(): Promise<void> {
    if (chatTableInitialized) return;

    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS dms_chat_sessions (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        persisted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_dms_chat_sessions_client_updated
      ON dms_chat_sessions (client_id, updated_at DESC)
    `);
    chatTableInitialized = true;
  }

  async list(clientId: string, limit = 50): Promise<AppResult<PersistedChatSession[]>> {
    if (!isValidClientId(clientId.trim())) {
      return fail('유효한 clientId가 필요합니다.', 400);
    }

    try {
      await this.ensureTable();
      const db = getPool();
      const result = await db.query(
        `SELECT id, title, messages, created_at, updated_at
         FROM dms_chat_sessions
         WHERE client_id = $1
         ORDER BY updated_at DESC
         LIMIT $2`,
        [clientId, Math.max(1, Math.min(limit, 200))]
      );

      return ok(result.rows.map((row) => ({
          id: row.id,
          title: row.title,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
          messages: Array.isArray(row.messages) ? row.messages : [],
          persistedToDb: true,
        })));
    } catch (error) {
      logger.error('채팅 세션 목록 조회 실패', error, { clientId });
      return fail('채팅 세션 조회 중 오류가 발생했습니다.', 500);
    }
  }

  async save(
    clientId: string,
    session: Omit<PersistedChatSession, 'persistedToDb'>
  ): Promise<AppResult<{ id: string }>> {
    if (!isValidClientId(clientId.trim())) {
      return fail('유효한 clientId가 필요합니다.', 400);
    }
    if (!isValidSessionId(session?.id?.trim() ?? '')) {
      return fail('유효한 session.id가 필요합니다.', 400);
    }
    if ((session?.title?.trim() ?? '').length === 0 || session.title.length > MAX_TITLE_LENGTH) {
      return fail(`title은 1~${MAX_TITLE_LENGTH}자여야 합니다.`, 400);
    }

    const messageValidation = validateMessages(Array.isArray(session.messages) ? session.messages : []);
    if (!messageValidation.valid) {
      return fail(messageValidation.reason ?? 'messages 검증에 실패했습니다.', 400);
    }

    try {
      await this.ensureTable();
      const db = getPool();
      await db.query(
        `INSERT INTO dms_chat_sessions (id, client_id, title, messages, created_at, updated_at, persisted_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz, $6::timestamptz, NOW())
         ON CONFLICT (id)
         DO UPDATE SET
           client_id = EXCLUDED.client_id,
           title = EXCLUDED.title,
           messages = EXCLUDED.messages,
           updated_at = EXCLUDED.updated_at,
           persisted_at = NOW()`,
        [
          session.id,
          clientId,
          session.title || '새 대화',
          JSON.stringify(Array.isArray(session.messages) ? session.messages : []),
          session.createdAt || new Date().toISOString(),
          session.updatedAt || new Date().toISOString(),
        ]
      );

      return ok({ id: session.id });
    } catch (error) {
      logger.error('채팅 세션 저장 실패', error, { clientId, sessionId: session.id });
      return fail('채팅 세션 저장 중 오류가 발생했습니다.', 500);
    }
  }

  async remove(clientId: string, sessionId: string): Promise<AppResult<{ id: string }>> {
    if (!isValidClientId(clientId.trim()) || !isValidSessionId(sessionId.trim())) {
      return fail('유효한 clientId와 sessionId가 필요합니다.', 400);
    }

    try {
      await this.ensureTable();
      const db = getPool();
      await db.query(
        `DELETE FROM dms_chat_sessions WHERE id = $1 AND client_id = $2`,
        [sessionId, clientId]
      );
      return ok({ id: sessionId });
    } catch (error) {
      logger.error('채팅 세션 삭제 실패', error, { clientId, sessionId });
      return fail('채팅 세션 삭제 중 오류가 발생했습니다.', 500);
    }
  }
}

export const chatSessionService = new ChatSessionService();
