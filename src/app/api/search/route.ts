/**
 * Search API Route - 시맨틱 문서 검색
 * pgvector 유사도 검색 + 키워드 폴백
 */
export const dynamic = 'force-dynamic';

import { searchDocuments } from '@/server/handlers/ai.handler';
import { toNextResponse } from '@/server/shared/result';

export async function POST(req: Request) {
  const body = await req.json();
  const query = typeof body?.query === 'string' ? body.query : '';
  const contextMode = body?.contextMode === 'deep' ? 'deep' : 'doc';
  const activeDocPath = typeof body?.activeDocPath === 'string' ? body.activeDocPath : undefined;

  const result = await searchDocuments(query, { contextMode, activeDocPath });
  return toNextResponse(result);
}
