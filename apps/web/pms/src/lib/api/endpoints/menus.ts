import type {
  PmsAccessMenuItem,
  PmsAccessSnapshot,
  PmsAccessType,
  PmsFavoriteMenuItem,
} from '@ssoo/types/pms';
import { apiClient } from '../client';
import { ApiResponse } from '../types';

/**
 * 메뉴 타입
 */
export type MenuType = PmsAccessMenuItem['menuType'];

/**
 * 접근 권한 타입
 */
export type AccessType = PmsAccessType;

/**
 * 메뉴 아이템
 */
export type MenuItem = PmsAccessMenuItem;

/**
 * 즐겨찾기 메뉴
 */
export type FavoriteMenu = PmsFavoriteMenuItem;

/**
 * PMS access snapshot (`/menus/my`)
 */
export type MyMenuResponse = PmsAccessSnapshot;

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
  addFavorite: async (menuId: string): Promise<ApiResponse<FavoriteMenu>> => {
    const response = await apiClient.post<ApiResponse<FavoriteMenu>>('/menus/favorites', { menuId });
    return response.data;
  },

  /**
   * 즐겨찾기 삭제
   */
  removeFavorite: async (menuId: string): Promise<ApiResponse<{ removed: boolean }>> => {
    const response = await apiClient.delete<ApiResponse<{ removed: boolean }>>(
      `/menus/favorites/${menuId}`,
    );
    return response.data;
  },
};
