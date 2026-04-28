'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { ApiResponse } from '@/lib/api/core';
import { filesApi } from '@/lib/api/endpoints/files';
import type { FileNode } from '@/types/file-tree';

export const fileTreeKeys = {
  all: ['files'] as const,
  tree: () => [...fileTreeKeys.all, 'tree'] as const,
};

export function useFileTreeQuery(
  options?: Omit<UseQueryOptions<ApiResponse<FileNode[]>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: fileTreeKeys.tree(),
    queryFn: () => filesApi.getFileTree(),
    staleTime: 60 * 1000,
    ...options,
  });
}
