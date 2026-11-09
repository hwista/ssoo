import type {
  AiIndexJobQueueMetrics,
  ManagedAiJob,
  ParticipationPage,
  AiIndexJobRunSummary,
  AiIndexJobSchedulerStatus,
  AiIndexSourceStatus,
} from '@ssoo/types/common';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface AiProviderStatus {
  providerCode: string;
  ready: boolean;
  reasonCode?: string;
  reasonMessage?: string;
  deploymentName?: string;
  modelName?: string;
  apiVersion?: string;
  credentialMode?: string;
  profileCode?: string;
  dimension?: number;
}

export interface AiOperationsReadiness {
  checkedAt: string;
  ready: boolean;
  embedding: AiProviderStatus;
  chat: AiProviderStatus;
  scheduler: AiIndexJobSchedulerStatus;
  configurationBoundary: {
    mode: 'deployment-secret' | 'admin-settings';
    mutableInAdmin: boolean;
    message: string;
  };
}

function requireData<T>(response: ApiResponse<T>, message: string): T {
  if (response.data === undefined || response.data === null) {
    throw new Error(message);
  }
  return response.data;
}

export interface AiJobListParams { page: number; pageSize: number; sourceApp?: string; status?: string }

export const aiOperationsApi = {
  listJobs: (params: AiJobListParams) => apiClient.get<ApiResponse<ParticipationPage<ManagedAiJob>>>('/ai-index/jobs', { params }).then(response => requireData(response.data, '작업 목록 응답이 비어 있습니다.')),
  jobDetail: (id: string) => apiClient.get<ApiResponse<ManagedAiJob>>(`/ai-index/jobs/${encodeURIComponent(id)}`).then(response => requireData(response.data, '작업 상세 응답이 비어 있습니다.')),
  retryJob: (id: string, reason: string, expectedRevision: string) => apiClient.post<ApiResponse<ManagedAiJob>>(`/ai-index/jobs/${encodeURIComponent(id)}/retry`, { reason, expectedRevision }).then(response => requireData(response.data, '재시도 응답이 비어 있습니다.')),

  getReadiness: () => apiClient
    .get<ApiResponse<AiOperationsReadiness>>('/ai-index/operations/readiness')
    .then((response) => requireData(response.data, 'AI 운영 준비 상태 응답이 비어 있습니다.')),
  getSources: () => apiClient
    .get<ApiResponse<AiIndexSourceStatus[]>>('/ai-index/status')
    .then((response) => requireData(response.data, 'AI source 상태 응답이 비어 있습니다.')),
  getMetrics: () => apiClient
    .get<ApiResponse<AiIndexJobQueueMetrics>>('/ai-index/jobs/metrics')
    .then((response) => requireData(response.data, 'AI queue 상태 응답이 비어 있습니다.')),
  getScheduler: () => apiClient
    .get<ApiResponse<AiIndexJobSchedulerStatus>>('/ai-index/jobs/scheduler')
    .then((response) => requireData(response.data, 'AI scheduler 상태 응답이 비어 있습니다.')),
  runJobs: (limit: number) => apiClient
    .post<ApiResponse<AiIndexJobRunSummary>>('/ai-index/jobs/run', undefined, { params: { limit }, timeout: 180000 })
    .then((response) => requireData(response.data, 'AI job 실행 응답이 비어 있습니다.')),
};
