'use client';

import { cn } from '@/lib/utils';

export interface SearchResultCardData {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  summary?: string;
  snippets?: string[];
  totalSnippetCount?: number;
}

interface SearchResultCardProps {
  id?: string;
  result: SearchResultCardData;
  highlighted?: boolean;
  compact?: boolean;
  highlightTerms?: string[];
  onClick?: () => void;
  className?: string;
}

function canonicalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function renderPath(path: string) {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return path;

  return (
    <span className="flex flex-wrap items-center gap-1 text-caption">
      {segments.map((segment, index) => (
        <span
          key={`${segment}-${index}`}
          className={cn(index === segments.length - 1 ? 'text-label-sm text-ssoo-primary' : 'text-ssoo-primary/60')}
        >
          {index > 0 && <span className="mr-1 text-ssoo-primary/40">/</span>}
          {segment}
        </span>
      ))}
    </span>
  );
}

function splitWithHighlight(text: string, terms: string[]) {
  const normalizedTerms = Array.from(new Set(
    terms
      .map((term) => term.trim())
      .filter((term) => term.length >= 2)
  )).sort((a, b) => b.length - a.length);

  if (normalizedTerms.length === 0) return [text];

  const escaped = normalizedTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  return text.split(regex).filter((part) => part.length > 0);
}

export function SearchResultCard({
  id,
  result,
  highlighted = false,
  compact = false,
  highlightTerms = [],
  onClick,
  className,
}: SearchResultCardProps) {
  const titleText = result.title?.trim() || '';
  const titleCanon = canonicalize(titleText);
  const rawSummary = result.summary?.trim() || '';
  const blocked = new Set<string>([titleCanon].filter(Boolean));

  const rawSnippets = (result.snippets ?? []).map((item) => item.trim()).filter(Boolean);
  const fallbackSnippet = result.excerpt?.trim() ? [result.excerpt.trim()] : [];
  const uniqueSnippets = (rawSnippets.length > 0 ? rawSnippets : fallbackSnippet)
    .filter((snippet) => {
      const canon = canonicalize(snippet);
      if (!canon || blocked.has(canon)) return false;
      blocked.add(canon);
      return true;
    })
    .slice(0, 4);

  const summaryText = (() => {
    const summaryCanon = canonicalize(rawSummary);
    if (summaryCanon && summaryCanon !== titleCanon) return rawSummary;
    return uniqueSnippets[0] || result.excerpt?.trim() || '문서 핵심 내용을 요약했습니다.';
  })();
  const previewSnippets = uniqueSnippets.filter((snippet) => canonicalize(snippet) !== canonicalize(summaryText));

  const content = (
    <div className={cn(compact ? 'p-3' : 'p-4', 'text-left')}>
      <h3 className="text-title-card text-ssoo-primary">
        {result.title}
      </h3>

      <p className={cn(compact ? 'mt-1' : 'mt-1.5', 'line-clamp-2 text-body-sm text-ssoo-primary/80')}>
        <span className={cn(
          'mr-1.5 inline-flex items-center rounded-full border border-ssoo-content-border bg-ssoo-content-bg px-1.5 py-0 text-badge text-ssoo-primary'
        )}>
          AI 요약
        </span>
        {summaryText}
      </p>

      {previewSnippets.length > 0 && (
        <div className={cn(compact ? 'mt-2' : 'mt-2.5')}>
          <div className={cn('flex items-center gap-4 overflow-x-auto whitespace-nowrap pb-1')}>
            {previewSnippets.map((snippet, index) => (
              <span key={`${result.id}-snippet-${index}`} className="shrink-0 text-caption text-ssoo-primary/70">
              {splitWithHighlight(snippet, highlightTerms).map((part, partIndex) => {
                const isHit = highlightTerms.some((term) => term.length >= 2 && part.toLowerCase() === term.toLowerCase());
                if (!isHit) return <span key={`${result.id}-snippet-${index}-${partIndex}`}>{part}</span>;
                return (
                  <mark
                    key={`${result.id}-snippet-${index}-${partIndex}`}
                    className="rounded-sm bg-ssoo-content-border px-0.5 text-ssoo-primary"
                  >
                    {part}
                  </mark>
                );
              })}
              </span>
            ))}
            <span className="ml-2 shrink-0 text-caption text-ssoo-primary/55">
              총 {result.totalSnippetCount ?? previewSnippets.length}개 키워드 추출됨
            </span>
          </div>
        </div>
      )}

      <div className={cn(compact ? 'mt-2' : 'mt-3', 'text-ssoo-primary/70')}>
        {renderPath(result.path)}
      </div>
    </div>
  );

  const rootClassName = cn(
    'w-full rounded-lg border border-ssoo-content-border transition-colors',
    highlighted ? 'bg-ssoo-content-bg' : 'bg-white',
    onClick && 'hover:bg-ssoo-content-bg/40',
    className,
  );

  if (onClick) {
    return (
      <button id={id} type="button" onClick={onClick} className={rootClassName}>
        {content}
      </button>
    );
  }

  return (
    <article id={id} className={rootClassName}>
      {content}
    </article>
  );
}
