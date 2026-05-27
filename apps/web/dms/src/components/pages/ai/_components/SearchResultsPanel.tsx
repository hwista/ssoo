'use client';

import { LoadingState } from '@/components/common/StateDisplay';
import { SearchResultCard } from '@/components/common/assistant/_components/ResultCard';
import { SHELL_BODY_WRAPPER_PRESETS } from '@/components/templates/page-frame';
import type { SearchBlockedSourceSummary, SearchResultItem } from '../searchPageUtils';

interface SearchResultsPanelProps {
  hasSearched: boolean;
  isSearching: boolean;
  hasCompletedSearch: boolean;
  results: SearchResultItem[];
  blockedSources?: SearchBlockedSourceSummary;
  filterQuery: string;
  matchedIndexSet: Set<number>;
  snippetHighlightTerms: string[];
  onOpenSearchResult: (item: SearchResultItem) => void | Promise<void>;
}

export function SearchResultsPanel({
  hasSearched,
  isSearching,
  hasCompletedSearch,
  results,
  blockedSources,
  filterQuery,
  matchedIndexSet,
  snippetHighlightTerms,
  onOpenSearchResult,
}: SearchResultsPanelProps) {
  return (
    <div className={SHELL_BODY_WRAPPER_PRESETS.aiSearch}>
      <div className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="flex min-h-full flex-col px-8 py-6">
          {!hasSearched ? (
            <div className="flex flex-1 min-h-[240px] items-center justify-center text-body-sm text-ssoo-primary/60">
              검색어를 입력하면 결과가 표시됩니다.
            </div>
          ) : isSearching || !hasCompletedSearch ? (
            <LoadingState
              message="AI 검색 결과를 불러오는 중입니다..."
              className="flex-1 min-h-[240px] text-ssoo-primary/70"
            />
          ) : results.length === 0 ? (
            <div className="flex flex-1 min-h-[240px] items-center justify-center text-body-sm text-ssoo-primary/60">
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {blockedSources && blockedSources.totalCount > 0 ? (
                <div className="rounded-md border border-ssoo-warning/30 bg-ssoo-warning/10 px-4 py-3 text-body-sm text-ssoo-primary">
                  <p className="font-medium">
                    권한 때문에 제외된 문서 {blockedSources.totalCount}개가 있습니다.
                  </p>
                  <p className="mt-1 text-caption text-ssoo-primary/70">
                    {blockedSources.reasons
                      .map((reason) => `${reason.label} ${reason.count}개`)
                      .join(', ')}
                  </p>
                </div>
              ) : null}
              {results.map((item, index) => (
                <SearchResultCard
                  id={`search-result-${index}`}
                  key={item.id}
                  result={item}
                  highlighted={filterQuery.trim().length > 0 && matchedIndexSet.has(index)}
                  highlightTerms={snippetHighlightTerms}
                  onClick={() => {
                    void onOpenSearchResult(item);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
