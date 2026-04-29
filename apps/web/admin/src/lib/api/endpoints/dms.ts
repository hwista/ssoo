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

export interface DmsAdminDocument {
  documentId: string;
  relativePath: string;
  visibilityScope: string;
  syncStatusCode: string;
  documentStatusCode: string;
  isActive: boolean;
  ownerUserId: string;
  ownerLoginId: string | null;
  revisionSeq: number;
  updatedAt: string;
  lastSyncedAt: string | null;
}

export interface DmsAdminDocumentListResult {
  items: DmsAdminDocument[];
  page: number;
  limit: number;
  total: number;
}

export interface DmsAdminDocumentListParams {
  q?: string;
  visibilityScope?: string;
  syncStatusCode?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function fetchDmsAdminDocuments(
  params: DmsAdminDocumentListParams = {},
): Promise<ApiResponse<DmsAdminDocumentListResult>> {
  const search: Record<string, string> = {};
  if (params.q) search.q = params.q;
  if (params.visibilityScope) search.visibilityScope = params.visibilityScope;
  if (params.syncStatusCode) search.syncStatusCode = params.syncStatusCode;
  if (typeof params.isActive === 'boolean') search.isActive = String(params.isActive);
  if (params.page) search.page = String(params.page);
  if (params.limit) search.limit = String(params.limit);
  const { data } = await apiClient.get<ApiResponse<DmsAdminDocumentListResult>>(
    '/dms/admin/documents',
    { params: search },
  );
  return data;
}
