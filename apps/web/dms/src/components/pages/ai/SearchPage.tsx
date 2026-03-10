'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTabStore, useAssistantStore, useConfirmStore, useAiSearchStore } from '@/stores';
import { useCurrentTabId } from '@/contexts/TabInstanceContext';
import { DocPageTemplate } from '@/components/templates';
import {
  DOC_PAGE_SURFACE_PRESETS,
  PAGE_BACKGROUND_PRESETS,
  SectionedShell,
  SHELL_BODY_WRAPPER_PRESETS,
} from '@/components/common/page';
import { Toolbar, DOCUMENT_WIDTH } from '@/components/common/viewer';
import { LoadingState } from '@/components/common/StateDisplay';
import { SearchResultCard } from '@/components/common/search/ResultCard';
import { useOpenDocumentTab } from '@/hooks';
import type { TocItem } from '@/components/common/page';
import { getQueryFromTabPath } from '@/lib/utils';
import { aiApi, getErrorMessage } from '@/lib/api';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import { AiSidecar } from './_components/AiSidecar';

interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  summary?: string;
  snippets?: string[];
  totalSnippetCount?: number;
}

function tokenizeHighlightTerms(query: string): string[] {
  return Array.from(new Set(
    query
      .toLowerCase()
      .split(/[\s,.;:!?()[\]{}"'`/\\|]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2)
  ));
}

export function AiSearchPage() {
  const tabId = useCurrentTabId();
  const { tabs, updateTab } = useTabStore();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabs, tabId]);
  const initialQuery = useMemo(() => getQueryFromTabPath(activeTab?.path), [activeTab?.path]);
  const [filterQuery, setFilterQuery] = useState('');
  const [sourceQuery, setSourceQuery] = useState(initialQuery);
  const [allResults, setAllResults] = useState<SearchResultItem[]>([]);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [matchedResultIndices, setMatchedResultIndices] = useState<number[]>([]);
  const [attachFilteredOnly, setAttachFilteredOnly] = useState(true);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery));
  const [isSearching, setIsSearching] = useState(false);
  const [hasCompletedSearch, setHasCompletedSearch] = useState(!initialQuery);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const autoQueryRef = useRef('');
  const confirm = useConfirmStore((state) => state.confirm);
  const setReferences = useAssistantStore((state) => state.setReferences);
  const openPanel = useAssistantStore((state) => state.openPanel);
  const searchHistory = useAiSearchStore((state) => state.history);
  const recordSearch = useAiSearchStore((state) => state.recordSearch);
  const openDocumentTab = useOpenDocumentTab();

  const scrollToResult = useCallback((index: number) => {
    const element = document.getElementById(`search-result-${index}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const performSearch = useCallback(async (inputQuery: string) => {
    const trimmed = inputQuery.trim();
    setHasSearched(true);
    setSourceQuery(trimmed);
    setHasCompletedSearch(false);
    if (!trimmed) {
      setAllResults([]);
      setResults([]);
      setMatchedResultIndices([]);
      setCurrentResultIndex(-1);
      setHasCompletedSearch(true);
      return;
    }
    setIsSearching(true);
    try {
      const response = await aiApi.search(trimmed, { contextMode: 'deep' });
      if (response.success && response.data) {
        const nextResults = response.data.results ?? [];
        setAllResults(nextResults);
        setResults(nextResults);
        setMatchedResultIndices([]);
        recordSearch(trimmed, nextResults.length);
      } else {
        const fallbackResults = [
          {
            id: 'search-error',
            title: '검색 실패',
            excerpt: getErrorMessage(response),
            path: '-',
          },
        ];
        setAllResults(fallbackResults);
        setResults(fallbackResults);
        setMatchedResultIndices([]);
        recordSearch(trimmed, 0);
      }
      setCurrentResultIndex(-1);
    } finally {
      setIsSearching(false);
      setHasCompletedSearch(true);
    }
  }, [recordSearch]);

  const sortResultsByQuery = useCallback((inputQuery: string) => {
    const trimmed = inputQuery.trim().toLowerCase();
    if (!trimmed) {
      setResults(allResults);
      setMatchedResultIndices([]);
      setCurrentResultIndex(-1);
      return;
    }

    const ranked = allResults.map((item, index) => {
      const title = item.title.toLowerCase();
      const excerpt = item.excerpt.toLowerCase();
      const path = item.path.toLowerCase();
      let score = 0;
      if (title.includes(trimmed)) score += 4;
      if (path.includes(trimmed)) score += 3;
      if (excerpt.includes(trimmed)) score += 2;
      return { item, index, score };
    });

    ranked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });

    const nextResults = ranked.map((entry) => entry.item);
    const nextMatchedIndices = ranked
      .map((entry, sortedIndex) => (entry.score > 0 ? sortedIndex : -1))
      .filter((index) => index >= 0);

    setResults(nextResults);
    setMatchedResultIndices(nextMatchedIndices);
    setCurrentResultIndex(nextMatchedIndices.length > 0 ? 0 : -1);
  }, [allResults]);

  const handleSearch = useCallback(() => {
    if (isSearching) return;
    if (!hasSearched) {
      performSearch(filterQuery);
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
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  useEffect(() => {
    if (!tabId) return;
    if (!sourceQuery.trim()) return;
    updateTab(tabId, {
      title: `AI 검색: ${sourceQuery.slice(0, 20)}...`,
      path: `/ai/search?q=${encodeURIComponent(sourceQuery)}`,
      icon: 'Bot',
    });
  }, [sourceQuery, tabId, updateTab]);

  const tocItems = useMemo<TocItem[]>(() => (
    results.map((item, index) => ({
      id: `search-result-${index}`,
      text: item.title || item.path || `문서 ${index + 1}`,
      level: 1,
    }))
  ), [results]);
  const matchedIndexSet = useMemo(() => new Set(matchedResultIndices), [matchedResultIndices]);
  const snippetHighlightTerms = useMemo(() => tokenizeHighlightTerms(sourceQuery), [sourceQuery]);
  const historyItems = useMemo(() => (
    searchHistory.map((item) => ({
      id: item.id,
      title: item.query,
      updatedAt: item.updatedAt,
      active: item.query === sourceQuery,
      persistedToDb: true,
    }))
  ), [searchHistory, sourceQuery]);
  const topSearchKeywords = useMemo(() => (
    [...searchHistory]
      .sort((a, b) => b.count - a.count || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 5)
      .map((item) => item.query)
  ), [searchHistory]);

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

  const handleAttachSearchResultsToAssistant = useCallback(async () => {
    const attachTargets = attachFilteredOnly && filterQuery.trim().length > 0
      ? matchedResultIndices.map((index) => results[index]).filter(Boolean)
      : results;

    const candidates = attachTargets
      .filter((item) => item.path.trim().length > 0 && item.path !== '-')
      .map((item) => ({
        path: item.path.replace(/^\/+/, ''),
        title: item.title || item.path.split('/').pop() || item.path,
      }));

    if (candidates.length === 0) {
      toast.error('첨부 가능한 검색 결과 문서가 없습니다.');
      return;
    }

    if (candidates.length > 20) {
      const confirmed = await confirm({
        title: '검색 결과 전체 첨부',
        description: `현재 ${candidates.length}개 문서를 첨부하면 응답 품질 또는 속도가 저하될 수 있습니다. 계속 진행할까요?`,
        confirmText: '계속',
        cancelText: '취소',
      });
      if (!confirmed) return;
    }

    setReferences(candidates);
    openPanel();
    window.dispatchEvent(new Event(ASSISTANT_FOCUS_INPUT_EVENT));
    toast.success(`${candidates.length}개 문서를 첨부했습니다.`);
  }, [attachFilteredOnly, confirm, filterQuery, matchedResultIndices, openPanel, results, setReferences]);

  const handleOpenSearchResult = useCallback(async (item: SearchResultItem) => {
    if (!item.path || item.path === '-') return;
    await openDocumentTab({
      path: item.path,
      title: item.title,
      activate: true,
    });
  }, [openDocumentTab]);

  return (
    <main className={`h-full overflow-hidden ${PAGE_BACKGROUND_PRESETS.ai}`}>
      <DocPageTemplate
        filePath="ai/search"
        mode="viewer"
        breadcrumbRootIconVariant="ai"
        contentOrientation="portrait"
        description="문서 기반 검색 결과를 확인하세요."
        contentSurfaceClassName={DOC_PAGE_SURFACE_PRESETS.ai}
        sidecarContent={(
          <AiSidecar
            variant="search"
            history={historyItems}
            onHistorySelect={(item) => {
              setFilterQuery('');
              void performSearch(item.title);
            }}
            suggestions={topSearchKeywords}
            onSuggestionSelect={(keyword) => {
              setFilterQuery('');
              void performSearch(keyword);
            }}
          />
        )}
      >
        <SectionedShell
          variant="search_with_toolbar"
          toolbar={(
            <Toolbar
              maxWidth={DOCUMENT_WIDTH}
              variant="embedded"
              toc={tocItems}
              tocLabel="목록"
              tocListStyle="flat"
              searchPlaceholder="결과 내 재검색..."
              onTocClick={handleTocClick}
              searchQuery={filterQuery}
              onSearchQueryChange={handleFilterQueryChange}
              onSearchSubmit={handleSearch}
              onSearchClose={handleSearchClose}
              searchResultCount={matchedResultIndices.length}
              currentResultIndex={currentResultIndex}
              hasSearched={filterQuery.trim().length > 0}
              onNavigateResult={handleNavigateResult}
              onAttachToAssistant={handleAttachSearchResultsToAssistant}
              attachToAssistantTitle="현재 검색 결과 문서를 AI에 첨부하고 질문하기"
              attachFilterControl={filterQuery.trim().length > 0 && matchedResultIndices.length > 0 ? (
                <label className="inline-flex items-center gap-1.5 text-xs text-ssoo-primary/80 select-none">
                  <input
                    type="checkbox"
                    checked={attachFilteredOnly}
                    onChange={(event) => setAttachFilteredOnly(event.target.checked)}
                    className="h-3.5 w-3.5 cursor-pointer rounded border border-ssoo-content-border accent-ssoo-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ssoo-primary/30"
                  />
                  재검색 결과만 첨부
                </label>
              ) : null}
              showZoomControls={false}
            />
          )}
          body={(
            <div className={SHELL_BODY_WRAPPER_PRESETS.aiSearch}>
              <div className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-thin">
                <div className="py-6 px-8">
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
                            void handleOpenSearchResult(item);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      </DocPageTemplate>
    </main>
  );
}
