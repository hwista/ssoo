'use client';

import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { cn } from '../../cn';
import type { SsooAiSearchViewerSearchControls } from './toolbarTypes';
import { Button, Input } from '@ssoo/web-ui';

function toolbarIconButtonClass(className?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-md transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50',
    className
  );
}

export function SsooAiSearchToolbarSearchControls({
  query,
  placeholder = '문서 내 검색...',
  onQueryChange,
  onSubmit,
  onClose,
  hasSearched,
  resultCount,
  currentResultIndex,
  onNavigateResult,
}: SsooAiSearchViewerSearchControls) {
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
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-control-h w-44 border-0 border-b border-gray-300 bg-transparent pr-7 text-[0.8125rem] placeholder:text-gray-400 focus:border-ssoo-primary focus:outline-none focus:ring-0"
          />
          {query ? (
            <Button variant="plain" size="plain"
              type="button"
              onClick={onClose}
              className="absolute right-1 top-1/2 flex h-control-h-sm w-control-h-sm -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-600"
              title="검색 지우기"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {hasSearched ? (
        <div className="flex items-center gap-0.5 text-[0.8125rem] text-gray-500">
          <span className="min-w-[60px] text-center">
            {resultCount > 0 ? `${currentResultIndex + 1} / ${resultCount}` : '0 / 0'}
          </span>
          <Button variant="plain" size="plain"
            type="button"
            onClick={() => onNavigateResult('prev')}
            className={toolbarIconButtonClass('h-control-h-sm w-control-h-sm p-0')}
            disabled={resultCount === 0}
            title="이전 결과"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="plain" size="plain"
            type="button"
            onClick={() => onNavigateResult('next')}
            className={toolbarIconButtonClass('h-control-h-sm w-control-h-sm p-0')}
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

export { SsooAiSearchToolbarSearchControls as ToolbarSearchControls };
