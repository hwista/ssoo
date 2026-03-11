'use client';

import { LoadingState } from '@/components/common/StateDisplay';
import { SearchResultCard } from '@/components/common/search/ResultCard';
import { SHELL_BODY_WRAPPER_PRESETS } from '@/components/templates/page-frame';
import type { SearchResultItem } from '../searchPageUtils';

interface SearchResultsPanelProps {
  hasSearched: boolean;
  isSearching: boolean;
  hasCompletedSearch: boolean;
  results: SearchResultItem[];
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
  filterQuery,
  matchedIndexSet,
  snippetHighlightTerms,
  onOpenSearchResult,
}: SearchResultsPanelProps) {
  return (
    <div className={SHELL_BODY_WRAPPER_PRESETS.aiSearch}>
      <div className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="px-8 py-6">
          {!hasSearched ? (
            <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-ssoo-primary/60">
              검색어를 입력하면 결과가 표시됩니다.
            </div>
          ) : isSearching || !hasCompletedSearch ? (
            <LoadingState
              message="AI 검색 결과를 불러오는 중입니다..."
              className="min-h-[240px] text-ssoo-primary/70"
            />
          ) : results.length === 0 ? (
            <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-ssoo-primary/60">
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
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
