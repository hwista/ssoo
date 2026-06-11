import type { PmsHomeSummary } from '@ssoo/types/pms';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export const homeApi = {
  getSummary: async (): Promise<ApiResponse<PmsHomeSummary>> => {
    const response = await apiClient.get<ApiResponse<PmsHomeSummary>>('/home/summary');
    return response.data;
  },
};
