import fs from 'fs';
import path from 'path';
import { LIMITS } from '@/lib/constants/common';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';
import type { AiContextOptions, HandlerResult, SearchResponse, SearchResultItem } from '@/server/services/ai/types';
import { getRootDir, listMarkdownFiles, resolveAbsolutePath, resolveDocumentPresentation, toRelativePath } from './paths';
import { tokenizeQuery } from './query';
import { buildSearchResponse } from './response';
import { buildAiOneLineSummary, buildAutoSummary, mapWithConcurrency } from './summary';
import { buildExcerpt, buildPreviewSnippets, extractTitle, toOneLineDescription } from './text';

const SEARCH_SUMMARY_CONCURRENCY = 3;

export async function searchDocumentsKeyword(
  query: string,
  options?: AiContextOptions
): Promise<HandlerResult<SearchResponse>> {
  const timer = new PerformanceTimer('Handler: 키워드 검색');

  if (!query || query.trim().length < LIMITS.MIN_SEARCH_QUERY_LENGTH) {
    return { success: false, error: '검색어가 비어 있습니다.', status: 400 };
  }

  try {
    const normalizedQuery = query.trim();
    const lowerQuery = normalizedQuery.toLowerCase();
    const terms = tokenizeQuery(normalizedQuery);
    const files = listMarkdownFiles(getRootDir());
    const results: SearchResultItem[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lowerContent = content.toLowerCase();
      const relativePath = toRelativePath(filePath);
      const lowerPath = relativePath.toLowerCase();
      const fileName = path.basename(filePath);
      const fallbackTitle = extractTitle(content, fileName);
      const presentation = resolveDocumentPresentation(filePath, fallbackTitle);
      const lowerTitle = presentation.title.toLowerCase();
      const hasExactMatch = lowerContent.includes(lowerQuery);
      const hasTermMatch = terms.some((term) => (
        lowerContent.includes(term) || lowerPath.includes(term) || lowerTitle.includes(term)
      ));
      if (!hasExactMatch && !hasTermMatch) continue;

      const { excerpt, score: contentScore } = buildExcerpt(content, normalizedQuery, terms);
      const { snippets, totalCount } = buildPreviewSnippets(content, normalizedQuery, terms, 4);
      const summary = presentation.sidecarSummary || buildAutoSummary(content, normalizedQuery, terms, snippets);
      const metaScore = terms.reduce((acc, term) => {
        let next = acc;
        if (lowerTitle.includes(term)) next += 6;
        if (lowerPath.includes(term)) next += 4;
        return next;
      }, 0);

      results.push({
        id: filePath,
        title: presentation.title,
        excerpt,
        path: relativePath,
        score: contentScore + metaScore,
        summary,
        snippets,
        totalSnippetCount: totalCount,
      });
    }

    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, LIMITS.MAX_SEARCH_RESULTS);
    const finalizedResults = await mapWithConcurrency(
      limitedResults,
      SEARCH_SUMMARY_CONCURRENCY,
      async (item) => {
        try {
          const fullPath = resolveAbsolutePath(item.path);
          const content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : '';
          const fallbackSummary = item.summary || buildAutoSummary(content, normalizedQuery, terms, item.snippets ?? []);
          const aiSummary = await buildAiOneLineSummary(item.title, content, normalizedQuery, fallbackSummary);
          return { ...item, summary: aiSummary };
        } catch {
          return { ...item, summary: toOneLineDescription(item.summary || '', item.title) };
        }
      }
    );

    logger.info('키워드 검색 완료', { query, count: finalizedResults.length });
    timer.end({ query, count: finalizedResults.length });

    return {
      success: true,
      data: buildSearchResponse(query, finalizedResults, options),
    };
  } catch (error) {
    logger.error('키워드 검색 실패', error, { query });
    timer.end({ query, error: true });
    return { success: false, error: '검색 처리 중 오류가 발생했습니다.', status: 500 };
  }
}
