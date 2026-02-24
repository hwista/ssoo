/**
 * AI Handler - 질문/검색/요약 API 처리
 * Vercel AI SDK + pgvector 기반
 *
 * Route: /api/ask (스트리밍), /api/search, /api/create
 */

import fs from 'fs';
import path from 'path';
import { generateText, streamText } from 'ai';
import { normalizePath } from '@/lib/utils/pathUtils';
import { isMarkdownFile } from '@/lib/utils/fileUtils';
import { LIMITS } from '@/lib/utils/constants';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';
import { getChatModel, embedQuery, searchSimilarDocuments } from '../services/ai';
import { configService } from '@/server/services/config/ConfigService';

/** 위키 루트 디렉토리 (ConfigService에서 동적 조회) */
function getRootDir(): string {
  return configService.getWikiDir();
}

// ============================================
// Types
// ============================================

export interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  score: number;
  summary?: string;
  snippets?: string[];
  totalSnippetCount?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
}

export type HandlerResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

const SEARCH_SUMMARY_TIMEOUT_MS = 4500;
const SEARCH_SUMMARY_CONCURRENCY = 3;

const IMPLEMENTATION_CONTEXT = [
  'DMS 실제 구현 기능 스냅샷(코드 기준):',
  '- 라우트/API: /api/search(문서 검색), /api/ask(대화형 답변), /api/create(요약/작성 보조), /api/file, /api/files, /api/git, /api/settings',
  '- 주요 화면 경로: /home, /doc/{path}, /wiki/new(직접 작성), /ai/search(AI 검색), /ai/create(AI 작성), /settings',
  '- 상단 헤더 기능: 검색 입력(Enter 시 /ai/search 탭), 새 도큐먼트(UI 작성=/wiki/new, AI 작성=/ai/create)',
  '- 플로팅 AI 어시스턴트: 질문/검색 의도 분기, 문서 검색 결과 카드, 헬프 액션 버튼(기능 화면으로 즉시 이동)',
  '- 문서 검색 방식: pgvector 시맨틱 검색 우선, 실패/무결과 시 키워드 검색 폴백',
  '- 답변 생성 방식: RAG(검색 문맥 주입) + 대화형 응답, 문맥 부족 시 보조 설명 제공',
].join('\n');

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

interface SidecarMetadataShape {
  title?: string;
  summary?: string;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveAbsolutePath(docPath: string): string {
  if (path.isAbsolute(docPath)) return docPath;
  return path.join(getRootDir(), normalizePath(docPath));
}

function toDisplayPath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    const relative = path.relative(getRootDir(), filePath);
    if (relative.startsWith('..')) return normalizePath(filePath);
    return normalizePath(relative);
  }
  return normalizePath(filePath);
}

function readSidecarMetadata(filePath: string): SidecarMetadataShape | null {
  try {
    const resolved = resolveAbsolutePath(filePath);
    const parsed = path.parse(resolved);
    const sidecarPath = path.join(parsed.dir, `${parsed.name}.sidecar.json`);
    if (!fs.existsSync(sidecarPath)) return null;
    const raw = fs.readFileSync(sidecarPath, 'utf-8');
    return JSON.parse(raw) as SidecarMetadataShape;
  } catch {
    return null;
  }
}

function buildFallbackSummary(content: string): string {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((part) => stripMarkdown(part))
    .filter((part) => part.length > 0 && !part.startsWith('#'));
  const base = paragraphs[0] || stripMarkdown(content).slice(0, 260);
  return base.slice(0, 180);
}

