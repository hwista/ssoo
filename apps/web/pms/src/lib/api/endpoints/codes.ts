import { apiClient } from '../client';
import type { ApiResponse } from '../types';

/**
 * 코드 그룹
 */
export interface CodeGroup {
  codeGroup: string;
  count: number;
}

/**
 * 코드 아이템
 */
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

/**
 * 코드 생성 요청
 */
export interface CreateCodeRequest {
  codeGroup: string;
  codeValue: string;
  parentCode?: string;
  displayNameKo: string;
  displayNameEn?: string;
  description?: string;
  sortOrder?: number;
}

/**
 * 코드 수정 요청
 */
export interface UpdateCodeRequest {
  parentCode?: string;
  displayNameKo?: string;
  displayNameEn?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * 코드 관리 API
 */
export const codesApi = {
  /** 코드 그룹 목록 */
  getGroups: async (): Promise<ApiResponse<CodeGroup[]>> => {
    const response = await apiClient.get<ApiResponse<CodeGroup[]>>('/codes/groups');
    return response.data;
  },

  /** 그룹별 코드 목록 */
  getByGroup: async (codeGroup: string): Promise<ApiResponse<CodeItem[]>> => {
    const response = await apiClient.get<ApiResponse<CodeItem[]>>('/codes', {
      params: { codeGroup },
    });
    return response.data;
  },

  /** 코드 생성 */
  create: async (data: CreateCodeRequest): Promise<ApiResponse<CodeItem>> => {
    const response = await apiClient.post<ApiResponse<CodeItem>>('/codes', data);
    return response.data;
  },

  /** 코드 수정 */
  update: async (id: string, data: UpdateCodeRequest): Promise<ApiResponse<CodeItem>> => {
    const response = await apiClient.put<ApiResponse<CodeItem>>(`/codes/${id}`, data);
    return response.data;
  },

  /** 코드 비활성화 */
  deactivate: async (id: string): Promise<ApiResponse<CodeItem>> => {
    const response = await apiClient.delete<ApiResponse<CodeItem>>(`/codes/${id}`);
    return response.data;
  },
};
