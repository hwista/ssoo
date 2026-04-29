import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface DmsAdminOverview {
  documents: {
    total: number;
    active: number;
    byVisibility: { self: number; organization: number; public: number };
    bySyncStatus: Record<string, number>;
    recentlyUpdated: number;
  };
  templates: {
    total: number;
    active: number;
  };
  grants: {
    activeGrants: number;
    pendingRequests: number;
  };
  topOwners: Array<{ ownerUserId: string; loginId: string | null; documentCount: number }>;
  generatedAt: string;
}

export async function fetchDmsAdminOverview(): Promise<ApiResponse<DmsAdminOverview>> {
  const { data } = await apiClient.get<ApiResponse<DmsAdminOverview>>('/dms/admin/overview');
  return data;
}