function buildPreviewSnippets(
  content: string,
  query: string,
  terms: string[],
  limit = 4
): { snippets: string[]; totalCount: number } {
  const source = stripMarkdown(content);
  const lowered = source.toLowerCase();
  const needles = Array.from(new Set(
    [query.trim().toLowerCase(), ...terms.map((term) => term.toLowerCase())]
      .map((term) => term.trim())
      .filter((term) => term.length >= 2)
  )).sort((a, b) => b.length - a.length);

  if (needles.length === 0 || source.length === 0) return { snippets: [], totalCount: 0 };

  const snippets: string[] = [];
  const seen = new Set<string>();
  let totalCount = 0;

  for (const needle of needles) {
    let from = 0;
    while (true) {
      const hit = lowered.indexOf(needle, from);
      if (hit < 0) break;

      const prefixStart = Math.max(0, hit - 5);
      const suffixEnd = Math.min(source.length, hit + needle.length + 5);
      const prefix = source.slice(prefixStart, hit);
      const keyword = source.slice(hit, hit + needle.length);
      const suffix = source.slice(hit + needle.length, suffixEnd);
      const snippet = `...${prefix}${keyword}${suffix}...`;
      const dedupeKey = snippet.toLowerCase();
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        totalCount += 1;
        if (snippets.length < limit) {
          snippets.push(snippet);
        }
      }

      from = hit + needle.length;
    }
  }

  return { snippets, totalCount };
}

function resolveDocumentPresentation(
  filePath: string,
  content: string,
  fallbackTitle: string
): { title: string; sidecarSummary?: string } {
  const sidecar = readSidecarMetadata(filePath);
  const fileName = path.basename(filePath).replace(/\.md$/i, '');
  const title = sidecar?.title?.trim() || fallbackTitle || fileName;
  return { title, sidecarSummary: sidecar?.summary?.trim() };
}

