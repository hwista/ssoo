'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useTabStore, useAssistantStore, useConfirmStore } from '@/stores';
import { useCurrentTabId } from '@/contexts/TabInstanceContext';
import { AiPageTemplate } from '@/components/templates';
import { Toolbar, DOCUMENT_WIDTH } from '@/components/common/viewer';
import type { TocItem } from '@/components/common/page';
import { getQueryFromTabPath } from '@/lib/utils';
import { aiApi, getErrorMessage } from '@/lib/utils/apiClient';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';

interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  path: string;
}

export function AiSearchPage() {
  const tabId = useCurrentTabId();
  const { tabs } = useTabStore();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabs, tabId]);
  const initialQuery = useMemo(() => getQueryFromTabPath(activeTab?.path), [activeTab?.path]);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery));
  const [isSearching, setIsSearching] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const autoQueryRef = useRef('');
  const confirm = useConfirmStore((state) => state.confirm);
  const setReferences = useAssistantStore((state) => state.setReferences);
  const openPanel = useAssistantStore((state) => state.openPanel);

  const scrollToResult = useCallback((index: number) => {
    const element = document.getElementById(`search-result-${index}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const performSearch = useCallback(async (inputQuery: string) => {
    const trimmed = inputQuery.trim();
    setHasSearched(true);
    if (!trimmed) {
      setResults([]);
      setCurrentResultIndex(-1);
      return;
    }
    setIsSearching(true);
    const response = await aiApi.search(trimmed);
    if (response.success && response.data) {
      setResults(response.data.results);
    } else {
      setResults([
        {
          id: 'search-error',
          title: '검색 실패',
          excerpt: getErrorMessage(response),
          path: '-',
        },
      ]);
    }
    setCurrentResultIndex(-1);
    setIsSearching(false);
  }, []);

  const handleSearch = useCallback(() => {
    if (isSearching) return;
    performSearch(query);
  }, [isSearching, performSearch, query]);

  useEffect(() => {
    if (initialQuery && autoQueryRef.current !== initialQuery) {
      autoQueryRef.current = initialQuery;
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  useEffect(() => {
    if (results.length === 0) {
      setCurrentResultIndex(-1);
      return;
    }
    setCurrentResultIndex(0);
  }, [results]);

  const tocItems = useMemo<TocItem[]>(() => (
    results.map((item, index) => ({
      id: `search-result-${index}`,
      text: item.title || item.path || `문서 ${index + 1}`,
      level: 1,
    }))
  ), [results]);

  const handleNavigateResult = useCallback((direction: 'prev' | 'next') => {
    if (results.length === 0) return;
    const nextIndex = direction === 'next'
      ? (currentResultIndex + 1) % results.length
      : (currentResultIndex - 1 + results.length) % results.length;
    setCurrentResultIndex(nextIndex);
    scrollToResult(nextIndex);
  }, [currentResultIndex, results.length, scrollToResult]);

  const handleTocClick = useCallback((id: string) => {
    const index = Number.parseInt(id.replace('search-result-', ''), 10);
    if (Number.isNaN(index)) return;
    setCurrentResultIndex(index);
    scrollToResult(index);
  }, [scrollToResult]);

  const handleSearchClose = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setCurrentResultIndex(-1);
  }, []);

  const handleAttachSearchResultsToAssistant = useCallback(async () => {
    const candidates = results
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
  }, [confirm, openPanel, results, setReferences]);

  return (
    <AiPageTemplate
      variant="search"
      description="문서 기반 검색 결과를 확인하세요."
      shellToolbarClassName="border-0 bg-transparent px-0 py-0"
      toolbar={(
        <Toolbar
          maxWidth={DOCUMENT_WIDTH}
          variant="embedded"
          toc={tocItems}
          onTocClick={handleTocClick}
          searchQuery={query}
          onSearchQueryChange={setQuery}
          onSearchSubmit={handleSearch}
          onSearchClose={handleSearchClose}
          searchResultCount={results.length}
          currentResultIndex={currentResultIndex}
          hasSearched={hasSearched}
          onNavigateResult={handleNavigateResult}
          onAttachToAssistant={handleAttachSearchResultsToAssistant}
          attachToAssistantTitle="현재 검색 결과 문서를 AI에 첨부하고 질문하기"
          showZoomControls={false}
        />
      )}
    >
      {!hasSearched ? (
        <div className="flex h-full items-center justify-center text-sm text-ssoo-primary/60">
          검색어를 입력하면 결과가 표시됩니다.
        </div>
      ) : results.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-ssoo-primary/60">
          검색 결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((item, index) => (
            <article id={`search-result-${index}`} key={item.id} className="rounded-lg border border-ssoo-content-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-ssoo-primary">{item.title}</h2>
                  <p className="mt-1 text-sm text-ssoo-primary/70">{item.excerpt}</p>
                  <p className="mt-2 text-xs text-ssoo-primary/50">{item.path}</p>
                </div>
                <FileText className="h-5 w-5 text-ssoo-primary/40" />
              </div>
            </article>
          ))}
        </div>
      )}
    </AiPageTemplate>
  );
}
