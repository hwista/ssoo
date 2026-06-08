import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

export interface PersistedChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: unknown[];
  persistedToDb: boolean;
}

interface ChatSessionRow {
  id: string;
  title: string;
  messages: unknown;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ChatSessionPayload {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: unknown[];
}

const OWNER_USER_ID_REGEX = /^\d{1,20}$/;
const SESSION_ID_REGEX = /^[a-zA-Z0-9._:-]{8,120}$/;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGES_COUNT = 200;
const MAX_MESSAGES_BYTES = 512_000;
const CHAT_SESSION_TABLE = '"dms"."dm_chat_session_m"';

@Injectable()
export class ChatSessionsService {
  constructor(private readonly db: DatabaseService) {}

  async list(ownerUserId: string, limit = 50): Promise<PersistedChatSession[]> {
    const parsedOwnerUserId = this.parseOwnerUserId(ownerUserId);

    const rows = await this.db.client.$queryRawUnsafe<ChatSessionRow[]>(
      `SELECT chat_session_id AS id, title, messages, created_at, updated_at
       FROM ${CHAT_SESSION_TABLE}
       WHERE owner_user_id = $1
       ORDER BY updated_at DESC
       LIMIT $2`,
      parsedOwnerUserId,
      Math.max(1, Math.min(limit, 200)),
    );

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      messages: Array.isArray(row.messages) ? row.messages : [],
      persistedToDb: true,
    }));
  }

  async save(ownerUserId: string, session: ChatSessionPayload): Promise<{ id: string }> {
    const parsedOwnerUserId = this.parseOwnerUserId(ownerUserId);
    this.assertSession(session);

    const affectedRows = await this.db.client.$executeRawUnsafe(
      `INSERT INTO ${CHAT_SESSION_TABLE} AS target (chat_session_id, owner_user_id, title, messages, created_at, updated_at, persisted_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz, $6::timestamptz, NOW())
       ON CONFLICT (chat_session_id)
       DO UPDATE SET
         owner_user_id = EXCLUDED.owner_user_id,
         title = EXCLUDED.title,
         messages = EXCLUDED.messages,
         updated_at = EXCLUDED.updated_at,
         persisted_at = NOW()
       WHERE target.owner_user_id = EXCLUDED.owner_user_id`,
      session.id,
      parsedOwnerUserId,
      session.title,
      JSON.stringify(session.messages),
      session.createdAt,
      session.updatedAt,
    );
    if (affectedRows === 0) {
      throw new BadRequestException('다른 사용자의 채팅 세션은 저장할 수 없습니다.');
    }

    return { id: session.id };
  }

  async remove(ownerUserId: string, sessionId: string): Promise<{ id: string }> {
    const parsedOwnerUserId = this.parseOwnerUserId(ownerUserId);
    this.assertSessionId(sessionId);

    await this.db.client.$executeRawUnsafe(
      `DELETE FROM ${CHAT_SESSION_TABLE} WHERE chat_session_id = $1 AND owner_user_id = $2`,
      sessionId,
      parsedOwnerUserId,
    );

    return { id: sessionId };
  }

  private parseOwnerUserId(ownerUserId: string): bigint {
    const normalizedOwnerUserId = ownerUserId.trim();
    if (!OWNER_USER_ID_REGEX.test(normalizedOwnerUserId)) {
      throw new BadRequestException('유효한 사용자 정보가 필요합니다.');
    }
    return BigInt(normalizedOwnerUserId);
  }

  private assertSessionId(sessionId: string): void {
    if (!SESSION_ID_REGEX.test(sessionId.trim())) {
      throw new BadRequestException('유효한 sessionId가 필요합니다.');
    }
  }

  private assertSession(session: ChatSessionPayload): void {
    this.assertSessionId(session.id);

    const title = session.title.trim();
    if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
      throw new BadRequestException(`title은 1~${MAX_TITLE_LENGTH}자여야 합니다.`);
    }

    if (!Array.isArray(session.messages)) {
      throw new BadRequestException('messages는 배열이어야 합니다.');
    }

    if (session.messages.length > MAX_MESSAGES_COUNT) {
      throw new BadRequestException(`messages는 최대 ${MAX_MESSAGES_COUNT}개까지 저장할 수 있습니다.`);
    }

    if (Buffer.byteLength(JSON.stringify(session.messages), 'utf8') > MAX_MESSAGES_BYTES) {
      throw new BadRequestException(`messages payload는 최대 ${MAX_MESSAGES_BYTES} bytes까지 저장할 수 있습니다.`);
    }
  }
}
