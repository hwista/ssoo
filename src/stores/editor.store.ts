'use client';

import { create } from 'zustand';
import { useCallback, useMemo } from 'react';
import { useCurrentTabId } from '@/contexts/TabInstanceContext';
import { fileApi, getErrorMessage } from '@/lib/api';
import type { DocumentMetadata } from '@/types';
import { logger, safeAsync, PerformanceTimer } from '@/lib/utils/errorUtils';

// ============================================
// Types
// ============================================

interface FileMetadata {
  createdAt: Date | null;
  modifiedAt: Date | null;
  size: number | null;
}

interface EditorHandlers {
  save: () => Promise<void>;
  cancel: () => void;
  getSelection: () => { from: number; to: number };
  insertAt: (from: number, to: number, text: string) => void;
  setPendingInsert: (range: { from: number; to: number } | null) => void;
}

/** 탭별 에디터 상태 */
export interface EditorTabState {
  content: string;
  currentFilePath: string | null;
  isEditing: boolean;
  fileMetadata: FileMetadata;
  documentMetadata: DocumentMetadata | null;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  editorHandlers: EditorHandlers | null;
  pendingMetadataUpdate: Partial<DocumentMetadata> | null;
}

const initialTabState: EditorTabState = {
  content: '',
  currentFilePath: null,
  isEditing: false,
  fileMetadata: { createdAt: null, modifiedAt: null, size: null },
  documentMetadata: null,
  isLoading: false,
  error: null,
  hasUnsavedChanges: false,
  isSaving: false,
  editorHandlers: null,
  pendingMetadataUpdate: null,
};

// ============================================
// Internal Multi-Tab Store
// ============================================

interface EditorMultiStoreState {
  editors: Record<string, EditorTabState>;
}

interface EditorMultiStoreActions {
  _updateTab: (tabId: string, patch: Partial<EditorTabState>) => void;
  _getTab: (tabId: string) => EditorTabState;
  removeTab: (tabId: string) => void;

  loadFile: (tabId: string, path: string) => Promise<void>;
  saveFile: (tabId: string, path: string, content: string) => Promise<void>;
  saveFileKeepEditing: (tabId: string, path: string, content: string) => Promise<void>;
  refreshFileMetadata: (tabId: string, path: string) => Promise<void>;
  updateDocumentMetadata: (tabId: string, update: Partial<DocumentMetadata>) => Promise<void>;
  setLocalDocumentMetadata: (tabId: string, update: Partial<DocumentMetadata>) => void;
  flushPendingMetadata: (tabId: string) => Promise<void>;
  discardPendingMetadata: (tabId: string) => Promise<void>;
}

type EditorMultiStore = EditorMultiStoreState & EditorMultiStoreActions;

