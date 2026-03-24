import { LIMITS } from '@/lib/constants/common';
import { logger } from '@/lib/utils/errorUtils';
import type { AppResult } from '@/server/shared/result';
import type { AiContextOptions, SearchResponse } from './types';
import { searchDocumentsKeyword } from './search/keyword';
import { searchDocumentsSemantic } from './search/semantic';

export { buildCitations, inferConfidence } from './search/response';
export { searchDocumentsKeyword } from './search/keyword';

export async function searchDocuments(
  query: string,
  options?: AiContextOptions
): Promise<AppResult<SearchResponse>> {
  if (!query || query.trim().length < LIMITS.MIN_SEARCH_QUERY_LENGTH) {
    return { success: false, error: '검색어가 비어 있습니다.', status: 400 };
  }

  const semanticResult = await searchDocumentsSemantic(query, options);
  if (semanticResult.success && semanticResult.data.results.length > 0) {
    return semanticResult;
  }

  if (!semanticResult.success) {
    logger.warn('시맨틱 검색 실패, 키워드 폴백', { query, error: semanticResult.error });
  } else {
    logger.info('시맨틱 검색 결과 없음, 키워드 폴백', { query });
  }

  return searchDocumentsKeyword(query, options);
}
