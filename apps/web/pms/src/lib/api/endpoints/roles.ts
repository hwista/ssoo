import { apiClient } from '../client';
import type { ApiResponse } from '../types';

/**
 * 역할 아이템 (cm_code_m의 ROLE 그룹)
 */
export interface RoleItem {
  id: string;
  codeGroup: string;
  codeValue: string;
  displayNameKo: string;
  displayNameEn: string | null;
  sortOrder: number;
}

/**
 * 역할별 메뉴 권한
 */
export interface RoleMenuPermission {
  menuId: string;
  menuCode: string;
  menuName: string;
  menuPath: string | null;
  parentMenuId: string | null;
  menuLevel: number;
  isAdminMenu: boolean;
  sortOrder: number;
  accessType: 'full' | 'read' | 'none';
}

/**
 * 역할 권한 수정 요청
 */
export interface UpdateRolePermissionsRequest {
  permissions: { menuId: string; accessType: 'full' | 'read' | 'none' }[];
}

/**
 * 역할 관리 API
 */
export const rolesApi = {
  /** 역할 목록 조회 */
  list: async (): Promise<ApiResponse<RoleItem[]>> => {
    const response = await apiClient.get<ApiResponse<RoleItem[]>>('/roles');
    return response.data;
  },

  /** 역할별 메뉴 권한 조회 */
  getMenuPermissions: async (
    roleCode: string,
  ): Promise<ApiResponse<RoleMenuPermission[]>> => {
    const response = await apiClient.get<ApiResponse<RoleMenuPermission[]>>(
      `/roles/${roleCode}/menus`,
    );
    return response.data;
  },

  /** 역할별 메뉴 권한 일괄 수정 */
  updateMenuPermissions: async (
    roleCode: string,
    data: UpdateRolePermissionsRequest,
  ): Promise<ApiResponse<{ updated: boolean }>> => {
    const response = await apiClient.put<
      ApiResponse<{ updated: boolean }>
    >(`/roles/${roleCode}/menus`, data);
    return response.data;
  },
};
