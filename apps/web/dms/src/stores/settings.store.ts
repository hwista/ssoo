'use client';

import { create } from 'zustand';
import {
  settingsApi,
  type DmsSettingsConfigClient,
  type DeepPartialClient,
  type SettingsAccessClient,
  type SettingsRuntimeClient,
} from '@/lib/api/endpoints/settings';
import { logger } from '@/lib/utils/errorUtils';
import { getCurrentUserScopeId, isUserScopeTransition, registerUserScopedReset } from '@/lib/user-scope';

interface SettingsState {
  isLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  config: DmsSettingsConfigClient | null;
  docDir: string;
  access: SettingsAccessClient | null;
  runtime: SettingsRuntimeClient | null;
  error: string | null;
}

interface SettingsActions {
  loadSettings: (includeRuntime?: boolean) => Promise<void>;
  updateSettings: (partial: DeepPartialClient<DmsSettingsConfigClient>) => Promise<boolean>;
  reset: () => void;
}

const INITIAL_STATE: SettingsState = {
  isLoaded: false,
  isLoading: false,
  isSaving: false,
  config: null,
  docDir: '',
  access: null,
  runtime: null,
  error: null,
};

interface SettingsRequestScope {
  seq: number;
  userId: string | null;
}

let settingsRequestSeq = 0;

function beginSettingsRequest(): SettingsRequestScope {
  settingsRequestSeq += 1;
  return {
    seq: settingsRequestSeq,
    userId: getCurrentUserScopeId(),
  };
}

function invalidateSettingsRequests(): void {
  settingsRequestSeq += 1;
}

function isCurrentSettingsRequest(scope: SettingsRequestScope): boolean {
  return scope.seq === settingsRequestSeq && scope.userId === getCurrentUserScopeId();
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  ...INITIAL_STATE,

  loadSettings: async (includeRuntime = false) => {
    if (get().isLoading) return;
    const requestScope = beginSettingsRequest();
    set({ isLoading: true, error: null });

    try {
      const response = await settingsApi.getSettings(includeRuntime);
      if (!isCurrentSettingsRequest(requestScope)) return;

      if (response.success && response.data) {
        set({
          config: response.data.config,
          docDir: response.data.docDir,
          access: response.data.access,
          runtime: includeRuntime ? response.data.runtime : get().runtime,
          isLoaded: true,
        });
      } else {
        set({ error: response.error || '설정 조회 실패' });
      }
    } catch (error) {
      if (!isCurrentSettingsRequest(requestScope)) return;

      logger.error('설정 조회 실패', error);
      set({ error: '설정 조회 중 오류가 발생했습니다.' });
    } finally {
      if (isCurrentSettingsRequest(requestScope)) {
        set({ isLoading: false });
      }
    }
  },

  updateSettings: async (partial) => {
    const requestScope = beginSettingsRequest();
    set({ isSaving: true, error: null });

    try {
      const response = await settingsApi.updateSettings(partial);
      if (!isCurrentSettingsRequest(requestScope)) return false;

      if (response.success && response.data) {
        set({
          config: response.data.config,
          docDir: response.data.docDir,
          access: response.data.access,
          runtime: response.data.runtime,
        });
        return true;
      }
      set({ error: response.error || '설정 저장 실패' });
      return false;
    } catch (error) {
      if (!isCurrentSettingsRequest(requestScope)) return false;

      logger.error('설정 저장 실패', error);
      set({ error: '설정 저장 중 오류가 발생했습니다.' });
      return false;
    } finally {
      if (isCurrentSettingsRequest(requestScope)) {
        set({ isSaving: false });
      }
    }
  },

  reset: () => {
    invalidateSettingsRequests();
    set(INITIAL_STATE);
  },
}));

registerUserScopedReset((next, prev) => {
  if (isUserScopeTransition(next, prev)) {
    useSettingsStore.getState().reset();
  }
});
