import type { TocItem } from '@/components/templates/page-frame';

export interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  summary?: string;
  snippets?: string[];
  totalSnippetCount?: number;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  count: number;
  updatedAt: string;
}

export function tokenizeHighlightTerms(query: string): string[] {
  return Array.from(new Set(
    query
      .toLowerCase()
      .split(/[\s,.;:!?()[\]{}"'`/\\|]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2)
  ));
}

export function rankSearchResults(allResults: SearchResultItem[], inputQuery: string) {
  const trimmed = inputQuery.trim().toLowerCase();
  if (!trimmed) {
    return {
      results: allResults,
      matchedResultIndices: [] as number[],
      currentResultIndex: -1,
    };
  }

  const ranked = allResults.map((item, index) => {
    const title = item.title.toLowerCase();
    const excerpt = item.excerpt.toLowerCase();
    const path = item.path.toLowerCase();
    let score = 0;
    if (title.includes(trimmed)) score += 4;
    if (path.includes(trimmed)) score += 3;
    if (excerpt.includes(trimmed)) score += 2;
    return { item, index, score };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  const results = ranked.map((entry) => entry.item);
  const matchedResultIndices = ranked
    .map((entry, sortedIndex) => (entry.score > 0 ? sortedIndex : -1))
    .filter((index) => index >= 0);

  return {
    results,
    matchedResultIndices,
    currentResultIndex: matchedResultIndices.length > 0 ? 0 : -1,
  };
}

export function buildSearchTocItems(results: SearchResultItem[]): TocItem[] {
  return results.map((item, index) => ({
    id: `search-result-${index}`,
    text: item.title || item.path || `문서 ${index + 1}`,
    level: 1,
  }));
}

export function buildHistoryItems(history: SearchHistoryItem[], sourceQuery: string) {
  return history.map((item) => ({
    id: item.id,
    title: item.query,
    updatedAt: item.updatedAt,
    active: item.query === sourceQuery,
    persistedToDb: true,
  }));
}

export function getTopSearchKeywords(history: SearchHistoryItem[]) {
  return [...history]
    .sort((a, b) => b.count - a.count || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 5)
    .map((item) => item.query);
}
