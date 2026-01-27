/**
 * Search Handler - 벡터 검색 관련 작업을 담당하는 핸들러
 * Route: /api/search
 */

import { searchSimilar, getDocumentCount } from '@/lib/vectorStore';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  id: string;
  content: string;
  fileName: string;
  filePath: string;
  chunkIndex: number;
  score: number;
}

export type HandlerResult<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string; status: number };

// ============================================================================
// Handlers
// ============================================================================

/**
 * 벡터 유사도 검색
 */
export async function searchDocuments(
  query: string, 
  limit: number = 5
): Promise<HandlerResult<{
  query: string;
  results: SearchResult[];
  totalResults: number;
}>> {
  if (!query || typeof query !== 'string') {
    return { success: false, error: '검색어가 필요합니다', status: 400 };
  }

  try {
    const results = await searchSimilar(query, limit);

    return {
      success: true,
      data: {
        query,
        results: results.map(r => ({
          id: r.document.id,
          content: r.document.content,
          fileName: r.document.fileName,
          filePath: r.document.filePath,
          chunkIndex: r.document.chunkIndex,
          score: r.score
        })),
        totalResults: results.length
      }
    };
  } catch (error) {
    console.error('검색 오류:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다', 
      status: 500 
    };
  }
}

/**
 * 인덱스 상태 조회
 */
export async function getIndexStatus(): Promise<HandlerResult<{
  indexedDocuments: number;
  status: 'ready' | 'empty';
}>> {
  try {
    const count = await getDocumentCount();

    return {
      success: true,
      data: {
        indexedDocuments: count,
        status: count > 0 ? 'ready' : 'empty'
      }
    };
  } catch (error) {
    console.error('인덱스 상태 조회 오류:', error);
    return { 
      success: false, 
      error: '인덱스 상태 조회 중 오류가 발생했습니다', 
      status: 500 
    };
  }
}
