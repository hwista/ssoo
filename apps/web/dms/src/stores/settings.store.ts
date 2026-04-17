'use client';

import { create } from 'zustand';
import {
  settingsApi,
  type DmsSettingsConfigClient,
  type DeepPartialClient,
  type SettingsAccessClient,
} from '@/lib/api/endpoints/settings';
import { logger } from '@/lib/utils/errorUtils';

interface SettingsState {
  isLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  config: DmsSettingsConfigClient | null;
  docDir: string;
  access: SettingsAccessClient | null;
  error: string | null;
}

interface SettingsActions {
  loadSettings: () => Promise<void>;
  updateSettings: (partial: DeepPartialClient<DmsSettingsConfigClient>) => Promise<boolean>;
  updateGitPath: (newPath: string, copyFiles: boolean) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  isLoaded: false,
  isLoading: false,
  isSaving: false,
  config: null,
  docDir: '',
  access: null,
  error: null,

  loadSettings: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const response = await settingsApi.getSettings();
      if (response.success && response.data) {
        set({
          config: response.data.config,
          docDir: response.data.docDir,
          access: response.data.access,
          isLoaded: true,
        });
      } else {
        set({ error: response.error || '설정 조회 실패' });
      }
    } catch (error) {
      logger.error('설정 조회 실패', error);
      set({ error: '설정 조회 중 오류가 발생했습니다.' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (partial) => {
    set({ isSaving: true, error: null });

    try {
      const response = await settingsApi.updateSettings(partial);
      if (response.success && response.data) {
        set({
          config: response.data.config,
          docDir: response.data.docDir,
          access: response.data.access,
        });
        return true;
      }
      set({ error: response.error || '설정 저장 실패' });
      return false;
    } catch (error) {
      logger.error('설정 저장 실패', error);
      set({ error: '설정 저장 중 오류가 발생했습니다.' });
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  updateGitPath: async (newPath, copyFiles) => {
    set({ isSaving: true, error: null });

    try {
      const response = await settingsApi.updateGitPath(newPath, copyFiles);
      if (response.success && response.data) {
        set({
          config: response.data.config,
          docDir: response.data.docDir,
          access: response.data.access,
        });
        return true;
      }
      set({ error: response.error || '경로 변경 실패' });
      return false;
    } catch (error) {
      logger.error('Git 경로 변경 실패', error);
      set({ error: '경로 변경 중 오류가 발생했습니다.' });
      return false;
    } finally {
      set({ isSaving: false });
    }
  },
}));
