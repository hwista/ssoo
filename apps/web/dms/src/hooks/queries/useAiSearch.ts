'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { ApiResponse } from '@/lib/api/core';
import { aiApi, type AiSearchResponse } from '@/lib/api/endpoints/ai';

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

  return useQuery({
    queryKey: aiSearchKeys.result(query, contextMode, activeDocPath),
    queryFn: ({ signal }) => aiApi.search(query, { contextMode, activeDocPath, signal }),
    enabled: enabled && query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
}
