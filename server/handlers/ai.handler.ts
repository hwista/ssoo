/**
 * AI Handler - 질문/검색/요약 API 처리
 * Vercel AI SDK + pgvector 기반
 *
 * Route: /api/ask (스트리밍), /api/search, /api/create
 */

import fs from 'fs';
import path from 'path';
import { streamText } from 'ai';
import { normalizePath } from '@/lib/utils/pathUtils';
import { isMarkdownFile } from '@/lib/utils/fileUtils';
import { LIMITS } from '@/lib/utils/constants';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';
import { getChatModel, embedQuery, searchSimilarDocuments } from '../services/ai';

const ROOT_DIR = path.join(process.cwd(), 'docs', 'wiki');

// ============================================
// Types
// ============================================

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

export type HandlerResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

// ============================================
// 텍스트 검색 (폴백 / 키워드 검색)
// ============================================

function listMarkdownFiles(dirPath: string): string[] {
  try {
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
  } catch {
    return [];
  }
}

function extractTitle(content: string, fileName: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  return headingMatch?.[1]?.trim() || fileName.replace(/\.md$/i, '');
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

/**
 * 키워드 기반 문서 검색 (폴백)
 */
export async function searchDocumentsKeyword(query: string): Promise<HandlerResult<SearchResponse>> {
  const timer = new PerformanceTimer('Handler: 키워드 검색');

  if (!query || query.trim().length < LIMITS.MIN_SEARCH_QUERY_LENGTH) {
    return { success: false, error: '검색어가 비어 있습니다.', status: 400 };
  }

  try {
    const files = listMarkdownFiles(ROOT_DIR);
    const results: SearchResultItem[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content.toLowerCase().includes(query.toLowerCase())) continue;

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

    logger.info('키워드 검색 완료', { query, count: limitedResults.length });
    timer.end({ query, count: limitedResults.length });

    return { success: true, data: { query, results: limitedResults } };
  } catch (error) {
    logger.error('키워드 검색 실패', error, { query });
    timer.end({ query, error: true });
    return { success: false, error: '검색 처리 중 오류가 발생했습니다.', status: 500 };
  }
}

// ============================================
// 시맨틱 검색 (pgvector)
// ============================================

/**
 * 시맨틱 문서 검색 (pgvector 코사인 유사도)
 * DB 연결 실패 시 키워드 검색으로 폴백
 */
export async function searchDocuments(query: string): Promise<HandlerResult<SearchResponse>> {
  const timer = new PerformanceTimer('Handler: AI 검색');

  if (!query || query.trim().length < LIMITS.MIN_SEARCH_QUERY_LENGTH) {
    return { success: false, error: '검색어가 비어 있습니다.', status: 400 };
  }

  try {
    const queryEmbedding = await embedQuery(query);
    const semanticResults = await searchSimilarDocuments(queryEmbedding, LIMITS.MAX_SEARCH_RESULTS, 0.5);

    if (semanticResults.length === 0) {
      logger.info('시맨틱 검색 결과 없음, 키워드 폴백', { query });
      return searchDocumentsKeyword(query);
    }

    const results: SearchResultItem[] = semanticResults.map((doc, index) => ({
      id: `semantic-${index}`,
      title: doc.title,
      excerpt: doc.chunkText.slice(0, 200).trim(),
      path: doc.filePath,
      score: doc.similarity,
    }));

    logger.info('시맨틱 검색 완료', { query, count: results.length });
    timer.end({ query, count: results.length });

    return { success: true, data: { query, results } };
  } catch (error) {
    logger.warn('시맨틱 검색 실패, 키워드 폴백', { query, error: String(error) });
    timer.end({ query, error: true, fallback: 'keyword' });
    return searchDocumentsKeyword(query);
  }
}

// ============================================
// RAG 질문 답변 (스트리밍)
// ============================================

/**
 * RAG 컨텍스트 수집
 */
async function gatherRAGContext(query: string): Promise<{
  context: string;
  sources: SearchResultItem[];
}> {
  try {
    const queryEmbedding = await embedQuery(query);
    const docs = await searchSimilarDocuments(queryEmbedding, 5, 0.5);

    if (docs.length > 0) {
      const context = docs
        .map((doc, i) => `[문서 ${i + 1}: ${doc.title || doc.filePath}]\n${doc.chunkText}`)
        .join('\n\n---\n\n');

      const sources: SearchResultItem[] = docs.map((doc, i) => ({
        id: `source-${i}`,
        title: doc.title,
        excerpt: doc.chunkText.slice(0, 150),
        path: doc.filePath,
        score: doc.similarity,
      }));

      return { context, sources };
    }
  } catch {
    // 시맨틱 검색 실패 → 키워드 폴백
  }

  // 키워드 폴백으로 컨텍스트 수집
  const keywordResult = await searchDocumentsKeyword(query);
  if (keywordResult.success && keywordResult.data.results.length > 0) {
    const topResults = keywordResult.data.results.slice(0, 3);
    const context = topResults
      .map((result, i) => {
        try {
          const fullPath = path.join(ROOT_DIR, result.path);
          const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 2000);
          return `[문서 ${i + 1}: ${result.title}]\n${content}`;
        } catch {
          return `[문서 ${i + 1}: ${result.title}]\n${result.excerpt}`;
        }
      })
      .join('\n\n---\n\n');

    return { context, sources: topResults };
  }

  return { context: '', sources: [] };
}

