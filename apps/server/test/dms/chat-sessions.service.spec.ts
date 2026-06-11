import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { ChatSessionsService } from '../../src/modules/dms/chat-sessions/chat-sessions.service.js';

const sessionPayload = {
  id: 'session-20260604-test',
  title: 'AI 대화 테스트',
  createdAt: '2026-06-04T00:00:00.000Z',
  updatedAt: '2026-06-04T00:01:00.000Z',
  messages: [
    { id: 'm1', role: 'user', kind: 'text', text: '질문' },
    { id: 'm2', role: 'assistant', kind: 'text', text: '응답' },
  ],
};

describe('ChatSessionsService', () => {
  let executeResult: number;
  let queryRows: Array<{
    id: string;
    title: string;
    messages: unknown;
    created_at: Date;
    updated_at: Date;
  }>;
  let executeRawUnsafe: jest.Mock<(sql: string, ...args: unknown[]) => Promise<number>>;
  let queryRawUnsafe: jest.Mock<(sql: string, ...args: unknown[]) => Promise<typeof queryRows>>;
  let service: ChatSessionsService;

  beforeEach(() => {
    executeResult = 1;
    queryRows = [];
    executeRawUnsafe = jest.fn(async (sql: string) => (
      sql.includes('INSERT INTO "dms"."dm_chat_session_m"') ? executeResult : 1
    ));
    queryRawUnsafe = jest.fn(async () => queryRows);
    service = new ChatSessionsService({
      client: {
        $executeRawUnsafe: executeRawUnsafe,
        $queryRawUnsafe: queryRawUnsafe,
      },
    } as never);
  });

  it('lists sessions by authenticated owner user id', async () => {
    queryRows = [{
      id: sessionPayload.id,
      title: sessionPayload.title,
      messages: sessionPayload.messages,
      created_at: new Date(sessionPayload.createdAt),
      updated_at: new Date(sessionPayload.updatedAt),
    }];

    const result = await service.list('42', 25);

    expect(result).toEqual([{
      id: sessionPayload.id,
      title: sessionPayload.title,
      createdAt: sessionPayload.createdAt,
      updatedAt: sessionPayload.updatedAt,
      messages: sessionPayload.messages,
      persistedToDb: true,
    }]);
    expect(queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE owner_user_id = $1'),
      42n,
      25,
    );
  });

  it('stores sessions under authenticated owner user id', async () => {
    await service.save('42', sessionPayload);

    expect(executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "dms"."dm_chat_session_m" AS target (chat_session_id, owner_user_id'),
      sessionPayload.id,
      42n,
      sessionPayload.title,
      JSON.stringify(sessionPayload.messages),
      sessionPayload.createdAt,
      sessionPayload.updatedAt,
    );
    expect(executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE target.owner_user_id = EXCLUDED.owner_user_id'),
      sessionPayload.id,
      42n,
      sessionPayload.title,
      JSON.stringify(sessionPayload.messages),
      sessionPayload.createdAt,
      sessionPayload.updatedAt,
    );
  });

  it('rejects saves when an existing session belongs to another owner', async () => {
    executeResult = 0;

    await expect(service.save('42', sessionPayload)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes sessions only for the authenticated owner user id', async () => {
    await service.remove('42', sessionPayload.id);

    expect(executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM "dms"."dm_chat_session_m" WHERE chat_session_id = $1 AND owner_user_id = $2'),
      sessionPayload.id,
      42n,
    );
  });
});
