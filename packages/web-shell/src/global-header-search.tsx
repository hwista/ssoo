'use client';

import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import type { SsooHeaderSearchBoxProps } from './header';
import { SSOO_GLOBAL_SEARCH_APP_PATH } from './global-search';

export interface SsooGlobalSearchOpenRequest {
  query: string;
  encodedQuery: string;
  path: string;
  title: string;
  icon: 'Search';
}

export interface UseSsooGlobalHeaderSearchOptions {
  disabled?: boolean;
  clearOnOpen?: boolean;
  createTitle?: (query: string) => string;
  onOpenSearch: (request: SsooGlobalSearchOpenRequest) => void | Promise<void>;
}

export interface UseSsooGlobalHeaderSearchResult {
  query: string;
  setQuery: (query: string) => void;
  openSearch: () => void | Promise<void>;
  search: SsooHeaderSearchBoxProps;
}

export function getSsooGlobalSearchQueryFromPath(path?: string | null): string {
  const queryString = path?.split('?')[1];
  if (!queryString) return '';
  return new URLSearchParams(queryString).get('q')?.trim() ?? '';
}

export function createSsooGlobalSearchPath(query?: string | null): string {
  const trimmedQuery = query?.trim() ?? '';
  if (!trimmedQuery) return SSOO_GLOBAL_SEARCH_APP_PATH;
  return `${SSOO_GLOBAL_SEARCH_APP_PATH}?q=${encodeURIComponent(trimmedQuery)}`;
}

export function getSsooGlobalSearchTitle(query?: string | null): string {
  const trimmedQuery = query?.trim() ?? '';
  return trimmedQuery ? `통합 검색: ${trimmedQuery}` : '통합 검색';
}

export function createSsooGlobalSearchOpenRequest(
  query?: string | null,
  createTitle: (query: string) => string = getSsooGlobalSearchTitle,
): SsooGlobalSearchOpenRequest {
  const trimmedQuery = query?.trim() ?? '';
  return {
    query: trimmedQuery,
    encodedQuery: encodeURIComponent(trimmedQuery),
    path: createSsooGlobalSearchPath(trimmedQuery),
    title: createTitle(trimmedQuery),
    icon: 'Search',
  };
}

export function useSsooGlobalHeaderSearch({
  disabled = false,
  clearOnOpen = false,
  createTitle = getSsooGlobalSearchTitle,
  onOpenSearch,
}: UseSsooGlobalHeaderSearchOptions): UseSsooGlobalHeaderSearchResult {
  const [query, setQuery] = useState('');

  const openSearch = useCallback(() => {
    if (disabled) return undefined;

    const request = createSsooGlobalSearchOpenRequest(query, createTitle);
    const result = onOpenSearch(request);
    if (clearOnOpen) {
      setQuery('');
    }
    return result;
  }, [clearOnOpen, createTitle, disabled, onOpenSearch, query]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void openSearch();
  }, [openSearch]);

  const search = useMemo<SsooHeaderSearchBoxProps>(() => ({
    value: query,
    onChange: setQuery,
    onKeyDown: handleKeyDown,
    disabled,
    iconSlot: <Search />,
  }), [disabled, handleKeyDown, query]);

  return {
    query,
    setQuery,
    openSearch,
    search,
  };
}
