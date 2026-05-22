'use client';

import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type { ApiResponse } from '@/lib/api/core';
import { aiApi, type AiSearchInsightsResponse, type AiSearchResponse } from '@/lib/api/endpoints/ai';

export interface UseAiSearchQueryOptions
  extends Omit<UseQueryOptions<ApiResponse<AiSearchResponse>, Error>, 'queryKey' | 'queryFn'> {
  contextMode?: 'doc' | 'deep';
  activeDocPath?: string;
}

export const aiSearchKeys = {
  all: ['ai-search'] as const,
  results: () => [...aiSearchKeys.all, 'results'] as const,
  result: (query: string, contextMode: 'doc' | 'deep', activeDocPath?: string) => [
    ...aiSearchKeys.results(),
    contextMode,
    activeDocPath ?? '',
    query,
  ] as const,
  insights: () => [...aiSearchKeys.all, 'insights'] as const,
};

export function useAiSearchQuery(
  query: string,
  options?: UseAiSearchQueryOptions,
) {
  const {
    contextMode = 'deep',
    activeDocPath,
    enabled = true,
    ...queryOptions
  } = options ?? {};
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: aiSearchKeys.result(query, contextMode, activeDocPath),
    queryFn: async ({ signal }) => {
      const response = await aiApi.search(query, { contextMode, activeDocPath, signal });
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: aiSearchKeys.insights() });
      }
      return response;
    },
    enabled: enabled && query.trim().length > 0,
    // 권한/visibility 변경이 다른 client 에 즉시 반영되도록 stale time 짧게.
    // 정식 fix (WebSocket broadcast 기반 invalidation) 는 Phase B 의 일부로 등재.
    staleTime: 30 * 1000,
    ...queryOptions,
  });
}

export interface UseAiSearchInsightsQueryOptions
  extends Omit<UseQueryOptions<ApiResponse<AiSearchInsightsResponse>, Error>, 'queryKey' | 'queryFn'> {
  historyLimit?: number;
  popularLimit?: number;
}

export function useAiSearchInsightsQuery(options?: UseAiSearchInsightsQueryOptions) {
  const {
    historyLimit = 50,
    popularLimit = 5,
    enabled = true,
    ...queryOptions
  } = options ?? {};

  return useQuery({
    queryKey: aiSearchKeys.insights(),
    queryFn: ({ signal }) => aiApi.searchInsights({ historyLimit, popularLimit, signal }),
    enabled,
    staleTime: 30 * 1000,
    ...queryOptions,
  });
}
