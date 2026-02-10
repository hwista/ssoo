'use client';

import { create } from 'zustand';
import { fileApi, getErrorMessage } from '@/lib/utils/apiClient';
import type { DocumentMetadata } from '@/types';
import { logger, safeAsync, PerformanceTimer } from '@/lib/utils/errorUtils';

// 파일 메타데이터 타입
interface FileMetadata {
  createdAt: Date | null;
  modifiedAt: Date | null;
  size: number | null;
}

// 에디터 핸들러 (Editor 컴포넌트에서 등록)
interface EditorHandlers {
  save: () => Promise<void>;
  cancel: () => void;
  autoSaveToggle: () => void;
}

interface EditorState {
  // 상태
  content: string;
  currentFilePath: string | null;  // 현재 로드된 파일 경로
  isEditing: boolean;
  fileMetadata: FileMetadata;
  documentMetadata: DocumentMetadata | null;
  isLoading: boolean;
  error: string | null;
  
  // 에디터 UI 상태 (Header와 공유)
  hasUnsavedChanges: boolean;
  isAutoSaveEnabled: boolean;
  autoSaveCountdown: number;
  lastSaveTime: Date | null;
  isSaving: boolean;
  
  // 에디터 핸들러 (Editor 컴포넌트에서 등록)
  editorHandlers: EditorHandlers | null;
  
  // 메타데이터 지연 저장
  pendingMetadataUpdate: Partial<DocumentMetadata> | null;
}

interface EditorActions {
  // 상태 업데이트
  setContent: (content: string) => void;
  setIsEditing: (editing: boolean) => void;
  setError: (error: string | null) => void;
  
  // 에디터 UI 상태 업데이트
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setIsAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveCountdown: (countdown: number) => void;
  setLastSaveTime: (time: Date | null) => void;
  setIsSaving: (saving: boolean) => void;
  
  // 에디터 핸들러 등록/해제
  setEditorHandlers: (handlers: EditorHandlers) => void;
  clearEditorHandlers: () => void;
  
  // 파일 로드
  loadFile: (path: string) => Promise<void>;
  
  // 파일 저장
  saveFile: (path: string, content: string) => Promise<void>;
  saveFileKeepEditing: (path: string, content: string) => Promise<void>;
  
  // 메타데이터
  refreshFileMetadata: (path: string) => Promise<void>;
  updateDocumentMetadata: (update: Partial<DocumentMetadata>) => Promise<void>;
  setLocalDocumentMetadata: (update: Partial<DocumentMetadata>) => void;
  flushPendingMetadata: () => Promise<void>;
  discardPendingMetadata: () => Promise<void>;
  
  // 리셋
  reset: () => void;
}

type EditorStore = EditorState & EditorActions;