function buildAutoSummary(content: string, query: string, terms: string[], snippets: string[]): string {
  const clean = stripMarkdown(content);
  const sentences = clean
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 18);

  const loweredQuery = query.trim().toLowerCase();
  const loweredTerms = terms.map((term) => term.toLowerCase());
  const scored = sentences.map((sentence, index) => {
    const lower = sentence.toLowerCase();
    let score = 0;
    if (loweredQuery && lower.includes(loweredQuery)) score += 6;
    for (const term of loweredTerms) {
      if (term && lower.includes(term)) score += 2;
    }
    score += Math.max(0, 2 - Math.floor(index / 3));
    return { sentence, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored
    .filter((item) => item.score > 0)
    .slice(0, 2)
    .map((item) => item.sentence);

  const fromScored = selected.join(' ').trim().slice(0, 220);
  if (fromScored) return fromScored;

  const fromSnippet = snippets.find((snippet) => snippet.trim().length > 0)?.trim();
  if (fromSnippet) return fromSnippet.slice(0, 220);

  const fromFallback = buildFallbackSummary(content).trim();
  if (fromFallback) return fromFallback;

  return '문서 내용을 바탕으로 요약을 생성했습니다.';
}

function normalizeOneLineSummary(text: string): string {
  const cleaned = stripMarkdown(text)
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned.slice(0, 120);
}

function toOneLineDescription(text: string, title: string): string {
  const cleaned = normalizeOneLineSummary(text)
    .replace(/\s*[|/]\s*/g, ' · ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  if (!cleaned) return `${title}의 핵심 주제와 목적을 설명하는 문서입니다.`;

  const separatorCount = (cleaned.match(/[·,]/g) || []).length;
  if (separatorCount >= 5) {
    return `${title}의 핵심 주제와 목적을 설명하는 문서입니다.`;
  }

  return cleaned;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= items.length) break;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function buildAiOneLineSummary(
  title: string,
  content: string,
  query: string,
  fallbackSummary: string
): Promise<string> {
  try {
    const model = await getChatModel();
    const source = stripMarkdown(content).slice(0, 1400);
    const task = generateText({
      model,
      temperature: 0,
      maxOutputTokens: 64,
      prompt: [
        '다음 문서를 한 줄로 설명하세요.',
        '- 한국어',
        '- 나열 금지, 키워드 열거 금지',
        '- 문서의 목적/주제를 자연스럽게 설명',
        '- 35~70자 권장',
        '',
        `검색 질의: ${query}`,
        `문서 제목: ${title}`,
        `문서 본문(일부): ${source}`,
      ].join('\n'),
    });

    const result = await Promise.race([
      task,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SEARCH_SUMMARY_TIMEOUT_MS)),
    ]);

    if (!result || typeof result !== 'object' || !('text' in result)) {
      return toOneLineDescription(fallbackSummary, title);
    }

    const summary = normalizeOneLineSummary(String(result.text ?? ''));
    return toOneLineDescription(summary || fallbackSummary, title);
  } catch {
    return toOneLineDescription(fallbackSummary, title);
  }
}

const QUERY_STOPWORDS = new Set([
  '문서', '관련', '내용', '기능', '화면', '페이지', '설명', '정리', '요약', '검색',
  '찾아', '찾아줘', '찾아주세요', '알려줘', '알려주세요', '보여줘', '보여주세요',
  '해줘', '해주세요', '해줘요', '해주세요요', '대한', '위한', '기준', '에서', '으로',
  'what', 'where', 'when', 'how', 'why', 'find', 'show', 'search', 'about', 'please',
]);

function normalizeSearchToken(raw: string): string {
  let token = raw
    .toLowerCase()
    .replace(/^[^a-z0-9가-힣]+|[^a-z0-9가-힣]+$/g, '')
    .trim();

  if (!token) return '';

  token = token
    .replace(/(해줘요|해주세요요|해주세요|해줘|알려줘|보여줘|찾아줘|정리해줘|요약해줘)$/g, '')
    .replace(/(입니다|인가요|인가|일까|할까|해요|해라)$/g, '')
    .replace(/(에서|으로|에게|한테|까지|부터|보다|처럼)$/g, '')
    .replace(/(은|는|이|가|을|를|의|와|과|도|만|로|에)$/g, '')
    .trim();

  return token;
}

function tokenizeQuery(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'`/\\|]+/)
    .map(normalizeSearchToken)
    .filter((token) => token.length >= 2)
    .filter((token) => !QUERY_STOPWORDS.has(token));

  return Array.from(new Set(tokens));
}

function buildExcerpt(
  content: string,
  query: string,
  terms: string[]
): { excerpt: string; score: number } {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const exactIndex = lowerContent.indexOf(lowerQuery);
  const exactScore = lowerQuery ? lowerContent.split(lowerQuery).length - 1 : 0;

  let matchedTermIndex = -1;
  let termScore = 0;

  for (const term of terms) {
    const firstIndex = lowerContent.indexOf(term);
    if (matchedTermIndex === -1 && firstIndex !== -1) {
      matchedTermIndex = firstIndex;
    }

    if (firstIndex !== -1) {
      termScore += lowerContent.split(term).length - 1;
    }
  }

  const index = exactIndex !== -1 ? exactIndex : matchedTermIndex;
  const score = exactScore > 0 ? exactScore * 5 + termScore : termScore;

  if (index === -1) {
    return { excerpt: content.slice(0, 180).trim() || '내용을 불러올 수 없습니다.', score };
  }

  const start = Math.max(index - 80, 0);
  const end = Math.min(index + 120, content.length);
  const snippet = content.slice(start, end).replace(/\s+/g, ' ').trim();
  return { excerpt: snippet, score };
}

function toRelativePath(filePath: string): string {
  const relative = path.relative(getRootDir(), filePath);
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
      const presentation = resolveDocumentPresentation(filePath, content, fallbackTitle);
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
      const score = contentScore + metaScore;

      results.push({
        id: filePath,
        title: presentation.title,
        excerpt,
        path: relativePath,
        score,
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

    return { success: true, data: { query, results: finalizedResults } };
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
    const terms = tokenizeQuery(query);
    const queryEmbedding = await embedQuery(query);
    const semanticResults = await searchSimilarDocuments(queryEmbedding, LIMITS.MAX_SEARCH_RESULTS, 0.5);

    if (semanticResults.length === 0) {
      logger.info('시맨틱 검색 결과 없음, 키워드 폴백', { query });
      return searchDocumentsKeyword(query);
    }

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
      const presentation = resolveDocumentPresentation(doc.filePath, content, fallbackTitle);
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
      SEARCH_SUMMARY_CONCURRENCY,
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

    return { success: true, data: { query, results: finalizedResults } };
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
          const fullPath = path.join(getRootDir(), result.path);
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
export async function askQuestionStream(
  _query: string,
  messages: Array<{ role: string; content: string }>,
  options?: { attachmentOnly?: boolean }
) {
  const model = await getChatModel();

  const attachmentOnlyRule = options?.attachmentOnly
    ? `
- 현재 대화는 "첨부 파일 기반 모드"입니다.
- 답변은 반드시 사용자가 첨부한 파일 컨텍스트만 근거로 작성하세요.
- 전역 문서 검색 결과, 시스템 구현 지식, 일반 추측을 근거로 단정하지 마세요.
- 첨부 내용에서 확인되지 않으면 "첨부 파일 기준 확인되지 않음"이라고 명시하세요.`
    : '';

  return streamText({
    model,
    system: `당신은 DMS(문서 관리 시스템)의 AI 어시스턴트입니다.
사용자의 질문에 대해 "실제 구현 컨텍스트"와 "문서 컨텍스트"를 우선 활용하고, 대화 맥락을 반영해 실무적으로 답변하세요.

규칙:
- 답변 우선순위는 1) 실제 구현 컨텍스트 2) 문서 컨텍스트 3) 일반 보조 설명 순서입니다.
- 이전 대화 흐름(직전 질문/답변)을 이어받아 답변하세요.
- 기능/사용법 질문에는 실제 경로, 버튼명, 동작 흐름을 단계로 제시하세요.
- 문서 컨텍스트에 근거가 있으면 이를 사용하고, 근거 문서(제목/경로)를 간단히 언급하세요.
- 문서 컨텍스트가 부족해도 대화를 중단하지 말고, 일반적인 보조 설명을 제공하세요.
- 단, 문서에 없는 내용은 "문서 기준 확인되지 않은 보조 설명"임을 짧게 구분해 표현하세요.
- 구현 컨텍스트로 답할 수 있는데 "관련 문서를 찾지 못했습니다"라고 답하지 마세요.
- 구현/문서 모두에서 확인 불가한 사실은 "현재 코드/문서 기준 미확인"이라고 명시하세요.
- 답변은 한국어로 작성하세요.
- 문장은 짧은 단락으로 나누어 가독성 있게 작성하세요.${attachmentOnlyRule}`,
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    onError: (error: unknown) => {
      const err = error instanceof Error ? error : (error as Record<string, unknown>)?.error;
      const errObj = err instanceof Error ? err : null;
      logger.error('AI 스트리밍 에러', {
        message: errObj?.message ?? String(error),
        name: errObj?.name,
        cause: errObj?.cause,
        stack: errObj?.stack?.split('\n').slice(0, 3).join('\n'),
        raw: JSON.stringify(error, null, 2),
      });
    },
  });
}

/**
 * 사용자 메시지에 RAG 컨텍스트를 주입
 */
export async function buildRAGMessages(
  query: string,
  chatHistory: Array<{ role: string; content: string }>,
  options?: { skipSearch?: boolean; includeImplementationContext?: boolean }
): Promise<{
  messages: Array<{ role: string; content: string }>;
  sources: SearchResultItem[];
}> {
  const includeImplementationContext = options?.includeImplementationContext ?? true;
  const { context, sources } = options?.skipSearch
    ? { context: '', sources: [] as SearchResultItem[] }
    : await gatherRAGContext(query);

  const augmentedMessages = chatHistory.map((msg, index) => {
    if (index === chatHistory.length - 1 && msg.role === 'user') {
      const sections: string[] = [];
      if (includeImplementationContext) {
        sections.push(`[시스템 구현 컨텍스트]\n${IMPLEMENTATION_CONTEXT}`);
      }
      if (context) {
        sections.push(`[참조 문서]\n${context}`);
      }
      if (sections.length === 0) {
        return msg;
      }
      return {
        role: msg.role,
        content: `${sections.join('\n\n')}\n\n[사용자 질문]\n${msg.content}`,
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
export async function summarizeTextStream(text: string, templateType: string) {
  const model = await getChatModel();

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
