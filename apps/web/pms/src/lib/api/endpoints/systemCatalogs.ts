import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface SystemCatalogItem {
  id: string;
  catalogCode: string;
  catalogName: string;
  parentCode: string | null;
  sortOrder: number;
  description: string | null;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemCatalogFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  parentCode?: string;
}

export interface CreateSystemCatalogRequest {
  catalogCode: string;
  catalogName: string;
  parentCode?: string;
  sortOrder?: number;
  description?: string;
  memo?: string;
}

export interface UpdateSystemCatalogRequest {
  catalogName?: string;
  parentCode?: string;
  sortOrder?: number;
  description?: string;
  isActive?: boolean;
  memo?: string;
}

interface SystemCatalogListApiResponse {
  success: boolean;
  data: SystemCatalogItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  error?: { message: string };
  message?: string;
}

export const systemCatalogsApi = {
  list: async (params?: SystemCatalogFilters): Promise<ApiResponse<PaginatedResponse<SystemCatalogItem>>> => {
    const requestParams = params
      ? {
          ...params,
          ...(params.pageSize !== undefined && { limit: params.pageSize }),
        }
      : undefined;

    const response = await apiClient.get<SystemCatalogListApiResponse>('/system-catalogs', {
      params: requestParams,
    });

    if (!response.data.success || !response.data.data || !response.data.meta) {
      return {
        success: false,
        data: null,
        message: response.data.error?.message || '요청 처리 중 오류가 발생했습니다.',
      };
    }

    const pageSize = response.data.meta.limit || params?.pageSize || 10;
    const totalPages = pageSize ? Math.ceil(response.data.meta.total / pageSize) : 0;

    return {
      success: true,
      data: {
        items: response.data.data,
        total: response.data.meta.total,
        page: response.data.meta.page,
        pageSize,
        totalPages,
      },
      message: '',
    };
  },

  tree: async (): Promise<ApiResponse<SystemCatalogItem[]>> => {
    const response = await apiClient.get<ApiResponse<SystemCatalogItem[]>>('/system-catalogs/tree');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<SystemCatalogItem>> => {
    const response = await apiClient.get<ApiResponse<SystemCatalogItem>>(`/system-catalogs/${id}`);
    return response.data;
  },

  create: async (data: CreateSystemCatalogRequest): Promise<ApiResponse<SystemCatalogItem>> => {
    const response = await apiClient.post<ApiResponse<SystemCatalogItem>>('/system-catalogs', data);
    return response.data;
  },

  update: async (id: string, data: UpdateSystemCatalogRequest): Promise<ApiResponse<SystemCatalogItem>> => {
    const response = await apiClient.put<ApiResponse<SystemCatalogItem>>(`/system-catalogs/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/system-catalogs/${id}`);
    return response.data;
  },
};
