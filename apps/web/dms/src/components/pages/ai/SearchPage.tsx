'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { ErrorState } from '@/components/common/StateDisplay';
import {
  useTabStore,
  useAssistantContextStore,
  useAssistantPanelStore,
  useConfirmStore,
  useAiSearchStore,
  useAccessStore,
} from '@/stores';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import { PageTemplate } from '@/components/templates';
import {
  DOC_PAGE_SURFACE_PRESETS,
  PAGE_BACKGROUND_PRESETS,
  SectionedShell,
} from '@/components/templates/page-frame';
import { Toolbar, DOCUMENT_WIDTH } from '@/components/common/viewer';
import { useAiSearchQuery, useOpenDocumentTab } from '@/hooks';
import { getErrorMessage } from '@/lib/api/core';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import { useDocumentAccessRequestStore } from '@/stores/document-access-request.store';
import { getQueryFromTabPath } from './utils/queryPath';
import { AiPanel } from './_components/AiPanel';
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
  const [sourceQuery, setSourceQuery] = useState('');
  const [allResults, setAllResults] = useState<SearchResultItem[]>([]);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [matchedResultIndices, setMatchedResultIndices] = useState<number[]>([]);
  const [attachFilteredOnly, setAttachFilteredOnly] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const autoQueryRef = useRef('');
  const lastProcessedSearchKeyRef = useRef('');
  const confirm = useConfirmStore((state) => state.confirm);
  const setReferences = useAssistantContextStore((state) => state.setReferences);
  const openPanel = useAssistantPanelStore((state) => state.openPanel);
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const canUseSearch = accessSnapshot?.features.canUseSearch ?? false;
  const canUseAssistant = accessSnapshot?.features.canUseAssistant ?? false;
  const searchHistory = useAiSearchStore((state) => state.history);
  const recordSearch = useAiSearchStore((state) => state.recordSearch);
  const openDocumentTab = useOpenDocumentTab();
  const openAccessRequestDialog = useDocumentAccessRequestStore((state) => state.open);
  const searchQuery = useAiSearchQuery(sourceQuery, {
    contextMode: 'deep',
    enabled: hasSearched && sourceQuery.trim().length > 0,
  });
  const isSearching = searchQuery.isFetching;
  const hasCompletedSearch = !isSearching;

  const scrollToResult = useCallback((index: number) => {
    const element = document.getElementById(`search-result-${index}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const performSearch = useCallback((inputQuery: string) => {
    const trimmed = inputQuery.trim();
    setHasSearched(true);
    setSourceQuery(trimmed);

    if (!trimmed) {
      setAllResults([]);
      setResults([]);
      setMatchedResultIndices([]);
      setCurrentResultIndex(-1);
      lastProcessedSearchKeyRef.current = '';
      return;
    }

    if (trimmed === sourceQuery) {
      lastProcessedSearchKeyRef.current = '';
      void searchQuery.refetch();
    }
  }, [searchQuery, sourceQuery]);

  useEffect(() => {
    if (!hasSearched || !sourceQuery.trim() || !searchQuery.isFetched || isSearching) {
      return;
    }

    const searchKey = `${sourceQuery}:${searchQuery.dataUpdatedAt}`;
    if (lastProcessedSearchKeyRef.current === searchKey) {
      return;
    }

    if (searchQuery.data?.success && searchQuery.data.data) {
      const nextResults = searchQuery.data.data.results ?? [];
      setAllResults(nextResults);
      setResults(nextResults);
      setMatchedResultIndices([]);
      setCurrentResultIndex(-1);
      recordSearch(sourceQuery, nextResults.length);
      } else {
        const fallbackResults = [
          {
            id: 'search-error',
            title: '검색 실패',
            excerpt: getErrorMessage(searchQuery.data ?? { success: false, error: '검색 실패' }),
            path: '-',
            score: 0,
            isReadable: false,
            canRequestRead: false,
          },
        ];
        setAllResults(fallbackResults);
      setResults(fallbackResults);
      setMatchedResultIndices([]);
      setCurrentResultIndex(-1);
      recordSearch(sourceQuery, 0);
    }

    lastProcessedSearchKeyRef.current = searchKey;
  }, [
    hasSearched,
    isSearching,
    recordSearch,
    searchQuery.data,
    searchQuery.dataUpdatedAt,
    searchQuery.isFetched,
    sourceQuery,
  ]);

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
      lastProcessedSearchKeyRef.current = '';
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
    if (!canUseAssistant) {
      toast.error('AI 어시스턴트를 사용할 권한이 없습니다.');
      return;
    }

    const attachTargets = attachFilteredOnly && filterQuery.trim().length > 0
      ? matchedResultIndices.map((index) => results[index]).filter(Boolean)
      : results;

    const candidates = attachTargets
      .filter((item) => item.isReadable)
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
  }, [attachFilteredOnly, canUseAssistant, confirm, filterQuery, matchedResultIndices, openPanel, results, setReferences]);

  const handleOpenSearchResult = useCallback(async (item: SearchResultItem) => {
    if (!item.path || item.path === '-') return;
    if (!item.isReadable) {
      if (item.canRequestRead) {
        openAccessRequestDialog({
          title: item.title,
          path: item.path,
          owner: item.owner,
          readRequest: item.readRequest,
        });
      } else {
        toast.error('문서를 열 수 없습니다.');
      }
      return;
    }
    await openDocumentTab({
      path: item.path,
      title: item.title,
      activate: true,
      highlightQuery: sourceQuery.trim() || undefined,
    });
  }, [openAccessRequestDialog, openDocumentTab, sourceQuery]);

  if (!canUseSearch) {
    return (
      <main className={`h-full overflow-hidden ${PAGE_BACKGROUND_PRESETS.ai}`}>
        <div className="flex h-full items-center justify-center">
          <ErrorState error="AI 검색을 사용할 권한이 없습니다." />
        </div>
      </main>
    );
  }

  return (
    <main className={`h-full overflow-hidden ${PAGE_BACKGROUND_PRESETS.ai}`}>
      <PageTemplate
        filePath="ai/search"
        mode="viewer"
        breadcrumbRootIconVariant="ai"
        contentOrientation="portrait"
        description="문서 기반 검색 결과를 확인하세요."
        contentSurfaceClassName={DOC_PAGE_SURFACE_PRESETS.ai}
        panelContent={(
          <AiPanel
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
               assistant={canUseAssistant ? {
                 onAttach: handleAttachSearchResultsToAssistant,
                 title: '현재 검색 결과 문서를 AI에 첨부하고 질문하기',
                 filterControl: filterQuery.trim().length > 0 && matchedResultIndices.length > 0 ? (
                   <label className="inline-flex items-center gap-1.5 text-caption text-ssoo-primary/80 select-none">
                     <input
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
