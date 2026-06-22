import { apiClient } from '../client';
import type { ApiResponse } from '../types';
import type {
  AuthAssignableRole,
  AuthProviderSettings,
  AuthRegistrationRequestListResult,
  DecideAuthRegistrationRequest,
  UpdateAuthProviderSettingsRequest,
} from '@ssoo/types/common';

export interface RegistrationRequestListParams {
  page?: number;
  limit?: number;
  statusCode?: string;
}

export const authAdminApi = {
  getSettings: () =>
    apiClient.get<ApiResponse<AuthProviderSettings>>('/auth/admin/settings').then((response) => response.data),

  updateSettings: (data: UpdateAuthProviderSettingsRequest) =>
    apiClient.put<ApiResponse<AuthProviderSettings>>('/auth/admin/settings', data).then((response) => response.data),

  listRegistrationRequests: (params?: RegistrationRequestListParams) =>
    apiClient
      .get<ApiResponse<AuthRegistrationRequestListResult>>('/auth/admin/registration-requests', { params })
      .then((response) => response.data),

  listAssignableRoles: () =>
    apiClient.get<ApiResponse<AuthAssignableRole[]>>('/auth/admin/roles').then((response) => response.data),

  approveRegistrationRequest: (id: string, data: DecideAuthRegistrationRequest) =>
    apiClient
      .post<ApiResponse<unknown>>(`/auth/admin/registration-requests/${id}/approve`, data)
      .then((response) => response.data),

  rejectRegistrationRequest: (id: string, data: DecideAuthRegistrationRequest) =>
    apiClient
      .post<ApiResponse<unknown>>(`/auth/admin/registration-requests/${id}/reject`, data)
      .then((response) => response.data),
};
