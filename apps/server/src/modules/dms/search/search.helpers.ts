import fs from 'fs';
import path from 'path';
import type {
  AiContextOptions,
  SearchConfidence,
  SearchResponse,
  SearchResultItem,
} from '@ssoo/types/dms';

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

export function tokenizeQuery(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'`/\\|]+/)
    .map(normalizeSearchToken)
    .filter((token) => token.length >= 2)
    .filter((token) => !QUERY_STOPWORDS.has(token));

  return Array.from(new Set(tokens));
}

export function inferConfidence(count: number): SearchConfidence {
  if (count >= 5) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

export function buildSearchResponse(
  query: string,
  results: SearchResultItem[],
  options?: AiContextOptions,
): SearchResponse {
  return {
    query,
    results,
    contextMode: options?.contextMode ?? 'doc',
    confidence: inferConfidence(results.length),
    citations: options?.contextMode === 'deep'
      ? results.filter((item) => item.isReadable).slice(0, 5).map((item) => ({
          title: item.title || item.path,
          storageUri: `doc://${item.path.replace(/^\/+/, '')}`,
          versionId: undefined,
          webUrl: undefined,
        }))
      : undefined,
  };
}

export function normalizePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }

  return inputPath
    .replace(/\\\\/g, '/')
    .replace(/\\/g, '/');
}

export function listMarkdownFiles(dirPath: string): string[] {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...listMarkdownFiles(fullPath));
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }

    return files;
  } catch {
    return [];
  }
}

export function resolveAbsolutePath(docPath: string, rootDir: string): string {
  if (path.isAbsolute(docPath)) return docPath;
  return path.join(rootDir, normalizePath(docPath));
}

export function toDisplayPath(filePath: string, rootDir: string): string {
  if (path.isAbsolute(filePath)) {
    const relative = path.relative(rootDir, filePath);
    if (relative.startsWith('..')) {
      return normalizePath(filePath);
    }
    return normalizePath(relative);
  }

  return normalizePath(filePath);
}

export function toRelativePath(filePath: string, rootDir: string): string {
  return normalizePath(path.relative(rootDir, filePath));
}

export function resolveDocumentPresentation(
  filePath: string,
  rootDir: string,
  fallbackTitle: string,
): { title: string; metadataSummary?: string } {
  const fileName = path.basename(filePath).replace(/\.md$/i, '');
  let title = fallbackTitle || fileName;

  try {
    const resolved = resolveAbsolutePath(filePath, rootDir);
    if (fs.existsSync(resolved)) {
      const content = fs.readFileSync(resolved, 'utf-8');
      title = extractTitle(content, path.basename(resolved));
    }
  } catch {
    // ignore and keep fallback title
  }

  return {
    title,
  };
}

export function extractTitle(content: string, fileName: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  return headingMatch?.[1]?.trim() || fileName.replace(/\.md$/i, '');
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildPreviewSnippets(
  content: string,
  query: string,
  terms: string[],
  limit = 4,
): { snippets: string[]; totalCount: number } {
  const source = stripMarkdown(content);
  const lowered = source.toLowerCase();
  const needles = Array.from(new Set(
    [query.trim().toLowerCase(), ...terms.map((term) => term.toLowerCase())]
      .map((term) => term.trim())
      .filter((term) => term.length >= 2),
  )).sort((a, b) => b.length - a.length);

  if (needles.length === 0 || source.length === 0) {
    return { snippets: [], totalCount: 0 };
  }

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
        if (snippets.length < limit) {
          snippets.push(snippet);
        }
      }

      from = hit + needle.length;
    }
  }

  return { snippets, totalCount };
}

export function buildExcerpt(
  content: string,
  query: string,
  terms: string[],
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
    return {
      excerpt: content.slice(0, 180).trim() || '내용을 불러올 수 없습니다.',
      score,
    };
  }

  const start = Math.max(index - 80, 0);
  const end = Math.min(index + 120, content.length);
  return {
    excerpt: content.slice(start, end).replace(/\s+/g, ' ').trim(),
    score,
  };
}

export function buildAutoSummary(
  content: string,
  query: string,
  terms: string[],
  snippets: string[],
): string {
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

  const base = clean.slice(0, 180).trim();
  if (base) return base;

  return '문서 내용을 바탕으로 요약을 생성했습니다.';
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}
