'use client';

import { useCallback, useMemo } from 'react';
import type {
  CommonSearchRequest,
  CommonSearchResponse,
  CommonSearchResult,
  CommonSearchSourceApp,
} from '@ssoo/types/common';
import { createCommonSearchApi } from './search';
import {
  getCommonSearchApiBaseUrl,
  resolveCommonSearchResultHref,
  type SsooSearchAppUrls,
} from './search-routing';

export interface UseCommonGlobalSearchAdapterOptions {
  apiBaseUrl?: string;
  currentApp: CommonSearchSourceApp;
  currentPath?: string;
  appUrls?: SsooSearchAppUrls;
  searchPath?: string;
  openCurrentAppResult: (result: CommonSearchResult) => void | Promise<void>;
}

export interface CommonGlobalSearchPageAdapter {
  initialQuery: string;
  search: (request: CommonSearchRequest) => Promise<CommonSearchResponse>;
  openResult: (result: CommonSearchResult) => void | Promise<void>;
}

export function getCommonGlobalSearchQueryFromPath(path?: string): string {
  const queryString = path?.split('?')[1];
  if (!queryString) return '';
  return new URLSearchParams(queryString).get('q') ?? '';
}

export function useCommonGlobalSearchAdapter({
  apiBaseUrl,
  currentApp,
  currentPath,
  appUrls,
  searchPath,
  openCurrentAppResult,
}: UseCommonGlobalSearchAdapterOptions): CommonGlobalSearchPageAdapter {
  const resolvedApiBaseUrl = useMemo(
    () => getCommonSearchApiBaseUrl(apiBaseUrl),
    [apiBaseUrl],
  );
  const searchApi = useMemo(
    () => createCommonSearchApi({ baseURL: resolvedApiBaseUrl, searchPath }),
    [resolvedApiBaseUrl, searchPath],
  );
  const initialQuery = useMemo(
    () => getCommonGlobalSearchQueryFromPath(currentPath),
    [currentPath],
  );

  const search = useCallback(async (request: CommonSearchRequest): Promise<CommonSearchResponse> => {
    const response = await searchApi.search(request);
    if (!response.success || !response.data) {
      throw new Error(response.error || response.message || '검색 결과를 불러오지 못했습니다.');
    }
    return response.data;
  }, [searchApi]);

  const openResult = useCallback((result: CommonSearchResult) => {
    if (result.sourceApp === currentApp) {
      return openCurrentAppResult(result);
    }

    const href = resolveCommonSearchResultHref(result, { appUrls });
    if (href && typeof window !== 'undefined') {
      window.location.assign(href);
    }
    return undefined;
  }, [appUrls, currentApp, openCurrentAppResult]);

  return {
    initialQuery,
    search,
    openResult,
  };
}