const initialState: EditorState = {
  content: '',
  currentFilePath: null,
  isEditing: false,
  fileMetadata: {
    createdAt: null,
    modifiedAt: null,
    size: null,
  },
  documentMetadata: null,
  isLoading: false,
  error: null,
  
  // 에디터 UI 상태
  hasUnsavedChanges: false,
  isAutoSaveEnabled: false,
  autoSaveCountdown: 0,
  lastSaveTime: null,
  isSaving: false,
  
  // 에디터 핸들러
  editorHandlers: null,
  
  // 메타데이터 지연 저장
  pendingMetadataUpdate: null,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,

  setContent: (content) => set({ content }),
  
  setIsEditing: (editing) => set({ isEditing: editing }),
  
  setError: (error) => set({ error }),
  
  // 에디터 UI 상태 업데이트
  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
  setIsAutoSaveEnabled: (enabled) => set({ isAutoSaveEnabled: enabled }),
  setAutoSaveCountdown: (countdown) => set({ autoSaveCountdown: countdown }),
  setLastSaveTime: (time) => set({ lastSaveTime: time }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  
  // 에디터 핸들러 등록/해제
  setEditorHandlers: (handlers) => set({ editorHandlers: handlers }),
  clearEditorHandlers: () => set({ editorHandlers: null }),

  loadFile: async (path) => {
    const timer = new PerformanceTimer('파일 로드');
    set({ isLoading: true, error: null, currentFilePath: path });
    
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
        
        set({ content: fileData.content || '' });
        
        if (fileData.metadata) {
          set({
            fileMetadata: {
              createdAt: new Date(fileData.metadata.createdAt),
              modifiedAt: new Date(fileData.metadata.modifiedAt),
              size: fileData.metadata.size,
            },
            documentMetadata: fileData.metadata.document || null,
          });
        } else {
          set({ fileMetadata: initialState.fileMetadata, documentMetadata: null });
        }
        
        logger.info('파일 로드 성공', { path, hasMetadata: !!fileData.metadata });
      }, {
        operation: 'loadFile',
        component: 'WikiEditorStore',
        context: 'loadFile'
      });
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일 로드 중 오류', error);
      const errorMsg = error instanceof Error ? error.message : '파일 로드 실패';
      set({ error: errorMsg });
    } finally {
      set({ isLoading: false });
    }
  },

  saveFile: async (path, content) => {
    const timer = new PerformanceTimer('파일 저장');
    set({ isLoading: true, error: null });
    
    try {
      await safeAsync(async () => {
        const response = await fileApi.update(path, content);
        
        if (!response.success) {
          throw new Error(`파일 저장 실패: ${getErrorMessage(response)}`);
        }
        
        set({ content, isEditing: false });
        
        // 보류 메타데이터 플러시
        await get().flushPendingMetadata();
        
        // 메타데이터 새로고침
        await get().refreshFileMetadata(path);
        
        logger.info('파일 저장 성공', { path });
      }, {
        operation: 'saveFile',
        component: 'WikiEditorStore',
        context: 'saveFile'
      });
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일 저장 중 오류', error);
      const errorMsg = error instanceof Error ? error.message : '파일 저장 실패';
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  saveFileKeepEditing: async (path, content) => {
    const timer = new PerformanceTimer('임시 파일 저장');
    
    try {
      await safeAsync(async () => {
        const response = await fileApi.update(path, content);
        
        if (!response.success) {
          throw new Error(`파일 저장 실패: ${getErrorMessage(response)}`);
        }
        
        set({ content });
        // isEditing 유지
        
        // 보류 메타데이터 플러시
        await get().flushPendingMetadata();
        
        await get().refreshFileMetadata(path);
        
        logger.info('임시 저장 성공 (편집 모드 유지)', { path });
      }, {
        operation: 'saveFileKeepEditing',
        component: 'WikiEditorStore',
        context: 'saveFileKeepEditing'
      });
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('임시 저장 중 오류', error);
      throw error;
    }
  },

  refreshFileMetadata: async (path) => {
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
        set({
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

  discardPendingMetadata: async () => {
    const { currentFilePath, pendingMetadataUpdate } = get();
    if (!pendingMetadataUpdate) return;

    // 보류 중인 변경사항 폐기 → 서버에서 다시 읽기
    set({ pendingMetadataUpdate: null });
    if (currentFilePath) {
      await get().refreshFileMetadata(currentFilePath);
    }
    logger.info('보류 메타데이터 폐기', { path: currentFilePath });
  },

  setLocalDocumentMetadata: (update) => {
    const { documentMetadata, pendingMetadataUpdate } = get();
    // 1. 로컬 documentMetadata 즉시 업데이트
    if (documentMetadata) {
      set({ documentMetadata: { ...documentMetadata, ...update } });
    }
    // 2. pendingMetadataUpdate에 누적
    set({ pendingMetadataUpdate: { ...(pendingMetadataUpdate || {}), ...update } });
  },

  flushPendingMetadata: async () => {
    const { currentFilePath, pendingMetadataUpdate } = get();
    if (!pendingMetadataUpdate || !currentFilePath) return;

    try {
      const response = await fileApi.updateMetadata(currentFilePath, pendingMetadataUpdate);
      if (!response.success) {
        throw new Error(`메타데이터 플러시 실패: ${getErrorMessage(response)}`);
      }
      const merged = response.data as DocumentMetadata | undefined;
      if (merged) {
        set({ documentMetadata: merged });
      }
      set({ pendingMetadataUpdate: null });
      logger.info('보류 메타데이터 플러시 완료', { path: currentFilePath });
    } catch (error) {
      logger.error('메타데이터 플러시 실패', error);
      throw error;
    }
  },

  updateDocumentMetadata: async (update) => {
    const { currentFilePath, documentMetadata } = get();
    if (!currentFilePath) {
      logger.warn('메타데이터 업데이트 실패: 파일 경로 없음');
      return;
    }

    try {
      const response = await fileApi.updateMetadata(currentFilePath, update);

      if (!response.success) {
        throw new Error(`메타데이터 업데이트 실패: ${getErrorMessage(response)}`);
      }

      // 응답에서 머지된 메타데이터 반영
      const merged = response.data as DocumentMetadata | undefined;
      if (merged) {
        set({ documentMetadata: merged });
      } else {
        // fallback: 로컬 머지
        set({
          documentMetadata: documentMetadata
            ? { ...documentMetadata, ...update, updatedAt: new Date().toISOString() }
            : null,
        });
      }

      logger.info('문서 메타데이터 업데이트 성공', { path: currentFilePath });
    } catch (error) {
      logger.error('문서 메타데이터 업데이트 실패', error);
      throw error;
    }
  },

  reset: () => set(initialState),
}));
