/**
 * Create API Route - 문서 요약/생성 (스트리밍)
 * 파일 텍스트 → LLM 요약
 */

import { summarizeTextStream } from '@/server/handlers/ai.handler';

export async function POST(req: Request) {
  const body = await req.json();
  const text = typeof body?.text === 'string' ? body.text : '';
  const templateType = typeof body?.templateType === 'string' ? body.templateType : 'default';

  if (!text || text.trim().length < 10) {
    return new Response('요약할 텍스트가 너무 짧습니다.', { status: 400 });
  }

  const result = summarizeTextStream(text, templateType);
  return result.toTextStreamResponse();
}
