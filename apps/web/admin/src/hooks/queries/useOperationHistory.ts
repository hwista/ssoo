'use client';
import { useQuery } from '@tanstack/react-query';
import type { CommonOperationEvent, CommonOperationHistoryFilter } from '@ssoo/types/common';
import { operationHistoryApi } from '@/lib/api/endpoints/operationHistory';

export function useOperationHistory(params: CommonOperationHistoryFilter) {
  return useQuery({ queryKey: ['access-ops', 'history', params], queryFn: () => operationHistoryApi.list(params), staleTime: 0 });
}

export function useOperationHistoryDetail(event: CommonOperationEvent | null) {
  return useQuery({ queryKey: ['access-ops', 'history-detail', event?.id], queryFn: () => operationHistoryApi.detail(event!), enabled: !!event });
}
