'use client';

import type { DmsDocumentAccessRequestState } from '@ssoo/types/dms';
import { cn } from '@/lib/utils';
import {
  normalizeDocumentAccessRequestPath,
  useDocumentAccessRequestStore,
} from '@/stores/document-access-request.store';

export interface SearchResultCardData {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  summary?: string;
  snippets?: string[];
  totalSnippetCount?: number;
  owner?: string;
  visibilityScope?: 'public' | 'organization' | 'self' | 'legacy';
  isReadable: boolean;
  canRequestRead: boolean;
  readRequest?: DmsDocumentAccessRequestState;
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

function renderVisibilityLabel(scope: SearchResultCardData['visibilityScope']) {
  switch (scope) {
    case 'public':
      return '전체 공개';
    case 'organization':
      return '조직 공개';
    case 'self':
      return '나만 보기';
    default:
      return '기존 ACL';
  }
}

function formatRequestDateLabel(value?: string) {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRequestActionLabel(
  result: SearchResultCardData,
  request: DmsDocumentAccessRequestState | undefined,
) {
  if (result.isReadable) {
    return '문서 열기';
  }

  if (request?.status === 'pending') {
    return '요청 진행 중';
  }

  if (request?.status === 'rejected') {
    return '요청 재시도';
  }

  if (request?.status === 'approved') {
    return '승인 반영 중';
  }

  return result.canRequestRead ? '읽기 권한 요청' : '열람 불가';
}

function getRequestStatusLabel(request: DmsDocumentAccessRequestState) {
  switch (request.status) {
    case 'approved':
      return '승인됨';
    case 'rejected':
      return '거절됨';
    case 'pending':
    default:
      return '요청 대기';
  }
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
  const requestPathKey = normalizeDocumentAccessRequestPath(result.path);
  const requestOverride = useDocumentAccessRequestStore((state) => (
    requestPathKey ? state.overrides[requestPathKey] : undefined
  ));
  const effectiveReadRequest = requestOverride ?? result.readRequest;
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

      <div className={cn(compact ? 'mt-1.5' : 'mt-2', 'flex flex-wrap items-center gap-2')}>
        <span className="inline-flex items-center rounded-full border border-ssoo-content-border bg-ssoo-content-bg px-1.5 py-0 text-badge text-ssoo-primary">
          {result.isReadable ? '열람 가능' : '발견 전용'}
        </span>
        <span className="inline-flex items-center rounded-full border border-ssoo-content-border bg-white px-1.5 py-0 text-badge text-ssoo-primary/75">
          {renderVisibilityLabel(result.visibilityScope)}
        </span>
        {result.owner && (
          <span className="text-caption text-ssoo-primary/65">
            Owner: {result.owner}
          </span>
        )}
      </div>

      <p className={cn(compact ? 'mt-1' : 'mt-1.5', 'line-clamp-2 text-body-sm text-ssoo-primary/80')}>
        <span className={cn(
          'mr-1.5 inline-flex items-center rounded-full border border-ssoo-content-border bg-ssoo-content-bg px-1.5 py-0 text-badge text-ssoo-primary'
        )}>
          AI 요약
        </span>
        {summaryText}
      </p>

      {!result.isReadable && effectiveReadRequest && (
        <div className={cn(compact ? 'mt-2' : 'mt-2.5', 'rounded-md border border-ssoo-content-border bg-ssoo-content-bg/40 px-3 py-2')}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-ssoo-content-border bg-white px-2 py-0.5 text-badge text-ssoo-primary">
              {getRequestStatusLabel(effectiveReadRequest)}
            </span>
            <span className="text-caption text-ssoo-primary/70">
              {formatRequestDateLabel(effectiveReadRequest.respondedAt ?? effectiveReadRequest.requestedAt)}
            </span>
          </div>
          {effectiveReadRequest.responseMessage ? (
            <p className="mt-1 text-caption text-ssoo-primary/75">
              {effectiveReadRequest.responseMessage}
            </p>
          ) : effectiveReadRequest.requestMessage ? (
            <p className="mt-1 text-caption text-ssoo-primary/75">
              {effectiveReadRequest.requestMessage}
            </p>
          ) : null}
        </div>
      )}

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

      <div className={cn(compact ? 'mt-2' : 'mt-3', 'flex items-center justify-between gap-3 text-ssoo-primary/70')}>
        <div className="min-w-0">
          {renderPath(result.path)}
        </div>
        <span className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-caption',
          result.isReadable
            ? 'bg-ssoo-content-bg text-ssoo-primary'
            : effectiveReadRequest?.status === 'pending'
              ? 'bg-amber-50 text-amber-700'
              : effectiveReadRequest?.status === 'rejected'
                ? 'bg-rose-50 text-rose-700'
                : result.canRequestRead
              ? 'bg-ssoo-content-border/60 text-ssoo-primary'
              : 'bg-slate-100 text-slate-500',
        )}>
          {getRequestActionLabel(result, effectiveReadRequest)}
        </span>
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
