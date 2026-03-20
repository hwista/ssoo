import { apiClient } from '../client';
import type { ApiResponse } from '../types';

/**
 * 관리자용 메뉴 아이템
 */
export interface MenuAdminItem {
  id: string;
  menuCode: string;
  menuName: string;
  menuNameEn: string | null;
  menuType: string;
  parentMenuId: string | null;
  menuPath: string | null;
  icon: string | null;
  sortOrder: number;
  menuLevel: number;
  isVisible: boolean;
  isEnabled: boolean;
  isAdminMenu: boolean;
  openType: string;
  description: string | null;
  parentMenuName: string | null;
}

/**
 * 메뉴 생성 요청
 */
export interface CreateMenuAdminRequest {
  menuCode: string;
  menuName: string;
  menuNameEn?: string;
  menuType?: string;
  parentMenuId?: string;
  menuPath?: string;
  icon?: string;
  sortOrder?: number;
  isVisible?: boolean;
  isAdminMenu?: boolean;
  openType?: string;
  description?: string;
}

/**
 * 메뉴 수정 요청
 */
export interface UpdateMenuAdminRequest {
  menuName?: string;
  menuNameEn?: string;
  menuType?: string;
  parentMenuId?: string;
  menuPath?: string;
  icon?: string;
  sortOrder?: number;
  isVisible?: boolean;
  isEnabled?: boolean;
  isAdminMenu?: boolean;
  openType?: string;
  description?: string;
}

/**
 * 메뉴 관리 API (관리자)
 */
export const menusAdminApi = {
  /** 전체 메뉴 목록 */
  list: async (): Promise<ApiResponse<MenuAdminItem[]>> => {
    const response = await apiClient.get<ApiResponse<MenuAdminItem[]>>('/menus/admin');
    return response.data;
  },

  /** 단일 메뉴 조회 */
  getOne: async (id: string): Promise<ApiResponse<MenuAdminItem>> => {
    const response = await apiClient.get<ApiResponse<MenuAdminItem>>(`/menus/admin/${id}`);
    return response.data;
  },

  /** 메뉴 생성 */
  create: async (data: CreateMenuAdminRequest): Promise<ApiResponse<MenuAdminItem>> => {
    const response = await apiClient.post<ApiResponse<MenuAdminItem>>('/menus/admin', data);
    return response.data;
  },

  /** 메뉴 수정 */
  update: async (id: string, data: UpdateMenuAdminRequest): Promise<ApiResponse<MenuAdminItem>> => {
    const response = await apiClient.put<ApiResponse<MenuAdminItem>>(`/menus/admin/${id}`, data);
    return response.data;
  },

  /** 메뉴 비활성화 */
  deactivate: async (id: string): Promise<ApiResponse<MenuAdminItem>> => {
    const response = await apiClient.delete<ApiResponse<MenuAdminItem>>(`/menus/admin/${id}`);
    return response.data;
  },
};
