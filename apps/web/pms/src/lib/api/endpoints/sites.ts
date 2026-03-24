import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface SiteItem {
  id: string;
  siteCode: string;
  siteName: string;
  siteType: string | null;
  customerId: string;
  parentCode: string | null;
  sortOrder: number;
  address: string | null;
  region: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  description: string | null;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
}

export interface CreateSiteRequest {
  siteCode: string;
  siteName: string;
  siteType?: string;
  customerId: string;
  parentCode?: string;
  sortOrder?: number;
  address?: string;
  region?: string;
  contactPerson?: string;
  contactPhone?: string;
  description?: string;
  memo?: string;
}

export interface UpdateSiteRequest {
  siteName?: string;
  siteType?: string;
  parentCode?: string;
  sortOrder?: number;
  address?: string;
  region?: string;
  contactPerson?: string;
  contactPhone?: string;
  description?: string;
  isActive?: boolean;
  memo?: string;
}

interface SiteListApiResponse {
  success: boolean;
  data: SiteItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  error?: { message: string };
  message?: string;
}

export const sitesApi = {
  list: async (params?: SiteFilters): Promise<ApiResponse<PaginatedResponse<SiteItem>>> => {
    const requestParams = params
      ? {
          ...params,
          ...(params.pageSize !== undefined && { limit: params.pageSize }),
        }
      : undefined;

    const response = await apiClient.get<SiteListApiResponse>('/sites', {
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

  tree: async (customerId?: string): Promise<ApiResponse<SiteItem[]>> => {
    const response = await apiClient.get<ApiResponse<SiteItem[]>>('/sites/tree', {
      params: customerId ? { customerId } : undefined,
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<SiteItem>> => {
    const response = await apiClient.get<ApiResponse<SiteItem>>(`/sites/${id}`);
    return response.data;
  },

  create: async (data: CreateSiteRequest): Promise<ApiResponse<SiteItem>> => {
    const response = await apiClient.post<ApiResponse<SiteItem>>('/sites', data);
    return response.data;
  },

  update: async (id: string, data: UpdateSiteRequest): Promise<ApiResponse<SiteItem>> => {
    const response = await apiClient.put<ApiResponse<SiteItem>>(`/sites/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/sites/${id}`);
    return response.data;
  },
};
