'use client';

import { create } from 'zustand';
import { gitApi, type GitChangeEntry, type GitLogEntry } from '@/lib/api/endpoints/git';
import { logger } from '@/lib/utils/errorUtils';

// ============================================================================
// Types
// ============================================================================

interface GitState {
  /** Git 사용 가능 여부 */
  isAvailable: boolean;
  /** 변경 사항 목록 */
  changes: GitChangeEntry[];
  /** 변경 사항 개수 */
  changeCount: number;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 커밋 중 */
  isCommitting: boolean;
  /** 에러 메시지 */
  error: string | null;
}

interface GitActions {
  /** Git 초기화 (서버 시작 시 호출) */
  initialize: () => Promise<void>;
  /** 변경 사항 조회 */
  refreshChanges: () => Promise<void>;
  /** 전체 커밋 */
  commitAll: (message: string, author?: string) => Promise<boolean>;
  /** 선택 파일 커밋 */
  commitFiles: (files: string[], message: string, author?: string) => Promise<boolean>;
  /** 특정 파일 변경 취소 */
  discardFile: (filePath: string) => Promise<boolean>;
  /** 전체 변경 취소 */
  discardAll: () => Promise<boolean>;
  /** 파일별 히스토리 조회 */
  getFileHistory: (filePath: string) => Promise<GitLogEntry[]>;
  /** 파일 복원 */
  restoreFile: (filePath: string, commitHash: string) => Promise<boolean>;
  /** 에러 초기화 */
  clearError: () => void;
}

type GitStore = GitState & GitActions;

const initialState: GitState = {
  isAvailable: false,
  changes: [],
  changeCount: 0,
  isLoading: false,
  isCommitting: false,
  error: null,
};

// ============================================================================
// Store
// ============================================================================

export const useGitStore = create<GitStore>((set, get) => ({
  ...initialState,

  initialize: async () => {
    try {
      const result = await gitApi.initialize();
      if (result.success) {
        set({ isAvailable: true });
        // 초기화 후 변경 사항 조회
        await get().refreshChanges();
      } else {
        logger.warn('Git 초기화 실패 (히스토리 비활성화)');
        set({ isAvailable: false });
      }
    } catch {
      set({ isAvailable: false });
    }
  },

  refreshChanges: async () => {
    if (!get().isAvailable) return;

    set({ isLoading: true, error: null });
    try {
      const result = await gitApi.getChanges();
      if (result.success && result.data) {
        const changes = result.data;
        set({
          changes,
          changeCount: changes.length,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, error: result.error || 'Failed to get changes' });
      }
    } catch {
      set({ isLoading: false, error: 'Network error' });
    }
  },

  commitAll: async (message, author) => {
    set({ isCommitting: true, error: null });
    try {
      const result = await gitApi.commitAll(message, author);
      if (result.success) {
        // 커밋 후 변경 사항 새로고침
        await get().refreshChanges();
        set({ isCommitting: false });
        return true;
      }
      set({ isCommitting: false, error: result.error || 'Commit failed' });
      return false;
    } catch {
      set({ isCommitting: false, error: 'Network error' });
      return false;
    }
  },

  commitFiles: async (files, message, author) => {
    set({ isCommitting: true, error: null });
    try {
      const result = await gitApi.commitFiles(files, message, author);
      if (result.success) {
        await get().refreshChanges();
        set({ isCommitting: false });
        return true;
      }
      set({ isCommitting: false, error: result.error || 'Commit failed' });
      return false;
    } catch {
      set({ isCommitting: false, error: 'Network error' });
      return false;
    }
  },

  discardFile: async (filePath) => {
    try {
      const result = await gitApi.discardFile(filePath);
      if (result.success) {
        await get().refreshChanges();
        return true;
      }
      set({ error: result.error || 'Discard failed' });
      return false;
    } catch {
      set({ error: 'Network error' });
      return false;
    }
  },

  discardAll: async () => {
    try {
      const result = await gitApi.discardAll();
      if (result.success) {
        await get().refreshChanges();
        return true;
      }
      set({ error: result.error || 'Discard all failed' });
      return false;
    } catch {
      set({ error: 'Network error' });
      return false;
    }
  },

  getFileHistory: async (filePath) => {
    try {
      const result = await gitApi.getFileHistory(filePath);
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  restoreFile: async (filePath, commitHash) => {
    try {
      const result = await gitApi.restoreFile(filePath, commitHash);
      if (result.success) {
        await get().refreshChanges();
        return true;
      }
      set({ error: result.error || 'Restore failed' });
      return false;
    } catch {
      set({ error: 'Network error' });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
