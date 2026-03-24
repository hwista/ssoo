import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface SystemInstanceItem {
  id: string;
  instanceCode: string;
  instanceName: string;
  systemCatalogId: string;
  customerId: string;
  siteId: string;
  parentCode: string | null;
  sortOrder: number;
  operatorType: string | null;
  operatorUserId: string | null;
  version: string | null;
  description: string | null;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemInstanceFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  siteId?: string;
  systemCatalogId?: string;
  operatorType?: string;
}

export interface CreateSystemInstanceRequest {
  instanceCode: string;
  instanceName: string;
  systemCatalogId: string;
  customerId: string;
  siteId: string;
  parentCode?: string;
  sortOrder?: number;
  operatorType?: string;
  operatorUserId?: string;
  version?: string;
  description?: string;
  memo?: string;
}

export interface UpdateSystemInstanceRequest {
  instanceName?: string;
  systemCatalogId?: string;
  siteId?: string;
  parentCode?: string;
  sortOrder?: number;
  operatorType?: string;
  operatorUserId?: string;
  version?: string;
  description?: string;
  isActive?: boolean;
  memo?: string;
}

interface SystemInstanceListApiResponse {
  success: boolean;
  data: SystemInstanceItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  error?: { message: string };
  message?: string;
}

export const systemInstancesApi = {
  list: async (params?: SystemInstanceFilters): Promise<ApiResponse<PaginatedResponse<SystemInstanceItem>>> => {
    const requestParams = params
      ? {
          ...params,
          ...(params.pageSize !== undefined && { limit: params.pageSize }),
        }
      : undefined;

    const response = await apiClient.get<SystemInstanceListApiResponse>('/system-instances', {
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

  tree: async (customerId?: string, siteId?: string): Promise<ApiResponse<SystemInstanceItem[]>> => {
    const response = await apiClient.get<ApiResponse<SystemInstanceItem[]>>('/system-instances/tree', {
      params: {
        ...(customerId ? { customerId } : {}),
        ...(siteId ? { siteId } : {}),
      },
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<SystemInstanceItem>> => {
    const response = await apiClient.get<ApiResponse<SystemInstanceItem>>(`/system-instances/${id}`);
    return response.data;
  },

  create: async (data: CreateSystemInstanceRequest): Promise<ApiResponse<SystemInstanceItem>> => {
    const response = await apiClient.post<ApiResponse<SystemInstanceItem>>('/system-instances', data);
    return response.data;
  },

  update: async (id: string, data: UpdateSystemInstanceRequest): Promise<ApiResponse<SystemInstanceItem>> => {
    const response = await apiClient.put<ApiResponse<SystemInstanceItem>>(`/system-instances/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/system-instances/${id}`);
    return response.data;
  },
};