/**
 * 질문 답변 스트리밍
 */
export function askQuestionStream(
  _query: string,
  messages: Array<{ role: string; content: string }>
) {
  const model = getChatModel();

  return streamText({
    model,
    system: `당신은 DMS(문서 관리 시스템)의 AI 어시스턴트입니다.
사용자의 질문에 대해 제공된 문서 컨텍스트를 기반으로 정확하고 도움이 되는 답변을 제공하세요.

규칙:
- 제공된 문서 컨텍스트에 기반하여 답변하세요.
- 컨텍스트에 관련 정보가 없으면 솔직하게 "관련 문서를 찾지 못했습니다"라고 답하세요.
- 답변은 한국어로 작성하세요.
- 마크다운 형식을 사용해도 좋습니다.
- 출처 문서가 있으면 언급하세요.`,
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    onError: (error) => {
      logger.error('AI 스트리밍 에러', error);
    },
  });
}

/**
 * 사용자 메시지에 RAG 컨텍스트를 주입
 */
export async function buildRAGMessages(
  query: string,
  chatHistory: Array<{ role: string; content: string }>
): Promise<{
  messages: Array<{ role: string; content: string }>;
  sources: SearchResultItem[];
}> {
  const { context, sources } = await gatherRAGContext(query);

  const augmentedMessages = chatHistory.map((msg, index) => {
    if (index === chatHistory.length - 1 && msg.role === 'user' && context) {
      return {
        role: msg.role,
        content: `[참조 문서]\n${context}\n\n[사용자 질문]\n${msg.content}`,
      };
    }
    return msg;
  });

  return { messages: augmentedMessages, sources };
}

// ============================================
// 문서 요약 (Create)
// ============================================

/**
 * 텍스트 요약 스트리밍
 */
export function summarizeTextStream(text: string, templateType: string) {
  const model = getChatModel();

  const templatePrompts: Record<string, string> = {
    default: '다음 텍스트를 요약하세요. 핵심 포인트, 요약, 액션 아이템을 포함하세요.',
    doc: '다음 문서를 요약하세요. 목차, 핵심 요약, 결정 사항을 포함하세요.',
    sheet: '다음 데이터를 분석하세요. 주요 지표 요약, 표 구조 설명, 시사점을 포함하세요.',
    slide: '다음 슬라이드 내용을 요약하세요. 핵심 메시지와 각 슬라이드 요약을 포함하세요.',
    pdf: '다음 리포트를 요약하세요. 요약, 분석, 결론을 포함하세요.',
  };

  const prompt = templatePrompts[templateType] || templatePrompts.default;

  return streamText({
    model,
    system: '당신은 문서 요약 전문가입니다. 한국어로 답변하세요. 마크다운 형식을 사용하세요.',
    messages: [
      { role: 'user', content: `${prompt}\n\n---\n\n${text}` },
    ],
    onError: (error) => {
      logger.error('요약 스트리밍 에러', error);
    },
  });
}
