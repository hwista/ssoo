/**
 * Ask API Route - RAG 기반 질문 답변 (스트리밍)
 * Vercel AI SDK v6 streamText 사용
 *
 * v6 useChat는 UIMessage 형식을 전송:
 *   { id, role, parts: [{ type: 'text', text: '...' }] }
 */
export const dynamic = 'force-dynamic';


import { buildRAGMessages, askQuestion, askQuestionStream } from '@/server/handlers/ai.handler';

/**
 * UIMessage의 parts에서 텍스트 추출 (v6 호환)
 */
function extractTextFromMessage(
  msg: { role: string; content?: string; parts?: Array<{ type: string; text?: string }> }
): string {
  // v6 parts 형식
  if (msg.parts && Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('');
  }
  // v3/v4 content 형식 (폴백)
  if (typeof msg.content === 'string') {
    return msg.content;
  }
  return '';
}

export async function POST(req: Request) {
  const body = await req.json();
  const rawMessagesInput: Array<{
    role: string;
    content?: string;
    parts?: Array<{ type: string; text?: string }>;
  }> = body?.messages ?? [];
  const queryFromBody = typeof body?.query === 'string' ? body.query : '';
  const rawMessages = rawMessagesInput.length > 0
    ? rawMessagesInput
    : (queryFromBody
      ? [{ role: 'user', content: queryFromBody }]
      : []);
  const contextMode = body?.contextMode === 'deep' ? 'deep' : 'wiki';
  const attachmentOnly = body?.contextMode === 'attachments-only';
  const activeDocPath = typeof body?.activeDocPath === 'string' ? body.activeDocPath : undefined;
  const stream = body?.stream !== false;

  if (rawMessages.length === 0) {
    return Response.json({ error: '메시지가 비어 있습니다.' }, { status: 400 });
  }

  // UIMessage → { role, content } 형식으로 플래튼
  const messages = rawMessages.map((m) => ({
    role: m.role,
    content: extractTextFromMessage(m),
  }));

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage || !lastUserMessage.content) {
    return Response.json({ error: '사용자 메시지가 없습니다.' }, { status: 400 });
  }

  // RAG 컨텍스트 주입
  const { messages: augmentedMessages } = await buildRAGMessages(
    lastUserMessage.content,
    messages,
    attachmentOnly
      ? { skipSearch: true, includeImplementationContext: false, contextMode, activeDocPath }
      : { contextMode, activeDocPath }
  );

  if (!stream) {
    const result = await askQuestion(lastUserMessage.content, augmentedMessages, { contextMode, activeDocPath });
    if (!result.success) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json(result.data);
  }

  // 스트리밍 응답
  const result = await askQuestionStream(lastUserMessage.content, augmentedMessages, { attachmentOnly });
  return result.toUIMessageStreamResponse();
}
