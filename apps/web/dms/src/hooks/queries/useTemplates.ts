'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { ApiResponse } from '@/lib/api/core';
import { templateApi } from '@/lib/api/endpoints/templates';
import type { TemplateItem } from '@/types/template';

export interface TemplateListResponse {
  global: TemplateItem[];
  personal: TemplateItem[];
}

export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: () => [...templateKeys.lists()] as const,
  referenceLists: () => [...templateKeys.all, 'reference'] as const,
  byReferenceDocument: (docPath: string) => [...templateKeys.referenceLists(), docPath] as const,
};

export function useTemplateList(
  options?: Omit<UseQueryOptions<ApiResponse<TemplateListResponse>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: () => templateApi.list(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useTemplatesByReferenceDocument(
  docPath: string | null | undefined,
  options?: Omit<UseQueryOptions<ApiResponse<TemplateItem[]>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: templateKeys.byReferenceDocument(docPath ?? ''),
    queryFn: () => templateApi.listByReferenceDocument(docPath ?? ''),
    enabled: Boolean(docPath),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}
