'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { useTabStore, useAssistantContextStore, useAssistantPanelStore, useConfirmStore, useAiSearchStore } from '@/stores';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import { PageTemplate } from '@/components/templates';
import {
  DOC_PAGE_SURFACE_PRESETS,
  PAGE_BACKGROUND_PRESETS,
  SectionedShell,
} from '@/components/templates/page-frame';
import { Toolbar, DOCUMENT_WIDTH } from '@/components/common/viewer';
import { useOpenDocumentTab } from '@/hooks';
import { aiApi, getErrorMessage } from '@/lib/api';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import { getQueryFromTabPath } from './utils/queryPath';
import { AiSidecar } from './_components/AiSidecar';
import { SearchResultsPanel } from './_components/SearchResultsPanel';
import {
  buildHistoryItems,
  buildSearchTocItems,
  getTopSearchKeywords,
  rankSearchResults,
  type SearchResultItem,
  tokenizeHighlightTerms,
} from './searchPageUtils';

export function AiSearchPage() {
  const tabId = useTabInstanceId();
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
  const setReferences = useAssistantContextStore((state) => state.setReferences);
  const openPanel = useAssistantPanelStore((state) => state.openPanel);
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
    const rankedResults = rankSearchResults(allResults, inputQuery);
    setResults(rankedResults.results);
    setMatchedResultIndices(rankedResults.matchedResultIndices);
    setCurrentResultIndex(rankedResults.currentResultIndex);
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

  const tocItems = useMemo(() => buildSearchTocItems(results), [results]);
  const matchedIndexSet = useMemo(() => new Set(matchedResultIndices), [matchedResultIndices]);
  const snippetHighlightTerms = useMemo(() => tokenizeHighlightTerms(sourceQuery), [sourceQuery]);
  const historyItems = useMemo(() => buildHistoryItems(searchHistory, sourceQuery), [searchHistory, sourceQuery]);
  const topSearchKeywords = useMemo(() => getTopSearchKeywords(searchHistory), [searchHistory]);

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
      <PageTemplate
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
              assistant={{
                onAttach: handleAttachSearchResultsToAssistant,
                title: '현재 검색 결과 문서를 AI에 첨부하고 질문하기',
                filterControl: filterQuery.trim().length > 0 && matchedResultIndices.length > 0 ? (
                  <label className="inline-flex items-center gap-1.5 text-xs text-ssoo-primary/80 select-none">
                    <input
                      type="checkbox"
                      checked={attachFilteredOnly}
                      onChange={(event) => setAttachFilteredOnly(event.target.checked)}
                      className="h-3.5 w-3.5 cursor-pointer rounded border border-ssoo-content-border accent-ssoo-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ssoo-primary/30"
                    />
                    재검색 결과만 첨부
                  </label>
                ) : null,
              }}
              zoom={{ level: 100, show: false }}
            />
          )}
          body={(
            <SearchResultsPanel
              hasSearched={hasSearched}
              isSearching={isSearching}
              hasCompletedSearch={hasCompletedSearch}
              results={results}
              filterQuery={filterQuery}
              matchedIndexSet={matchedIndexSet}
              snippetHighlightTerms={snippetHighlightTerms}
              onOpenSearchResult={handleOpenSearchResult}
            />
          )}
        />
      </PageTemplate>
    </main>
  );
}
