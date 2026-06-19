'use client';

import type { ReactNode } from 'react';
import { cn } from '../cn';
import type {
  SsooAiSearchBlockedSourceSummary,
  SsooAiSearchResultItem,
} from './searchPageUtils';
import { Button } from '@ssoo/web-ui';

export interface SsooAiSearchResultRenderState {
  id: string;
  index: number;
  highlighted: boolean;
  highlightTerms: string[];
  onOpen: () => void;
}

export interface SsooAiSearchResultsPanelProps<T extends SsooAiSearchResultItem = SsooAiSearchResultItem> {
  hasSearched: boolean;
  isSearching: boolean;
  hasCompletedSearch: boolean;
  results: T[];
  blockedSources?: SsooAiSearchBlockedSourceSummary;
  filterQuery: string;
  matchedIndexSet: Set<number>;
  snippetHighlightTerms: string[];
  onOpenSearchResult: (item: T) => void | Promise<void>;
  renderResult?: (item: T, state: SsooAiSearchResultRenderState) => ReactNode;
  topSlot?: ReactNode;
  errorMessage?: string;
  blockedSourceNoun?: string;
}

function SsooAiSearchLoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 min-h-[240px] items-center justify-center gap-2 text-body-sm text-ssoo-primary/70">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ssoo-content-border border-t-ssoo-primary" />
      <span>{message}</span>
    </div>
  );
}

function SsooAiSearchDefaultResultCard<T extends SsooAiSearchResultItem>({
  id,
  result,
  highlighted,
  onOpen,
}: {
  id: string;
  result: T;
  highlighted: boolean;
  onOpen: () => void;
}) {
  return (
    <Button variant="plain" size="plain"
      id={id}
      type="button"
      onClick={onOpen}
      className={cn(
        'block w-full min-w-0 overflow-hidden whitespace-normal rounded-lg border border-ssoo-content-border bg-white p-4 text-left transition-colors hover:bg-ssoo-content-bg/40',
        'items-stretch justify-start gap-0',
        highlighted && 'bg-ssoo-content-bg'
      )}
    >
      <h3 className="text-title-card text-ssoo-primary">{result.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-body-sm text-ssoo-primary/80">
        {result.summary || result.excerpt || '표시할 본문 미리보기가 없습니다.'}
      </p>
      <p className="mt-3 truncate text-caption text-ssoo-primary/60">{result.path}</p>
    </Button>
  );
}

export function SsooAiSearchResultsPanel<T extends SsooAiSearchResultItem = SsooAiSearchResultItem>({
  hasSearched,
  isSearching,
  hasCompletedSearch,
  results,
  blockedSources,
  filterQuery,
  matchedIndexSet,
  snippetHighlightTerms,
  onOpenSearchResult,
  renderResult,
  topSlot,
  errorMessage,
  blockedSourceNoun = '문서',
}: SsooAiSearchResultsPanelProps<T>) {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="flex min-h-full flex-col px-8 py-6">
          {topSlot ? <div className="mb-4 shrink-0">{topSlot}</div> : null}
          {!hasSearched ? (
            <div className="flex flex-1 min-h-[240px] items-center justify-center text-body-sm text-ssoo-primary/60">
              검색어를 입력하면 결과가 표시됩니다.
            </div>
          ) : isSearching || !hasCompletedSearch ? (
            <SsooAiSearchLoadingState message="AI 검색 결과를 불러오는 중입니다..." />
          ) : errorMessage ? (
            <div className="flex flex-1 min-h-[240px] items-center justify-center text-body-sm text-ssoo-primary/60">
              {errorMessage}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-1 min-h-[240px] items-center justify-center text-body-sm text-ssoo-primary/60">
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {blockedSources && blockedSources.totalCount > 0 ? (
                <div className="rounded-md border border-ssoo-warning/30 bg-ssoo-warning/10 px-4 py-3 text-body-sm text-ssoo-primary">
                  <p className="font-medium">
                    권한 때문에 제외된 {blockedSourceNoun} {blockedSources.totalCount}개가 있습니다.
                  </p>
                  <p className="mt-1 text-caption text-ssoo-primary/70">
                    {blockedSources.reasons
                      .map((reason) => `${reason.label} ${reason.count}개`)
                      .join(', ')}
                  </p>
                </div>
              ) : null}
              {results.map((item, index) => {
                const id = `search-result-${index}`;
                const highlighted = filterQuery.trim().length > 0 && matchedIndexSet.has(index);
                const onOpen = () => {
                  void onOpenSearchResult(item);
                };
                return (
                  <div key={item.id}>
                    {renderResult ? renderResult(item, {
                      id,
                      index,
                      highlighted,
                      highlightTerms: snippetHighlightTerms,
                      onOpen,
                    }) : (
                      <SsooAiSearchDefaultResultCard
                        id={id}
                        result={item}
                        highlighted={highlighted}
                        onOpen={onOpen}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { SsooAiSearchResultsPanel as SearchResultsPanel };
