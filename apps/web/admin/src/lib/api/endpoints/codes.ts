import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface CodeGroup {
  codeGroup: string;
  count: number;
}

export interface CodeItem {
  id: string;
  codeGroup: string;
  codeValue: string;
  parentCode: string | null;
  displayNameKo: string;
  displayNameEn: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCodeRequest {
  codeGroup: string;
  codeValue: string;
  parentCode?: string;
  displayNameKo: string;
  displayNameEn?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCodeRequest {
  parentCode?: string;
  displayNameKo?: string;
  displayNameEn?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const codesApi = {
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

  deactivate: async (id: string): Promise<ApiResponse<CodeItem>> => {
    const response = await apiClient.delete<ApiResponse<CodeItem>>(`/codes/${id}`);
    return response.data;
  },
};
