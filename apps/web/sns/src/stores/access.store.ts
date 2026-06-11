import { create } from 'zustand';
import type { SnsAccessSnapshot } from '@ssoo/types/sns';
import { accessApi } from '@/lib/api';

interface AccessStoreState {
  snapshot: SnsAccessSnapshot | null;
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
  return error instanceof Error ? error.message : 'SNS 접근 권한을 불러오지 못했습니다.';
}

export const useAccessStore = create<AccessStoreState & AccessStoreActions>()((set, get) => ({
  ...INITIAL_STATE,
  hydrate: async () => {
    if (get().isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await accessApi.me();
      const snapshot = response.data.data;

      if (!snapshot) {
        throw new Error(response.data.error?.message || response.data.message || 'SNS 접근 권한을 불러오지 못했습니다.');
      }

      set({
        snapshot,
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
    } catch (error) {
      set({
        snapshot: null,
        isLoading: false,
        hasLoaded: true,
        error: getAccessErrorMessage(error),
      });
    }
  },
  reset: () => set(INITIAL_STATE),
}));
