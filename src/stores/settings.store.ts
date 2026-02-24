'use client';

import { create } from 'zustand';
import { settingsApi, type DmsConfigClient, type DeepPartialClient } from '@/lib/utils/apiClient';
import { logger } from '@/lib/utils/errorUtils';

// ============================================================================
// Types
// ============================================================================

interface SettingsState {
  /** 설정 로드 여부 */
  isLoaded: boolean;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 저장 중 */
  isSaving: boolean;
  /** 현재 설정 */
  config: DmsConfigClient | null;
  /** 현재 위키 디렉토리 경로 */
  wikiDir: string;
  /** 에러 메시지 */
  error: string | null;
}

interface SettingsActions {
  /** 설정 조회 */
  loadSettings: () => Promise<void>;
  /** 일반 설정 업데이트 */
  updateSettings: (partial: DeepPartialClient<DmsConfigClient>) => Promise<boolean>;
  /** Git 설정 업데이트 */
  updateGitSettings: (git: DeepPartialClient<DmsConfigClient>['git']) => Promise<boolean>;
  /** Git 저장소 경로 변경 */
  updateGitPath: (newPath: string, copyFiles: boolean) => Promise<boolean>;
}

// ============================================================================
// Store
// ============================================================================

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  // State
  isLoaded: false,
  isLoading: false,
  isSaving: false,
  config: null,
  wikiDir: '',
  error: null,

  // Actions
  loadSettings: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const response = await settingsApi.getSettings();
      if (response.success && response.data) {
        set({
          config: response.data.config,
          wikiDir: response.data.wikiDir,
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
          wikiDir: response.data.wikiDir,
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

  updateGitSettings: async (git) => {
    set({ isSaving: true, error: null });

    try {
      const response = await settingsApi.updateSettings({ git });
      if (response.success && response.data) {
        set({
          config: response.data.config,
          wikiDir: response.data.wikiDir,
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
          wikiDir: response.data.wikiDir,
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
