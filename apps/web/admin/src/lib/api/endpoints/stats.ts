import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface AdminStats {
  activeUsers: number;
  roles: number;
  organizations: number;
  permissions: number;
}

export async function fetchAdminStats(): Promise<ApiResponse<AdminStats>> {
  const { data } = await apiClient.get<ApiResponse<AdminStats>>('/users/stats');
  return data;
}
