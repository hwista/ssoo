import { apiClient } from '../client';
import type { ApiResponse } from '../types';

import type { CodeGroup, CodeItem, CodeMutationRequest, CreateCodeRequest, UpdateCodeRequest, CodeUsage } from '@ssoo/types/common';
export type { CodeGroup, CodeItem, CodeMutationRequest, CreateCodeRequest, UpdateCodeRequest, CodeUsage } from '@ssoo/types/common';

export const codesApi = {
  usage: async (id: string): Promise<CodeUsage> => {
    const response = await apiClient.get<ApiResponse<CodeUsage>>(`/codes/${id}/usage`);
    return response.data.data!;
  },
  getGroups: async (): Promise<ApiResponse<CodeGroup[]>> => {
    const response = await apiClient.get<ApiResponse<CodeGroup[]>>('/codes/groups');
    return response.data;
  },

  getByGroup: async (codeGroup: string): Promise<ApiResponse<CodeItem[]>> => {
    const response = await apiClient.get<ApiResponse<CodeItem[]>>('/codes', {
      params: { codeGroup },
    });
    return response.data;
  },

  create: async (data: CreateCodeRequest): Promise<ApiResponse<CodeItem>> => {
    const response = await apiClient.post<ApiResponse<CodeItem>>('/codes', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCodeRequest): Promise<ApiResponse<CodeItem>> => {
    const response = await apiClient.put<ApiResponse<CodeItem>>(`/codes/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string, data: CodeMutationRequest): Promise<ApiResponse<CodeItem>> => {
    const response = await apiClient.delete<ApiResponse<CodeItem>>(`/codes/${id}`, { data });
    return response.data;
  },

  removePermanently: async (id: string, data: CodeMutationRequest): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`/codes/${id}/permanent`, { data });
    return response.data;
  },
};
