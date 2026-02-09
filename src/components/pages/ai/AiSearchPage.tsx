'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { useTabStore } from '@/stores';
import { DocPageTemplate } from '@/components/templates';
import { DOCUMENT_WIDTH } from '@/components/common/viewer/Content';
import { aiApi, getErrorMessage } from '@/lib/utils/apiClient';

interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  path: string;
}

function getQueryFromTabPath(path?: string): string {
  if (!path) return '';
  const [, queryString = ''] = path.split('?');
  const params = new URLSearchParams(queryString);
  return params.get('q')?.trim() ?? '';
}

export function AiSearchPage() {
  const { activeTabId, tabs } = useTabStore();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [tabs, activeTabId]);
  const initialQuery = useMemo(() => getQueryFromTabPath(activeTab?.path), [activeTab?.path]);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery));
  const [isSearching, setIsSearching] = useState(false);
  const autoQueryRef = useRef('');

  const performSearch = useCallback(async (inputQuery: string) => {
    const trimmed = inputQuery.trim();
    setHasSearched(true);
    if (!trimmed) {
      setResults([]);
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
    setIsSearching(false);
  }, []);

  const handleSearch = useCallback(() => {
    performSearch(query);
  }, [performSearch, query]);

  useEffect(() => {
    if (initialQuery && autoQueryRef.current !== initialQuery) {
      autoQueryRef.current = initialQuery;
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  return (
    <main className="flex-1 overflow-hidden bg-ssoo-content-bg/30">
      <DocPageTemplate filePath="ai/search" mode="viewer">
        <div className="flex h-full justify-center overflow-hidden px-4">
          <div
            className="flex h-full w-full flex-col rounded-lg border border-ssoo-content-border bg-white"
            style={{ maxWidth: DOCUMENT_WIDTH }}
          >
          <header className="border-b border-ssoo-content-border px-6 py-4">
            <h1 className="text-xl font-semibold text-ssoo-primary">AI 검색</h1>
            <p className="text-sm text-ssoo-primary/70">문서 기반 검색 결과를 확인하세요.</p>
          </header>

          <section className="px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ssoo-primary/50" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="검색어를 입력하세요..."
                  className="h-control-h w-full rounded-lg border border-ssoo-content-border pl-9 pr-3 text-sm focus:border-ssoo-primary focus:outline-none"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSearch();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="h-control-h rounded-lg bg-ssoo-primary px-4 text-sm font-medium text-white transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSearching ? '검색 중...' : '검색'}
              </button>
            </div>
          </section>

          <section className="flex-1 overflow-auto px-6 pb-6">
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
                {results.map((item) => (
                  <article key={item.id} className="rounded-lg border border-ssoo-content-border p-4">
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
          </section>
          </div>
        </div>
      </DocPageTemplate>
    </main>
  );
}
