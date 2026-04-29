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

export interface DmsAdminTemplate {
  templateId: string;
  templateKey: string;
  relativePath: string;
  templateScopeCode: string;
  templateKindCode: string;
  visibilityCode: string;
  templateStatusCode: string;
  ownerRef: string;
  isActive: boolean;
  updatedAt: string;
}

export interface DmsAdminTemplateListResult {
  items: DmsAdminTemplate[];
  page: number;
  limit: number;
  total: number;
}

export interface DmsAdminTemplateListParams {
  q?: string;
  scope?: string;
  kindCode?: string;
  statusCode?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export async function fetchDmsAdminTemplates(
  params: DmsAdminTemplateListParams = {},
): Promise<ApiResponse<DmsAdminTemplateListResult>> {
  const search: Record<string, string> = {};
  if (params.q) search.q = params.q;
  if (params.scope) search.scope = params.scope;
  if (params.kindCode) search.kindCode = params.kindCode;
  if (params.statusCode) search.statusCode = params.statusCode;
  if (typeof params.isActive === 'boolean') search.isActive = String(params.isActive);
  if (params.page) search.page = String(params.page);
  if (params.limit) search.limit = String(params.limit);
  const { data } = await apiClient.get<ApiResponse<DmsAdminTemplateListResult>>(
    '/dms/admin/templates',
    { params: search },
  );
  return data;
}

export interface DmsAdminGitStatusResult {
  binding: Record<string, unknown> | null;
  sync: Record<string, unknown> | null;
  error: string | null;
}

export interface DmsAdminGitHistoryItem {
  hash: string;
  hashShort: string;
  author: string;
  date: string;
  message: string;
}

export interface DmsAdminGitHistoryResult {
  items: DmsAdminGitHistoryItem[];
  error: string | null;
}

export async function fetchDmsAdminGitStatus(remote = 'origin'): Promise<ApiResponse<DmsAdminGitStatusResult>> {
  const { data } = await apiClient.get<ApiResponse<DmsAdminGitStatusResult>>('/dms/admin/git/status', {
    params: { remote },
  });
  return data;
}

export async function fetchDmsAdminGitHistory(maxCount = 50): Promise<ApiResponse<DmsAdminGitHistoryResult>> {
  const { data } = await apiClient.get<ApiResponse<DmsAdminGitHistoryResult>>('/dms/admin/git/history', {
    params: { maxCount: String(maxCount) },
  });
  return data;
}
