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

const CLIENT_ID_REGEX = /^[a-zA-Z0-9_-]{8,80}$/;
const SESSION_ID_REGEX = /^[a-zA-Z0-9._:-]{8,120}$/;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGES_COUNT = 200;
const MAX_MESSAGES_BYTES = 512_000;

@Injectable()
export class ChatSessionsService {
  private tableInitialized = false;

  constructor(private readonly db: DatabaseService) {}

  async list(clientId: string, limit = 50): Promise<PersistedChatSession[]> {
    this.assertClientId(clientId);
    await this.ensureTable();

    const rows = await this.db.client.$queryRawUnsafe<ChatSessionRow[]>(
      `SELECT id, title, messages, created_at, updated_at
       FROM dms_chat_sessions
       WHERE client_id = $1
       ORDER BY updated_at DESC
       LIMIT $2`,
      clientId,
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

  async save(clientId: string, session: ChatSessionPayload): Promise<{ id: string }> {
    this.assertClientId(clientId);
    this.assertSession(session);
    await this.ensureTable();

    await this.db.client.$executeRawUnsafe(
      `INSERT INTO dms_chat_sessions (id, client_id, title, messages, created_at, updated_at, persisted_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz, $6::timestamptz, NOW())
       ON CONFLICT (id)
       DO UPDATE SET
         client_id = EXCLUDED.client_id,
         title = EXCLUDED.title,
         messages = EXCLUDED.messages,
         updated_at = EXCLUDED.updated_at,
         persisted_at = NOW()`,
      session.id,
      clientId,
      session.title,
      JSON.stringify(session.messages),
      session.createdAt,
      session.updatedAt,
    );

    return { id: session.id };
  }

  async remove(clientId: string, sessionId: string): Promise<{ id: string }> {
    this.assertClientId(clientId);
    this.assertSessionId(sessionId);
    await this.ensureTable();

    await this.db.client.$executeRawUnsafe(
      `DELETE FROM dms_chat_sessions WHERE id = $1 AND client_id = $2`,
      sessionId,
      clientId,
    );

    return { id: sessionId };
  }

  private async ensureTable(): Promise<void> {
    if (this.tableInitialized) {
      return;
    }

    await this.db.client.$executeRawUnsafe(`
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

    await this.db.client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_dms_chat_sessions_client_updated
      ON dms_chat_sessions (client_id, updated_at DESC)
    `);

    this.tableInitialized = true;
  }

  private assertClientId(clientId: string): void {
    if (!CLIENT_ID_REGEX.test(clientId.trim())) {
      throw new BadRequestException('유효한 clientId가 필요합니다.');
    }
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
