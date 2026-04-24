import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface UserItem {
  id: string;
  loginId: string;
  userName: string;
  displayName?: string;
  email: string;
  phone?: string;
  roleCode: string;
  departmentCode?: string;
  positionCode?: string;
  employeeNumber?: string;
  companyName?: string;
  customerId?: string;
  primaryAffiliationType?: 'internal' | 'external' | null;
  isActive: boolean;
  isSystemUser: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  success: boolean;
  data: UserItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface CreateUserRequest {
  loginId: string;
  password: string;
  userName: string;
  displayName?: string;
  email: string;
  phone?: string;
  roleCode?: string;
  departmentCode?: string;
  positionCode?: string;
  employeeNumber?: string;
  companyName?: string;
  customerId?: string;
  primaryAffiliationType?: 'internal' | 'external';
}

export interface UpdateUserRequest {
  userName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  roleCode?: string;
  departmentCode?: string;
  positionCode?: string;
  employeeNumber?: string;
  companyName?: string;
  customerId?: string;
  primaryAffiliationType?: 'internal' | 'external';
  password?: string;
  isActive?: boolean;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  roleCode?: string;
}

export const usersApi = {
  list: (params?: UserListParams) =>
    apiClient.get<UserListResponse>('/users', { params }).then((r) => r.data),

  create: (data: CreateUserRequest) =>
    apiClient.post<ApiResponse<UserItem>>('/users', data).then((r) => r.data),

  update: (id: string, data: UpdateUserRequest) =>
    apiClient.put<ApiResponse<UserItem>>(`/users/${id}`, data).then((r) => r.data),

  deactivate: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/users/${id}`).then((r) => r.data),
};
