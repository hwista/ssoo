'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@ssoo/web-ui';
import {
  SSOO_CONTENT_PAGE_METRICS,
  SsooContentPageTemplate,
} from '../content-page-template';
import { SsooPageBreadcrumb, type SsooPageBreadcrumbItem } from '../page-breadcrumb';
import { SsooPageHeader } from '../page-header';
import { SsooSectionedShell } from '../sectioned-shell';
import { SsooAiPanel } from './AiPanel';
import {
  SsooAiSearchResultsPanel,
  type SsooAiSearchResultRenderState,
} from './SearchResultsPanel';
import {
  buildSearchTocItems,
  rankSearchResults,
  tokenizeHighlightTerms,
  type SsooAiSearchBlockedSourceSummary,
  type SsooAiSearchHistoryItem,
  type SsooAiSearchResultItem,
} from './searchPageUtils';
import { SsooAiSearchToolbar } from './toolbar/Toolbar';

export interface SsooAiSearchResponse<T extends SsooAiSearchResultItem = SsooAiSearchResultItem> {
  query?: string;
  results: T[];
  total?: number;
  blockedSources?: SsooAiSearchBlockedSourceSummary;
  raw?: unknown;
}

export interface SsooAiSearchTopSlotContext<T extends SsooAiSearchResultItem = SsooAiSearchResultItem> {
  hasSearched: boolean;
  isSearching: boolean;
  sourceQuery: string;
  filterQuery: string;
  results: T[];
  response: SsooAiSearchResponse<T> | null;
}

export interface SsooAiSearchPageProps<T extends SsooAiSearchResultItem = SsooAiSearchResultItem> {
  filePath: string;
  description?: string;
  initialQuery?: string;
  canUseSearch?: boolean;
  canUseAssistant?: boolean;
  noPermissionMessage?: string;
  search: (query: string) => Promise<SsooAiSearchResponse<T>>;
  searchKey?: string | number;
  onSourceQueryChange?: (query: string) => void;
  onOpenSearchResult?: (item: T, context: { sourceQuery: string }) => void | Promise<void>;
  onAttachSearchResultsToAssistant?: (
    items: T[],
    context: {
      sourceQuery: string;
      filterQuery: string;
      matchedResultIndices: number[];
      attachFilteredOnly: boolean;
    },
  ) => void | Promise<void>;
  renderResult?: (item: T, state: SsooAiSearchResultRenderState) => ReactNode;
  resultTopSlot?: ReactNode | ((context: SsooAiSearchTopSlotContext<T>) => ReactNode);
  history?: SsooAiSearchHistoryItem[];
  suggestions?: string[];
  frequentSearches?: string[];
  compactMode?: boolean;
  sidecarMode?: 'search' | 'hidden';
  blockedSourceNoun?: string;
  breadcrumbLastSegmentLabel?: string;
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return '검색 결과를 불러오지 못했습니다.';
}

function buildErrorResult<T extends SsooAiSearchResultItem>(message: string): T {
  return {
    id: 'search-error',
    title: '검색 실패',
    excerpt: message,
    path: '-',
    score: 0,
    isReadable: false,
    canRequestRead: false,
  } as T;
}

function getBreadcrumbItems(filePath: string): SsooPageBreadcrumbItem[] {
  const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
  const displayNames: Record<string, string> = {
    'ai/chat': 'AI 대화',
    'ssoo/search': '통합 검색',
    settings: '설정',
    git: 'Git',
    storage: 'Storage',
    ingest: 'Ingest',
  };
  const directName = displayNames[cleanPath];
  if (directName) return [{ id: cleanPath, label: directName, path: cleanPath }];

  return cleanPath.split('/').filter(Boolean).map((segment, index, segments) => {
    const path = segments.slice(0, index + 1).join('/');
    return {
      id: path,
      label: displayNames[path] ?? displayNames[segment] ?? segment,
      path,
    };
  });
}

