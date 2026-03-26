export const dynamic = 'force-dynamic';

import { deleteChatSession, listChatSessions, saveChatSession } from '@/server/handlers/chatSessions.handler';

const CLIENT_ID_REGEX = /^[a-zA-Z0-9_-]{8,80}$/;
const SESSION_ID_REGEX = /^[a-zA-Z0-9._:-]{8,120}$/;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGES_COUNT = 200;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId') ?? '';
  const limitRaw = Number(searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
  if (!CLIENT_ID_REGEX.test(clientId)) {
    return Response.json({ error: '유효한 clientId가 필요합니다.' }, { status: 400 });
  }

  const result = await listChatSessions(clientId, limit);
  if (result.success) {
    return Response.json(result.data);
  }
  return Response.json({ error: result.error }, { status: result.status });
}

export async function POST(req: Request) {
  const body = await req.json();
  const clientId = typeof body?.clientId === 'string' ? body.clientId : '';
  if (!CLIENT_ID_REGEX.test(clientId)) {
    return Response.json({ error: '유효한 clientId가 필요합니다.' }, { status: 400 });
  }
  const sessionCandidate = body?.session;
  const session = (
    sessionCandidate &&
    typeof sessionCandidate.id === 'string' &&
    typeof sessionCandidate.title === 'string' &&
    typeof sessionCandidate.createdAt === 'string' &&
    typeof sessionCandidate.updatedAt === 'string' &&
    Array.isArray(sessionCandidate.messages) &&
    SESSION_ID_REGEX.test(sessionCandidate.id) &&
    sessionCandidate.title.length > 0 &&
    sessionCandidate.title.length <= MAX_TITLE_LENGTH &&
    sessionCandidate.messages.length <= MAX_MESSAGES_COUNT
  )
    ? {
      id: sessionCandidate.id,
      title: sessionCandidate.title,
      createdAt: sessionCandidate.createdAt,
      updatedAt: sessionCandidate.updatedAt,
      messages: sessionCandidate.messages,
    }
    : null;

  if (!session) {
    return Response.json({ error: '유효한 session payload가 필요합니다.' }, { status: 400 });
  }

  const result = await saveChatSession(clientId, session);
  if (result.success) {
    return Response.json(result.data);
  }
  return Response.json({ error: result.error }, { status: result.status });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const clientId = typeof body?.clientId === 'string' ? body.clientId : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  if (!CLIENT_ID_REGEX.test(clientId) || !SESSION_ID_REGEX.test(sessionId)) {
    return Response.json({ error: '유효한 clientId와 sessionId가 필요합니다.' }, { status: 400 });
  }

  const result = await deleteChatSession(clientId, sessionId);
  if (result.success) {
    return Response.json(result.data);
  }
  return Response.json({ error: result.error }, { status: result.status });
}