const useEditorMultiStore = create<EditorMultiStore>((set, get) => ({
  editors: {},

  _updateTab: (tabId, patch) => {
    set(state => {
      const prev = state.editors[tabId] ?? { ...initialTabState };
      return {
        editors: { ...state.editors, [tabId]: { ...prev, ...patch } },
      };
    });
  },

  _getTab: (tabId) => get().editors[tabId] ?? { ...initialTabState },

  removeTab: (tabId) => {
    set(state => {
      const rest = { ...state.editors };
      delete rest[tabId];
      return { editors: rest };
    });
  },

  // ---- Async Operations (tabId 스코프) ----

  loadFile: async (tabId, path) => {
    const timer = new PerformanceTimer('파일 로드');
    get()._updateTab(tabId, { isLoading: true, error: null, currentFilePath: path });

    try {
      await safeAsync(async () => {
        const response = await fileApi.read(path);
        if (!response.success) {
          throw new Error(`파일 읽기 실패: ${getErrorMessage(response)}`);
        }

        let fileData;
        try {
          fileData = typeof response.data === 'string'
            ? JSON.parse(response.data)
            : response.data;
        } catch {
          fileData = { content: response.data || '', metadata: null };
        }

        const patch: Partial<EditorTabState> = { content: fileData.content || '' };

        if (fileData.metadata) {
          patch.fileMetadata = {
            createdAt: new Date(fileData.metadata.createdAt),
            modifiedAt: new Date(fileData.metadata.modifiedAt),
            size: fileData.metadata.size,
          };
          patch.documentMetadata = fileData.metadata.document || null;
        } else {
          patch.fileMetadata = initialTabState.fileMetadata;
          patch.documentMetadata = null;
        }

        get()._updateTab(tabId, patch);
        logger.info('파일 로드 성공', { path, hasMetadata: !!fileData.metadata });
      }, { operation: 'loadFile', component: 'EditorMultiStore', context: 'loadFile' });

      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일 로드 중 오류', error);
      const errorMsg = error instanceof Error ? error.message : '파일 로드 실패';
      get()._updateTab(tabId, { error: errorMsg });
    } finally {
      get()._updateTab(tabId, { isLoading: false });
    }
  },

  saveFile: async (tabId, path, content) => {
    const timer = new PerformanceTimer('파일 저장');
    get()._updateTab(tabId, { isLoading: true, error: null });

    try {
      await safeAsync(async () => {
        const response = await fileApi.update(path, content);
        if (!response.success) {
          throw new Error(`파일 저장 실패: ${getErrorMessage(response)}`);
        }

        get()._updateTab(tabId, { content, isEditing: false });
        await get().flushPendingMetadata(tabId);
        await get().refreshFileMetadata(tabId, path);

        logger.info('파일 저장 성공', { path });
      }, { operation: 'saveFile', component: 'EditorMultiStore', context: 'saveFile' });

      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일 저장 중 오류', error);
      const errorMsg = error instanceof Error ? error.message : '파일 저장 실패';
      get()._updateTab(tabId, { error: errorMsg });
      throw error;
    } finally {
      get()._updateTab(tabId, { isLoading: false });
    }
  },

  saveFileKeepEditing: async (tabId, path, content) => {
    const timer = new PerformanceTimer('임시 파일 저장');

    try {
      await safeAsync(async () => {
        const response = await fileApi.update(path, content);
        if (!response.success) {
          throw new Error(`파일 저장 실패: ${getErrorMessage(response)}`);
        }

        get()._updateTab(tabId, { content });
        await get().flushPendingMetadata(tabId);
        await get().refreshFileMetadata(tabId, path);

        logger.info('임시 저장 성공 (편집 모드 유지)', { path });
      }, { operation: 'saveFileKeepEditing', component: 'EditorMultiStore', context: 'saveFileKeepEditing' });

      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('임시 저장 중 오류', error);
      throw error;
    }
  },

  refreshFileMetadata: async (tabId, path) => {
    try {
      const response = await fileApi.getMetadata(path);
      if (!response.success) {
        throw new Error(`메타데이터 조회 실패: ${getErrorMessage(response)}`);
      }

      let metadataResponse;
      try {
        metadataResponse = typeof response.data === 'string'
          ? JSON.parse(response.data)
          : response.data;
      } catch {
        logger.warn('메타데이터 파싱 실패');
        return;
      }

      if (metadataResponse.metadata) {
        get()._updateTab(tabId, {
          fileMetadata: {
            createdAt: new Date(metadataResponse.metadata.createdAt),
            modifiedAt: new Date(metadataResponse.metadata.modifiedAt),
            size: metadataResponse.metadata.size,
          },
          documentMetadata: metadataResponse.metadata.document || null,
        });
      }
    } catch (error) {
      logger.warn('메타데이터 새로고침 실패', error);
    }
  },

  setLocalDocumentMetadata: (tabId, update) => {
    const tabState = get()._getTab(tabId);
    const patch: Partial<EditorTabState> = {
      pendingMetadataUpdate: { ...(tabState.pendingMetadataUpdate || {}), ...update },
    };
    if (tabState.documentMetadata) {
      patch.documentMetadata = { ...tabState.documentMetadata, ...update };
    }
    get()._updateTab(tabId, patch);
  },

  flushPendingMetadata: async (tabId) => {
    const tabState = get()._getTab(tabId);
    if (!tabState.pendingMetadataUpdate || !tabState.currentFilePath) return;

    try {
      const response = await fileApi.updateMetadata(tabState.currentFilePath, tabState.pendingMetadataUpdate);
      if (!response.success) {
        throw new Error(`메타데이터 플러시 실패: ${getErrorMessage(response)}`);
      }
      const merged = response.data as DocumentMetadata | undefined;
      const patch: Partial<EditorTabState> = { pendingMetadataUpdate: null };
      if (merged) {
        patch.documentMetadata = merged;
      }
      get()._updateTab(tabId, patch);
      logger.info('보류 메타데이터 플러시 완료', { path: tabState.currentFilePath });
    } catch (error) {
      logger.error('메타데이터 플러시 실패', error);
      throw error;
    }
  },

  discardPendingMetadata: async (tabId) => {
    const tabState = get()._getTab(tabId);
    if (!tabState.pendingMetadataUpdate) return;

    get()._updateTab(tabId, { pendingMetadataUpdate: null });
    if (tabState.currentFilePath) {
      await get().refreshFileMetadata(tabId, tabState.currentFilePath);
    }
    logger.info('보류 메타데이터 폐기', { path: tabState.currentFilePath });
  },

  updateDocumentMetadata: async (tabId, update) => {
    const tabState = get()._getTab(tabId);
    if (!tabState.currentFilePath) {
      logger.warn('메타데이터 업데이트 실패: 파일 경로 없음');
      return;
    }

    try {
      const response = await fileApi.updateMetadata(tabState.currentFilePath, update);
      if (!response.success) {
        throw new Error(`메타데이터 업데이트 실패: ${getErrorMessage(response)}`);
      }

      const merged = response.data as DocumentMetadata | undefined;
      if (merged) {
        get()._updateTab(tabId, { documentMetadata: merged });
      } else {
        get()._updateTab(tabId, {
          documentMetadata: tabState.documentMetadata
            ? { ...tabState.documentMetadata, ...update, updatedAt: new Date().toISOString() }
            : null,
        });
      }

      logger.info('문서 메타데이터 업데이트 성공', { path: tabState.currentFilePath });
    } catch (error) {
      logger.error('문서 메타데이터 업데이트 실패', error);
      throw error;
    }
  },
}));

