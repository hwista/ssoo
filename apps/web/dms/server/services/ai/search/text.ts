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

export function buildFallbackSummary(content: string): string {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((part) => stripMarkdown(part))
    .filter((part) => part.length > 0 && !part.startsWith('#'));
  const base = paragraphs[0] || stripMarkdown(content).slice(0, 260);
  return base.slice(0, 180);
}

export function buildPreviewSnippets(
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

export function buildExcerpt(
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

export function normalizeOneLineSummary(text: string): string {
  const cleaned = stripMarkdown(text)
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned.slice(0, 120);
}

export function toOneLineDescription(text: string, title: string): string {
  const cleaned = normalizeOneLineSummary(text)
    .replace(/\s*[|/]\s*/g, ' · ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  if (!cleaned) return `${title}의 핵심 주제와 목적을 설명하는 문서입니다.`;
  const separatorCount = (cleaned.match(/[·,]/g) || []).length;
  if (separatorCount >= 5) return `${title}의 핵심 주제와 목적을 설명하는 문서입니다.`;
  return cleaned;
}
