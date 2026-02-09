/**
 * Ask API Route - 문서 기반 질문
 */

import { askQuestion } from '@/server/handlers/ai.handler';

export async function POST(req: Request) {
  const body = await req.json();
  const query = typeof body?.query === 'string' ? body.query : '';

  const result = await askQuestion(query);

  if (result.success) {
    return Response.json(result.data);
  }

  return new Response(result.error, { status: result.status });
}
