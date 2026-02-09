/**
 * Search API Route - 문서 검색
 */

import { searchDocuments } from '@/server/handlers/ai.handler';

export async function POST(req: Request) {
  const body = await req.json();
  const query = typeof body?.query === 'string' ? body.query : '';

  const result = await searchDocuments(query);

  if (result.success) {
    return Response.json(result.data);
  }

  return new Response(result.error, { status: result.status });
}
