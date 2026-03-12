import { generateText } from 'ai';
import { getChatModel } from '@/server/services/ai/provider';
import {
  buildFallbackSummary,
  normalizeOneLineSummary,
  stripMarkdown,
  toOneLineDescription,
} from './text';

const SEARCH_SUMMARY_TIMEOUT_MS = 4500;

export function buildAutoSummary(
  content: string,
  query: string,
  terms: string[],
  snippets: string[]
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
  const selected = scored.filter((item) => item.score > 0).slice(0, 2).map((item) => item.sentence);
  const fromScored = selected.join(' ').trim().slice(0, 220);
  if (fromScored) return fromScored;
  const fromSnippet = snippets.find((snippet) => snippet.trim().length > 0)?.trim();
  if (fromSnippet) return fromSnippet.slice(0, 220);
  const fromFallback = buildFallbackSummary(content).trim();
  if (fromFallback) return fromFallback;
  return '문서 내용을 바탕으로 요약을 생성했습니다.';
}

export async function mapWithConcurrency<T, R>(
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

export async function buildAiOneLineSummary(
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
