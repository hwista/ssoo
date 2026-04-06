import fs from 'fs';
import path from 'path';
import { LIMITS } from '@/lib/constants/common';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';
import { embedQuery, searchSimilarDocuments } from '@/server/services/ai/embedding';
import { configService } from '@/server/services/config/ConfigService';
import type { AiContextOptions, HandlerResult, SearchResponse, SearchResultItem } from '@/server/services/ai/types';
import { resolveAbsolutePath, resolveDocumentPresentation, toDisplayPath } from './paths';
import { tokenizeQuery } from './query';
import { buildSearchResponse } from './response';
import { buildAiOneLineSummary, buildAutoSummary, mapWithConcurrency } from './summary';
import { buildPreviewSnippets, stripMarkdown, toOneLineDescription } from './text';

export async function searchDocumentsSemantic(
  query: string,
  options?: AiContextOptions
): Promise<HandlerResult<SearchResponse>> {
  const timer = new PerformanceTimer('Handler: AI 검색');

  if (!query || query.trim().length < LIMITS.MIN_SEARCH_QUERY_LENGTH) {
    return { success: false, error: '검색어가 비어 있습니다.', status: 400 };
  }

  try {
    const terms = tokenizeQuery(query);
    const searchConfig = configService.getConfig().search;
    const queryEmbedding = await embedQuery(query);
    const semanticResults = await searchSimilarDocuments(
      queryEmbedding,
      searchConfig.maxResults,
      searchConfig.semanticThreshold
    );

    const results: SearchResultItem[] = semanticResults.map((doc, index) => {
      const displayPath = toDisplayPath(doc.filePath);
      const resolvedPath = resolveAbsolutePath(doc.filePath);
      const fileName = path.basename(displayPath || doc.filePath);
      let content = doc.chunkText;

      try {
        if (fs.existsSync(resolvedPath)) {
          content = fs.readFileSync(resolvedPath, 'utf-8');
        }
      } catch {
        // 파일 읽기 실패 시 청크 텍스트로 폴백
      }

      const fallbackTitle = doc.title?.trim() || fileName.replace(/\.md$/i, '');
      const presentation = resolveDocumentPresentation(doc.filePath, fallbackTitle);
      const { snippets, totalCount } = buildPreviewSnippets(content || doc.chunkText, query, terms, 4);
      const excerpt = snippets[0] || stripMarkdown(doc.chunkText).slice(0, 200);
      const summary = presentation.sidecarSummary || buildAutoSummary(content || doc.chunkText, query, terms, snippets);

      return {
        id: `semantic-${index}`,
        title: presentation.title,
        excerpt,
        path: displayPath,
        score: doc.similarity,
        summary,
        snippets,
        totalSnippetCount: totalCount,
      };
    });

    const finalizedResults = await mapWithConcurrency(
      results,
      searchConfig.summaryConcurrency,
      async (item) => {
        try {
          const fullPath = resolveAbsolutePath(item.path);
          const content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : '';
          const fallbackSummary = item.summary || buildAutoSummary(content, query, terms, item.snippets ?? []);
          const aiSummary = await buildAiOneLineSummary(item.title, content, query, fallbackSummary);
          return { ...item, summary: aiSummary };
        } catch {
          return { ...item, summary: toOneLineDescription(item.summary || '', item.title) };
        }
      }
    );

    logger.info('시맨틱 검색 완료', { query, count: finalizedResults.length });
    timer.end({ query, count: finalizedResults.length });

    return {
      success: true,
      data: buildSearchResponse(query, finalizedResults, options),
    };
  } catch (error) {
    logger.warn('시맨틱 검색 실패', { query, error: String(error) });
    timer.end({ query, error: true });
    return { success: false, error: '시맨틱 검색 처리 중 오류가 발생했습니다.', status: 500 };
  }
}
