import { apiClient } from '../client';
import { ApiResponse } from '../types';

/**
 * 메뉴 타입
 */
export type MenuType = 'group' | 'menu' | 'action';

/**
 * 접근 권한 타입
 */
export type AccessType = 'full' | 'read' | 'none';

/**
 * 메뉴 아이템
 */
export interface MenuItem {
  menuId: string;
  menuCode: string;
  menuName: string;
  menuNameEn?: string | null;
  menuType: MenuType;
  parentMenuId: string | null;
  menuPath: string | null;
  icon: string | null;
  sortOrder: number;
  menuLevel: number;
  isVisible: boolean;
  isAdminMenu: boolean;
  accessType: AccessType;
  children?: MenuItem[];
}

/**
 * 즐겨찾기 메뉴
 */
export interface FavoriteMenu {
  id: string;
  menuId: string;
  menuCode: string;
  menuName: string;
  menuPath: string | null;
  icon: string | null;
  sortOrder: number;
}

/**
 * 내 메뉴 응답
 */
export interface MyMenuResponse {
  generalMenus: MenuItem[];
  adminMenus: MenuItem[];
  favorites: FavoriteMenu[];
}

/**
 * 메뉴 API
 */
export const menusApi = {
  /**
   * 내 메뉴 조회 (트리 + 즐겨찾기)
   */
  getMyMenus: async (): Promise<ApiResponse<MyMenuResponse>> => {
    const response = await apiClient.get<ApiResponse<MyMenuResponse>>('/menus/my');
    return response.data;
  },

  /**
   * 즐겨찾기 추가
   */
  addFavorite: async (menuId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>('/menus/favorites', { menuId });
    return response.data;
  },

  /**
   * 즐겨찾기 삭제
   */
  removeFavorite: async (menuId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/menus/favorites/${menuId}`);
    return response.data;
  },
};
