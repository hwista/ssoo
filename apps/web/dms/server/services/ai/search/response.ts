import type { AiContextOptions, SearchResponse, SearchResultItem } from '@/server/services/ai/types';

export function buildCitations(items: SearchResultItem[]) {
  return items.slice(0, 5).map((item) => ({
    title: item.title || item.path,
    storageUri: `doc://${item.path.replace(/^\/+/, '')}`,
    versionId: undefined,
    webUrl: undefined,
  }));
}

export function inferConfidence(count: number): 'high' | 'medium' | 'low' {
  if (count >= 5) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

export function buildSearchResponse(
  query: string,
  results: SearchResultItem[],
  options?: AiContextOptions
): SearchResponse {
  return {
    query,
    results,
    contextMode: options?.contextMode ?? 'doc',
    confidence: inferConfidence(results.length),
    citations: options?.contextMode === 'deep' ? buildCitations(results) : undefined,
  };
}
