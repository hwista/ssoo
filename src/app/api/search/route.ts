/**
 * Search API Route - 시맨틱 문서 검색
 * pgvector 유사도 검색 + 키워드 폴백
 */
export const dynamic = 'force-dynamic';

import { searchDocuments } from '@/server/handlers/ai.handler';

export async function POST(req: Request) {
  const body = await req.json();
  const query = typeof body?.query === 'string' ? body.query : '';
  const contextMode = body?.contextMode === 'deep' ? 'deep' : 'wiki';
  const activeDocPath = typeof body?.activeDocPath === 'string' ? body.activeDocPath : undefined;

  const result = await searchDocuments(query, { contextMode, activeDocPath });

  if (result.success) {
    return Response.json(result.data);
  }

  return Response.json({ error: result.error }, { status: result.status });
}
