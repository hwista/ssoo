import fs from 'fs';
import path from 'path';
import { generateText } from 'ai';
import { normalizePath } from '@/lib/utils/pathUtils';
import { isMarkdownFile } from '@/lib/utils/fileUtils';
import { LIMITS } from '@/lib/utils/constants';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';
import { configService } from '@/server/services/config/ConfigService';
import { getChatModel } from './provider';
import { embedQuery, searchSimilarDocuments } from './embedding';
import type { AiContextOptions, HandlerResult, SearchResponse, SearchResultItem } from './types';

const SEARCH_SUMMARY_TIMEOUT_MS = 4500;
const SEARCH_SUMMARY_CONCURRENCY = 3;
const QUERY_STOPWORDS = new Set([
  '문서', '관련', '내용', '기능', '화면', '페이지', '설명', '정리', '요약', '검색',
  '찾아', '찾아줘', '찾아주세요', '알려줘', '알려주세요', '보여줘', '보여주세요',
  '해줘', '해주세요', '해줘요', '해주세요요', '대한', '위한', '기준', '에서', '으로',
  'what', 'where', 'when', 'how', 'why', 'find', 'show', 'search', 'about', 'please',
]);

interface SidecarMetadataShape {
  title?: string;
  summary?: string;
}

function getRootDir(): string {
  return configService.getWikiDir();
}

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
      const snippet = `...${source.slice(prefixStart, hit)}${source.slice(hit, hit + needle.length)}${source.slice(hit + needle.length, suffixEnd)}...`;
      const dedupeKey = snippet.toLowerCase();
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        totalCount += 1;
        if (snippets.length < limit) snippets.push(snippet);
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
  const selected = scored.filter((item) => item.score > 0).slice(0, 2).map((item) => item.sentence);
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
  if (separatorCount >= 5) return `${title}의 핵심 주제와 목적을 설명하는 문서입니다.`;
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
  return { excerpt: content.slice(start, end).replace(/\s+/g, ' ').trim(), score };
}

function toRelativePath(filePath: string): string {
  return normalizePath(path.relative(getRootDir(), filePath));
}

export function buildCitations(items: SearchResultItem[]) {
  return items.slice(0, 5).map((item) => ({
    title: item.title || item.path,
    storageUri: `wiki://${item.path.replace(/^\/+/, '')}`,
    versionId: undefined,
    webUrl: undefined,
  }));
}

export function inferConfidence(count: number): 'high' | 'medium' | 'low' {
  if (count >= 5) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

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
      data: {
        query,
        results: finalizedResults,
        contextMode: options?.contextMode ?? 'wiki',
        confidence: inferConfidence(finalizedResults.length),
        citations: options?.contextMode === 'deep' ? buildCitations(finalizedResults) : undefined,
      },
    };
  } catch (error) {
    logger.error('키워드 검색 실패', error, { query });
    timer.end({ query, error: true });
    return { success: false, error: '검색 처리 중 오류가 발생했습니다.', status: 500 };
  }
}

export async function searchDocuments(
  query: string,
  options?: AiContextOptions
): Promise<HandlerResult<SearchResponse>> {
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
      return searchDocumentsKeyword(query, options);
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

    return {
      success: true,
      data: {
        query,
        results: finalizedResults,
        contextMode: options?.contextMode ?? 'wiki',
        confidence: inferConfidence(finalizedResults.length),
        citations: options?.contextMode === 'deep' ? buildCitations(finalizedResults) : undefined,
      },
    };
  } catch (error) {
    logger.warn('시맨틱 검색 실패, 키워드 폴백', { query, error: String(error) });
    timer.end({ query, error: true, fallback: 'keyword' });
    return searchDocumentsKeyword(query, options);
  }
}