export function SsooAiSearchPage<T extends SsooAiSearchResultItem = SsooAiSearchResultItem>({
  filePath,
  description = '문서 기반 검색 결과를 확인하세요.',
  initialQuery,
  canUseSearch = true,
  canUseAssistant = false,
  noPermissionMessage = 'AI 검색을 사용할 권한이 없습니다.',
  search,
  searchKey,
  onSourceQueryChange,
  onOpenSearchResult,
  onAttachSearchResultsToAssistant,
  renderResult,
  resultTopSlot,
  history = [],
  suggestions = [],
  frequentSearches = [],
  compactMode = false,
  sidecarMode = 'search',
  blockedSourceNoun = '문서',
  breadcrumbLastSegmentLabel,
}: SsooAiSearchPageProps<T>) {
  const [filterQuery, setFilterQuery] = useState('');
  const [sourceQuery, setSourceQuery] = useState('');
  const [allResults, setAllResults] = useState<T[]>([]);
  const [results, setResults] = useState<T[]>([]);
  const [blockedSources, setBlockedSources] = useState<SsooAiSearchBlockedSourceSummary | undefined>();
  const [matchedResultIndices, setMatchedResultIndices] = useState<number[]>([]);
  const [attachFilteredOnly, setAttachFilteredOnly] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [lastResponse, setLastResponse] = useState<SsooAiSearchResponse<T> | null>(null);
  const autoQueryRef = useRef('');
  const requestSeqRef = useRef(0);
  const lastSearchKeyRef = useRef(searchKey);
  const hasCompletedSearch = !isSearching;

  const scrollToResult = useCallback((index: number) => {
    const element = document.getElementById(`search-result-${index}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const performSearch = useCallback(async (inputQuery: string) => {
    const trimmed = inputQuery.trim();
    setHasSearched(true);
    setSourceQuery(trimmed);
    onSourceQueryChange?.(trimmed);

    if (!trimmed) {
      setAllResults([]);
      setResults([]);
      setBlockedSources(undefined);
      setMatchedResultIndices([]);
      setCurrentResultIndex(-1);
      setLastResponse(null);
      return;
    }

    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    setIsSearching(true);

    try {
      const response = await search(trimmed);
      if (requestSeqRef.current !== seq) return;
      const nextResults = response.results ?? [];
      setAllResults(nextResults);
      setResults(nextResults);
      setBlockedSources(response.blockedSources);
      setMatchedResultIndices([]);
      setCurrentResultIndex(-1);
      setLastResponse(response);
    } catch (error) {
      if (requestSeqRef.current !== seq) return;
      const fallbackResults = [buildErrorResult<T>(resolveErrorMessage(error))];
      setAllResults(fallbackResults);
      setResults(fallbackResults);
      setBlockedSources(undefined);
      setMatchedResultIndices([]);
      setCurrentResultIndex(-1);
      setLastResponse({
        query: trimmed,
        results: fallbackResults,
        total: fallbackResults.length,
      });
    } finally {
      if (requestSeqRef.current === seq) {
        setIsSearching(false);
      }
    }
  }, [onSourceQueryChange, search]);

  const sortResultsByQuery = useCallback((inputQuery: string) => {
    const rankedResults = rankSearchResults(allResults, inputQuery);
    setResults(rankedResults.results);
    setMatchedResultIndices(rankedResults.matchedResultIndices);
    setCurrentResultIndex(rankedResults.currentResultIndex);
  }, [allResults]);

  const handleSearch = useCallback(() => {
    if (isSearching) return;
    if (!hasSearched) {
      void performSearch(filterQuery);
      return;
    }
    sortResultsByQuery(filterQuery);
  }, [filterQuery, hasSearched, isSearching, performSearch, sortResultsByQuery]);

  const handleFilterQueryChange = useCallback((value: string) => {
    setFilterQuery(value);
    if (!hasSearched) return;
    sortResultsByQuery(value);
  }, [hasSearched, sortResultsByQuery]);

  useEffect(() => {
    if (initialQuery && autoQueryRef.current !== initialQuery) {
      autoQueryRef.current = initialQuery;
      setFilterQuery('');
      void performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  useEffect(() => {
    if (lastSearchKeyRef.current === searchKey) return;
    lastSearchKeyRef.current = searchKey;
    if (!hasSearched || !sourceQuery.trim()) return;
    void performSearch(sourceQuery);
  }, [hasSearched, performSearch, searchKey, sourceQuery]);

  const tocItems = useMemo(() => buildSearchTocItems(results), [results]);
  const matchedIndexSet = useMemo(() => new Set(matchedResultIndices), [matchedResultIndices]);
  const snippetHighlightTerms = useMemo(() => tokenizeHighlightTerms(sourceQuery), [sourceQuery]);
  const breadcrumbItems = useMemo(() => getBreadcrumbItems(filePath), [filePath]);

  const handleNavigateResult = useCallback((direction: 'prev' | 'next') => {
    if (matchedResultIndices.length === 0) return;
    const nextIndex = direction === 'next'
      ? (currentResultIndex + 1) % matchedResultIndices.length
      : (currentResultIndex - 1 + matchedResultIndices.length) % matchedResultIndices.length;
    setCurrentResultIndex(nextIndex);
    scrollToResult(matchedResultIndices[nextIndex]);
  }, [currentResultIndex, matchedResultIndices, scrollToResult]);

  const handleTocClick = useCallback((id: string) => {
    const index = Number.parseInt(id.replace('search-result-', ''), 10);
    if (Number.isNaN(index)) return;
    const matchPointer = matchedResultIndices.findIndex((matchedIndex) => matchedIndex === index);
    setCurrentResultIndex(matchPointer);
    scrollToResult(index);
  }, [matchedResultIndices, scrollToResult]);

  const handleSearchClose = useCallback(() => {
    setFilterQuery('');
    setResults(allResults);
    setMatchedResultIndices([]);
    setCurrentResultIndex(-1);
  }, [allResults]);

  const handleAttachSearchResultsToAssistant = useCallback(() => {
    if (!onAttachSearchResultsToAssistant) return;
    const attachTargets = attachFilteredOnly && filterQuery.trim().length > 0
      ? matchedResultIndices.map((index) => results[index]).filter(Boolean)
      : results;

    void onAttachSearchResultsToAssistant(attachTargets, {
      sourceQuery,
      filterQuery,
      matchedResultIndices,
      attachFilteredOnly,
    });
  }, [
    attachFilteredOnly,
    filterQuery,
    matchedResultIndices,
    onAttachSearchResultsToAssistant,
    results,
    sourceQuery,
  ]);

  const handleOpenSearchResult = useCallback((item: T) => {
    void onOpenSearchResult?.(item, { sourceQuery });
  }, [onOpenSearchResult, sourceQuery]);

  const resolvedTopSlot = typeof resultTopSlot === 'function'
    ? resultTopSlot({
      hasSearched,
      isSearching,
      sourceQuery,
      filterQuery,
      results,
      response: lastResponse,
    })
    : resultTopSlot;

  const breadcrumbSlot = (
    <SsooPageBreadcrumb
      items={breadcrumbItems}
      lastItemLabel={breadcrumbLastSegmentLabel}
      rootIconSlot={<Bot className="h-3.5 w-3.5" />}
      separatorSlot={<ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-gray-400" />}
      ariaLabel="검색 경로"
    />
  );
  const headerSlot = (
    <SsooPageHeader
      mode="viewer"
      description={description}
    />
  );

  if (!canUseSearch) {
    return (
      <SsooContentPageTemplate
        breadcrumbSlot={breadcrumbSlot}
        headerSlot={headerSlot}
        mainContentSlot={null}
        sidecarMode="hidden"
        pageTone="ai"
        contentSurface="transparent-rounded"
        compactMode={compactMode}
        stateSlot={(
          <div className="flex h-full min-h-[240px] items-center justify-center text-body-sm text-ssoo-primary/70">
            {noPermissionMessage}
          </div>
        )}
      />
    );
  }

  return (
    <SsooContentPageTemplate
      breadcrumbSlot={breadcrumbSlot}
      headerSlot={headerSlot}
      mainContentSlot={(
        <SsooSectionedShell
          variant="search_with_toolbar"
          toolbar={(
            <SsooAiSearchToolbar
              maxWidth={SSOO_CONTENT_PAGE_METRICS.documentMaxWidthPx}
              variant="embedded"
              toc={{
                items: tocItems,
                label: '목록',
                listStyle: 'flat',
                onItemClick: handleTocClick,
              }}
              search={{
                query: filterQuery,
                placeholder: '결과 내 재검색...',
                onQueryChange: handleFilterQueryChange,
                onSubmit: handleSearch,
                onClose: handleSearchClose,
                resultCount: matchedResultIndices.length,
                currentResultIndex,
                hasSearched: filterQuery.trim().length > 0,
                onNavigateResult: handleNavigateResult,
              }}
              assistant={canUseAssistant && onAttachSearchResultsToAssistant ? {
                onAttach: handleAttachSearchResultsToAssistant,
                title: '현재 검색 결과 문서를 AI에 첨부하고 질문하기',
                filterControl: filterQuery.trim().length > 0 && matchedResultIndices.length > 0 ? (
                  <label className="inline-flex select-none items-center gap-1.5 text-caption text-ssoo-primary/80">
                    <Input
                      type="checkbox"
                      checked={attachFilteredOnly}
                      onChange={(event) => setAttachFilteredOnly(event.target.checked)}
                      className="h-3.5 w-3.5 cursor-pointer rounded border border-ssoo-content-border accent-ssoo-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ssoo-primary/30"
                    />
                    재검색 결과만 첨부
                  </label>
                ) : null,
              } : undefined}
              zoom={{ level: 100, show: false }}
            />
          )}
          body={(
            <SsooAiSearchResultsPanel
              hasSearched={hasSearched}
              isSearching={isSearching}
              hasCompletedSearch={hasCompletedSearch}
              results={results}
              blockedSources={blockedSources}
              filterQuery={filterQuery}
              matchedIndexSet={matchedIndexSet}
              snippetHighlightTerms={snippetHighlightTerms}
              onOpenSearchResult={handleOpenSearchResult}
              renderResult={renderResult}
              topSlot={resolvedTopSlot}
              blockedSourceNoun={blockedSourceNoun}
            />
          )}
        />
      )}
      sidecarMode={sidecarMode === 'hidden' ? 'hidden' : undefined}
      sidecarSlot={sidecarMode === 'hidden' ? undefined : (
        <SsooAiPanel
          variant="search"
          history={history}
          onHistorySelect={(item) => {
            setFilterQuery('');
            void performSearch(item.title);
          }}
          suggestions={suggestions}
          frequentSearches={frequentSearches}
          onSuggestionSelect={(keyword) => {
            setFilterQuery('');
            void performSearch(keyword);
          }}
        />
      )}
      pageTone="ai"
      contentSurface="transparent-rounded"
      sidecarNarrowBehavior="overlay"
      sidecarControlSlots={{
        collapseIcon: <ChevronRight className="h-4 w-4 text-gray-500" />,
        expandIcon: <ChevronLeft className="h-4 w-4 text-gray-500" />,
      }}
      compactMode={compactMode}
    />
  );
}
