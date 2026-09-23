'use client';

import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { cn } from '../../cn';
import type { SsooAiSearchViewerSearchControls } from './toolbarTypes';
import { Button } from '@ssoo/web-ui';
import { SsooSearchInput } from '../../search-input';

function toolbarIconButtonClass(className?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-md transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
    className
  );
}

export function SsooAiSearchToolbarSearchControls({
  query,
  wrap = false,
  placeholder = '문서 내 검색...',
  onQueryChange,
  onSubmit,
  onClose,
  hasSearched,
  resultCount,
  currentResultIndex,
  onNavigateResult,
}: SsooAiSearchViewerSearchControls & { wrap?: boolean }) {
  return (
    <form
      role="search"
      aria-label="검색 결과 내 검색"
      name="ssoo-in-view-search"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={cn("flex min-w-0 items-center gap-1", wrap && "max-w-full flex-wrap shrink-0")}
    >
      <div className="flex min-w-0 items-center">
        <Search className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="relative min-w-0">
          <SsooSearchInput
            id="ssoo-in-view-search-input"
            name="ssoo-in-view-search-query"
            ariaLabel="검색 결과 내 검색"
            intent="in-view-search"
            placeholder={placeholder}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-control-h w-44 border-0 border-b border-border bg-transparent pr-7 text-body-xs placeholder:text-muted-foreground focus:border-ssoo-primary focus:outline-none focus:ring-0"
          />
          {query ? (
            <Button variant="plain" size="plain"
              type="button"
              onClick={onClose}
              className="absolute right-1 top-1/2 flex h-control-h-sm w-control-h-sm -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-muted-foreground"
              title="검색 지우기"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {hasSearched ? (
        <div className="flex items-center gap-0.5 text-body-xs text-muted-foreground">
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
