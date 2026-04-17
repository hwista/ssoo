import { create } from 'zustand';
import type { PmsAccessSnapshot } from '@ssoo/types/pms';
import { menusApi } from '@/lib/api/endpoints/menus';
import { useMenuStore } from './menu.store';

interface AccessStoreState {
  snapshot: PmsAccessSnapshot | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
}

interface AccessStoreActions {
  hydrate: () => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: AccessStoreState = {
  snapshot: null,
  isLoading: false,
  hasLoaded: false,
  error: null,
};

function getAccessErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'PMS 접근 권한을 불러오지 못했습니다.';
}

export const useAccessStore = create<AccessStoreState & AccessStoreActions>()((set, get) => ({
  ...INITIAL_STATE,
  hydrate: async () => {
    if (get().isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await menusApi.getMyMenus();

      if (!response.success || !response.data) {
        throw new Error(response.message || 'PMS 접근 권한을 불러오지 못했습니다.');
      }

      useMenuStore.getState().applyAccessSnapshot(response.data);

      set({
        snapshot: response.data,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
    } catch (error) {
      useMenuStore.getState().clearMenu();

      set({
        snapshot: null,
        isLoading: false,
        hasLoaded: true,
        error: getAccessErrorMessage(error),
      });
    }
  },
  reset: () => {
    useMenuStore.getState().clearMenu();
    set(INITIAL_STATE);
  },
}));
