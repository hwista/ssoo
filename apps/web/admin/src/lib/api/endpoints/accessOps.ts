import type {
  AccessInspectionResult,
  PermissionCatalogResult,
  PermissionExceptionListResult,
} from '@ssoo/types/common';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface InspectAccessParams {
  userId?: string;
  loginId?: string;
  targetObjectType?: string;
  targetObjectId?: string;
  domainPermissionCodes?: string;
  includeInactive?: boolean;
}

export interface ListExceptionsParams {
  userId?: string;
  loginId?: string;
  exceptionAxis?: 'action' | 'object';
  targetObjectType?: string;
  targetObjectId?: string;
  permissionCode?: string;
  includeInactive?: boolean;
  limit?: number;
}

export interface RolePermissionItem {
  roleId: string;
  roleCode: string;
  roleName: string;
  roleScopeCode: string;
  description?: string | null;
  isActive: boolean;
  permissionCodes: string[];
  revision: string;
  assignedUserCount: number;
  activeUserCount: number;
}

export interface AccessAuditEvent {
  id: string;
  category: 'user' | 'auth-account' | 'session' | 'organization' | 'role-permission';
  eventType: string;
  eventAt: string;
  subjectId: string;
  summary: string;
  operatorUserId?: string | null;
  source?: string | null;
  activity?: string | null;
  transactionId?: string | null;
}

export const accessOpsApi = {
  catalog: async () => {
    const response = await apiClient.get<ApiResponse<PermissionCatalogResult>>(
      '/access/ops/catalog',
    );
    if (!response.data.data) {
      throw new Error('권한 기능 명세 응답이 비어 있습니다.');
    }
    return response.data.data;
  },

  inspect: async (params: InspectAccessParams) => {
    const response = await apiClient.get<ApiResponse<AccessInspectionResult>>(
      '/access/ops/inspect',
      { params },
    );
    if (!response.data.data) {
      throw new Error('권한 inspect 응답이 비어 있습니다.');
    }
    return response.data.data;
  },

  listExceptions: async (params: ListExceptionsParams) => {
    const response = await apiClient.get<ApiResponse<PermissionExceptionListResult>>(
      '/access/ops/exceptions',
      { params },
    );
    if (!response.data.data) {
      throw new Error('예외 목록 응답이 비어 있습니다.');
    }
    return response.data.data;
  },

  listRoles: async () => {
    const response = await apiClient.get<ApiResponse<RolePermissionItem[]>>('/access/ops/roles');
    if (!response.data.data) {
      throw new Error('역할별 권한 응답이 비어 있습니다.');
    }
    return response.data.data;
  },

  updateRolePermissions: async (roleCode: string, permissionCodes: string[], reason: string, expectedRevision: string) => {
    const response = await apiClient.put<ApiResponse<RolePermissionItem>>(
      `/access/ops/roles/${encodeURIComponent(roleCode)}/permissions`,
      { permissionCodes, reason, expectedRevision },
    );
    if (!response.data.data) {
      throw new Error('역할 권한 갱신 응답이 비어 있습니다.');
    }
    return response.data.data;
  },

  listAudit: async (limit = 100) => {
    const response = await apiClient.get<ApiResponse<AccessAuditEvent[]>>('/access/ops/audit', {
      params: { limit },
    });
    return response.data.data ?? [];
  },
};