// ============================================
// Public Hooks
// ============================================

/** tabId에 바인딩된 액션 생성 */
function createTabActions(tabId: string) {
  const gs = () => useEditorMultiStore.getState();

  return {
    setContent: (content: string) => gs()._updateTab(tabId, { content }),
    setIsEditing: (editing: boolean) => gs()._updateTab(tabId, { isEditing: editing }),
    setError: (error: string | null) => gs()._updateTab(tabId, { error }),
    setHasUnsavedChanges: (hasChanges: boolean) => gs()._updateTab(tabId, { hasUnsavedChanges: hasChanges }),
    setIsSaving: (saving: boolean) => gs()._updateTab(tabId, { isSaving: saving }),
    setEditorHandlers: (handlers: EditorHandlers) => gs()._updateTab(tabId, { editorHandlers: handlers }),
    clearEditorHandlers: () => gs()._updateTab(tabId, { editorHandlers: null }),
    setLocalDocumentMetadata: (update: Partial<DocumentMetadata>) => gs().setLocalDocumentMetadata(tabId, update),
    loadFile: (path: string) => gs().loadFile(tabId, path),
    saveFile: (path: string, content: string) => gs().saveFile(tabId, path, content),
    saveFileKeepEditing: (path: string, content: string) => gs().saveFileKeepEditing(tabId, path, content),
    refreshFileMetadata: (path: string) => gs().refreshFileMetadata(tabId, path),
    updateDocumentMetadata: (update: Partial<DocumentMetadata>) => gs().updateDocumentMetadata(tabId, update),
    flushPendingMetadata: () => gs().flushPendingMetadata(tabId),
    discardPendingMetadata: () => gs().discardPendingMetadata(tabId),
    reset: () => gs()._updateTab(tabId, { ...initialTabState }),
    removeTabEditor: () => gs().removeTab(tabId),
  };
}

/**
 * 탭별 에디터 스토어 훅
 * 
 * TabInstanceContext에서 tabId를 자동 해석하여
 * 해당 탭의 에디터 상태와 액션을 반환합니다.
 * 
 * ⚠️ TabInstanceContext.Provider 내부에서만 사용 가능
 * (ContentArea가 각 탭에 Provider를 감싸줌)
 */
export function useEditorStore() {
  const tabId = useCurrentTabId();

  // 이 탭의 상태만 구독 (다른 탭 변경 시 리렌더 없음)
  const tabState = useEditorMultiStore(
    useCallback(state => state.editors[tabId] ?? initialTabState, [tabId])
  );

  // tabId는 컴포넌트 인스턴스별 고정 → actions 안정적
  const actions = useMemo(() => createTabActions(tabId), [tabId]);

  return { ...tabState, ...actions };
}

/**
 * 활성 탭의 에디터 파일 경로 (Sidebar 등 탭 컨텍스트 외부용)
 * 
 * @param activeTabId - 탭 스토어의 activeTabId를 직접 전달
 */
export function useActiveEditorFilePath(activeTabId: string | null): string | null {
  return useEditorMultiStore(
    useCallback(
      state => activeTabId ? (state.editors[activeTabId]?.currentFilePath ?? null) : null,
      [activeTabId]
    )
  );
}
