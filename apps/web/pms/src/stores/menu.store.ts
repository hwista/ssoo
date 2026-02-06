import { create } from 'zustand';
import type { MenuItem, FavoriteMenuItem, AccessType } from '@/types';
import { useAuthStore } from './auth.store';
import { apiClient } from '@/lib/api/client';

interface MenuStoreState {
  // 일반 메뉴 트리 (is_admin_menu = false)
  generalMenus: MenuItem[];
  // 관리자 메뉴 트리 (is_admin_menu = true, isAdmin 사용자만)
  adminMenus: MenuItem[];
  // 플랫 메뉴 맵 (빠른 조회용 - 일반 + 관리자 통합)
  menuMap: Map<string, MenuItem>;
  // 즐겨찾기 메뉴
  favorites: FavoriteMenuItem[];
  // 메뉴 로딩 상태
  isLoading: boolean;
  // 마지막 갱신 시각
  lastUpdatedAt: Date | null;
}

interface MenuStoreActions {
  // 메뉴 로드 (API 호출 후 설정)
  setMenus: (generalMenus: MenuItem[], adminMenus: MenuItem[]) => void;
  // 즐겨찾기 설정
  setFavorites: (favorites: FavoriteMenuItem[]) => void;
  // 즐겨찾기 여부 확인
  isFavorite: (menuId: string) => boolean;
  // 즐겨찾기 추가
  addFavorite: (item: Omit<FavoriteMenuItem, 'id' | 'sortOrder'>) => Promise<void>;
  // 즐겨찾기 삭제
  removeFavorite: (menuId: string) => Promise<void>;
  // 메뉴 새로고침
  refreshMenu: () => Promise<void>;
  // 특정 메뉴 권한 확인
  getMenuAccess: (menuCode: string) => AccessType;
  // 메뉴 코드로 메뉴 찾기
  getMenuByCode: (menuCode: string) => MenuItem | undefined;
  // 로딩 상태 설정
  setLoading: (loading: boolean) => void;
  // 메뉴 초기화 (로그아웃 시)
  clearMenu: () => void;
}

interface MenuStore extends MenuStoreState, MenuStoreActions {}

// 메뉴 트리를 플랫 맵으로 변환
const buildMenuMap = (menus: MenuItem[]): Map<string, MenuItem> => {
  const map = new Map<string, MenuItem>();

  const traverse = (items: MenuItem[]) => {
    for (const item of items) {
      map.set(item.menuCode, item);
      if (item.children.length > 0) {
        traverse(item.children);
      }
    }
  };

  traverse(menus);
  return map;
};

export const useMenuStore = create<MenuStore>()((set, get) => ({
  // Initial State
  generalMenus: [],
  adminMenus: [],
  menuMap: new Map(),
  favorites: [],
  isLoading: false,
  lastUpdatedAt: null,

  // Actions
  setMenus: (generalMenus: MenuItem[], adminMenus: MenuItem[]) => {
    // 일반 메뉴와 관리자 메뉴를 통합하여 menuMap 구성
    const allMenus = [...generalMenus, ...adminMenus];
    const menuMap = buildMenuMap(allMenus);
    set({
      generalMenus,
      adminMenus,
      menuMap,
      lastUpdatedAt: new Date(),
    });
  },

  setFavorites: (favorites: FavoriteMenuItem[]) => {
    set({ favorites });
  },

  isFavorite: (menuId: string): boolean => {
    return get().favorites.some((f) => f.menuId === menuId);
  },

  addFavorite: async (item: Omit<FavoriteMenuItem, 'id' | 'sortOrder'>) => {
    try {
      const response = await apiClient.post('/menus/favorites', {
        menuId: item.menuId,
      });
      
      if (response.data.success) {
        const newFavorite: FavoriteMenuItem = response.data.data;
        set((state) => ({
          favorites: [...state.favorites, newFavorite],
        }));
      }
    } catch (error) {
      console.error('[MenuStore] Failed to add favorite:', error);
      throw error;
    }
  },

  removeFavorite: async (menuId: string) => {
    try {
      await apiClient.delete(`/menus/favorites/${menuId}`);
      set((state) => ({
        favorites: state.favorites.filter((f) => f.menuId !== menuId),
      }));
    } catch (error) {
      console.error('[MenuStore] Failed to remove favorite:', error);
      throw error;
    }
  },

  refreshMenu: async () => {
    set({ isLoading: true });
    try {
      const accessToken = useAuthStore.getState().accessToken;
      
      if (!accessToken) {
        set({ isLoading: false });
        return;
      }
      
      const response = await apiClient.get('/menus/my');
      const result = response.data;
      
      if (result.success) {
        get().setMenus(
          result.data.generalMenus || [],
          result.data.adminMenus || []
        );
        get().setFavorites(result.data.favorites || []);
      }
      set({ lastUpdatedAt: new Date() });
    } catch (error) {
      console.error('[MenuStore] Failed to refresh menu:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  getMenuAccess: (menuCode: string): AccessType => {
    const menu = get().menuMap.get(menuCode);
    return menu?.accessType ?? 'none';
  },

  getMenuByCode: (menuCode: string): MenuItem | undefined => {
    return get().menuMap.get(menuCode);
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  clearMenu: () => {
    set({
      generalMenus: [],
      adminMenus: [],
      menuMap: new Map(),
      favorites: [],
      isLoading: false,
      lastUpdatedAt: null,
    });
  },
}));
