import type { CommonOperationEvent, CommonOperationHistoryDetail, CommonOperationHistoryFilter, CommonOperationHistoryPage } from '@ssoo/types/common';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export const operationHistoryApi = {
  async list(params: CommonOperationHistoryFilter) {
    const response = await apiClient.get<ApiResponse<CommonOperationHistoryPage>>('/access/ops/history', { params });
    if (!response.data.data) throw new Error('공통 이력 응답이 비어 있습니다.');
    return response.data.data;
  },
  async detail(event: CommonOperationEvent) {
    const response = await apiClient.get<ApiResponse<CommonOperationHistoryDetail>>(`/access/ops/history/${encodeURIComponent(event.category)}/${encodeURIComponent(event.subjectId)}/${encodeURIComponent(event.historySequence)}`);
    if (!response.data.data) throw new Error('이력 상세 응답이 비어 있습니다.');
    return response.data.data;
  },
};
