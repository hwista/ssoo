'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type { ApiResponse } from '@/lib/api/core';
import {
  assistantSessionApi,
  type AssistantSessionPayload,
} from '@/lib/api/endpoints/assistant-sessions';

export const assistantSessionKeys = {
  all: ['assistant-sessions'] as const,
  lists: () => [...assistantSessionKeys.all, 'list'] as const,
  list: (clientId: string, limit: number) => [...assistantSessionKeys.lists(), clientId, limit] as const,
};

export function useAssistantSessionsQuery(
  clientId: string,
  limit = 100,
  options?: Omit<UseQueryOptions<ApiResponse<AssistantSessionPayload[]>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: assistantSessionKeys.list(clientId, limit),
    queryFn: () => assistantSessionApi.list(clientId, limit),
    enabled: clientId.trim().length > 0,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useSaveAssistantSessionMutation(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (session: AssistantSessionPayload) => assistantSessionApi.save(clientId, session),
    onSuccess: async (response) => {
      if (response.success) {
        await queryClient.invalidateQueries({ queryKey: assistantSessionKeys.lists() });
      }
    },
  });
}

export function useRemoveAssistantSessionMutation(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => assistantSessionApi.remove(clientId, sessionId),
    onSuccess: async (response) => {
      if (response.success) {
        await queryClient.invalidateQueries({ queryKey: assistantSessionKeys.lists() });
      }
    },
  });
}
