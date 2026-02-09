/**
 * AI Handler - 질문/검색 API 처리
 * Route: /api/ask, /api/search
 */

import fs from 'fs';
import path from 'path';
import { normalizePath } from '@/lib/utils/pathUtils';
import { isMarkdownFile } from '@/lib/utils/fileUtils';
import { LIMITS } from '@/lib/utils/constants';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';

const ROOT_DIR = path.join(process.cwd(), 'docs', 'wiki');

export interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
}

export interface AskResponse {
  query: string;
  answer: string;
  sources: SearchResultItem[];
}

export type HandlerResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

function listMarkdownFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractTitle(content: string, fileName: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }
  return fileName.replace(/\.md$/i, '');
}

function buildExcerpt(content: string, query: string): { excerpt: string; score: number } {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);
  const score = lowerQuery ? lowerContent.split(lowerQuery).length - 1 : 0;

  if (index === -1) {
    return { excerpt: content.slice(0, 180).trim() || '내용을 불러올 수 없습니다.', score };
  }

  const start = Math.max(index - 80, 0);
  const end = Math.min(index + 120, content.length);
  const snippet = content.slice(start, end).replace(/\s+/g, ' ').trim();
  return { excerpt: snippet, score };
}

function toRelativePath(filePath: string): string {
  const relative = path.relative(ROOT_DIR, filePath);
  return normalizePath(relative);
}

export async function searchDocuments(query: string): Promise<HandlerResult<SearchResponse>> {
  const timer = new PerformanceTimer('Handler: AI 검색');

  if (!query || query.trim().length < LIMITS.MIN_SEARCH_QUERY_LENGTH) {
    return { success: false, error: '검색어가 비어 있습니다.', status: 400 };
  }

  try {
    const files = listMarkdownFiles(ROOT_DIR);
    const results: SearchResultItem[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content.toLowerCase().includes(query.toLowerCase())) {
        continue;
      }

      const { excerpt, score } = buildExcerpt(content, query);
      const fileName = path.basename(filePath);

      results.push({
        id: filePath,
        title: extractTitle(content, fileName),
        excerpt,
        path: toRelativePath(filePath),
        score,
      });
    }

    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, LIMITS.MAX_SEARCH_RESULTS);

    logger.info('AI 검색 완료', { query, count: limitedResults.length });
    timer.end({ query, count: limitedResults.length });

    return {
      success: true,
      data: {
        query,
        results: limitedResults,
      },
    };
  } catch (error) {
    logger.error('AI 검색 실패', error, { query });
    timer.end({ query, error: true });
    return { success: false, error: '검색 처리 중 오류가 발생했습니다.', status: 500 };
  }
}

export async function askQuestion(query: string): Promise<HandlerResult<AskResponse>> {
  const timer = new PerformanceTimer('Handler: AI 질문');

  if (!query || query.trim().length < LIMITS.MIN_SEARCH_QUERY_LENGTH) {
    return { success: false, error: '질문이 비어 있습니다.', status: 400 };
  }

  try {
    const searchResult = await searchDocuments(query);
    if (!searchResult.success) {
      return searchResult;
    }

    const sources = searchResult.data.results.slice(0, 3);
    const answer = sources.length
      ? `관련 문서 ${sources.length}건을 찾았습니다. 상위 문서를 확인해 주세요.`
      : '관련 문서를 찾지 못했습니다. 다른 키워드로 질문해 주세요.';

    logger.info('AI 질문 완료', { query, count: sources.length });
    timer.end({ query, count: sources.length });

    return {
      success: true,
      data: {
        query,
        answer,
        sources,
      },
    };
  } catch (error) {
    logger.error('AI 질문 실패', error, { query });
    timer.end({ query, error: true });
    return { success: false, error: '질문 처리 중 오류가 발생했습니다.', status: 500 };
  }
}
