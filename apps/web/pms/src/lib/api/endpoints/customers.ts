import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';

// ============================================
// Types
// ============================================

export interface CustomerItem {
  id: string;
  customerCode: string;
  customerName: string;
  customerType?: string | null;
  industry?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  isActive: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilters {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CreateCustomerRequest {
  customerCode: string;
  customerName: string;
  customerType?: string;
  industry?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  contactPhone?: string;
  website?: string;
  memo?: string;
}

export interface UpdateCustomerRequest {
  customerName?: string;
  customerType?: string;
  industry?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  contactPhone?: string;
  website?: string;
  isActive?: boolean;
  memo?: string;
}

// Server paginated response shape
interface CustomerListApiResponse {
  success: boolean;
  data: CustomerItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  error?: { message: string };
  message?: string;
}

// ============================================
// API
// ============================================

export const customersApi = {
  list: async (params?: CustomerFilters): Promise<ApiResponse<PaginatedResponse<CustomerItem>>> => {
    const requestParams = params
      ? {
          ...params,
          ...(params.pageSize !== undefined && { limit: params.pageSize }),
        }
      : undefined;
    const response = await apiClient.get<CustomerListApiResponse>('/customers', {
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

  getById: async (id: string): Promise<ApiResponse<CustomerItem>> => {
    const response = await apiClient.get<ApiResponse<CustomerItem>>(`/customers/${id}`);
    return response.data;
  },

  create: async (data: CreateCustomerRequest): Promise<ApiResponse<CustomerItem>> => {
    const response = await apiClient.post<ApiResponse<CustomerItem>>('/customers', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCustomerRequest): Promise<ApiResponse<CustomerItem>> => {
    const response = await apiClient.put<ApiResponse<CustomerItem>>(`/customers/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/customers/${id}`);
    return response.data;
  },
};
