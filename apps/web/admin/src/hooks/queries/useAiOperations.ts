'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiOperationsApi, type AiJobListParams } from '@/lib/api/endpoints/aiOperations';

export const aiOperationsKeys = {
  all: ['ai-operations'] as const,
  readiness: () => [...aiOperationsKeys.all, 'readiness'] as const,
  sources: () => [...aiOperationsKeys.all, 'sources'] as const,
  metrics: () => [...aiOperationsKeys.all, 'metrics'] as const,
  scheduler: () => [...aiOperationsKeys.all, 'scheduler'] as const,
};

export function useAiOperationsOverview() {
  const readiness = useQuery({
    queryKey: aiOperationsKeys.readiness(),
    queryFn: aiOperationsApi.getReadiness,
    refetchInterval: 30_000,
  });
  const sources = useQuery({
    queryKey: aiOperationsKeys.sources(),
    queryFn: aiOperationsApi.getSources,
    refetchInterval: 30_000,
  });
  const metrics = useQuery({
    queryKey: aiOperationsKeys.metrics(),
    queryFn: aiOperationsApi.getMetrics,
    refetchInterval: 15_000,
  });
  const scheduler = useQuery({
    queryKey: aiOperationsKeys.scheduler(),
    queryFn: aiOperationsApi.getScheduler,
    refetchInterval: 15_000,
  });

  return { readiness, sources, metrics, scheduler };
}

export function useRunAiJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (limit: number) => aiOperationsApi.runJobs(limit),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiOperationsKeys.all }),
  });
}

export function useAiJobs(params: AiJobListParams) {
  return useQuery({ queryKey: [...aiOperationsKeys.all, 'jobs', params], queryFn: () => aiOperationsApi.listJobs(params), refetchInterval: 15000 });
}
export function useAiJobDetail(id: string | null) {
  return useQuery({ queryKey: [...aiOperationsKeys.all, 'job-detail', id], queryFn: () => aiOperationsApi.jobDetail(id!), enabled: !!id, staleTime: 0 });
}
export function useRetryAiJob() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, reason, expectedRevision }: { id: string; reason: string; expectedRevision: string }) => aiOperationsApi.retryJob(id, reason, expectedRevision), onSuccess: () => client.invalidateQueries({ queryKey: aiOperationsKeys.all }) });
}
