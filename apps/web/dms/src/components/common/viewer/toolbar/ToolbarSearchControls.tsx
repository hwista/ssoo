'use client';

import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

import type { ViewerSearchControls } from './toolbarTypes';

export function ToolbarSearchControls({
  query,
  placeholder = '문서 내 검색...',
  onQueryChange,
  onSubmit,
  onClose,
  hasSearched,
  resultCount,
  currentResultIndex,
  onNavigateResult,
}: ViewerSearchControls) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex min-w-0 items-center gap-1"
    >
      <div className="flex min-w-0 items-center">
        <Search className="mr-1 h-4 w-4 shrink-0 text-gray-400" />
        <div className="relative min-w-0">
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-control-h w-44 border-0 border-b border-gray-300 bg-transparent pr-7 text-sm placeholder:text-gray-400 focus:border-ssoo-primary focus:outline-none focus:ring-0"
          />
          {query ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-1 top-1/2 flex h-control-h-sm w-control-h-sm -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-600"
              title="검색 지우기"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {hasSearched ? (
        <div className="flex items-center gap-0.5 text-sm text-gray-500">
          <span className="min-w-[60px] text-center">
            {resultCount > 0 ? `${currentResultIndex + 1} / ${resultCount}` : '0 / 0'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={() => onNavigateResult('prev')}
            className="h-control-h-sm w-control-h-sm p-0"
            disabled={resultCount === 0}
            title="이전 결과"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={() => onNavigateResult('next')}
            className="h-control-h-sm w-control-h-sm p-0"
            disabled={resultCount === 0}
            title="다음 결과"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </form>
  );
}
