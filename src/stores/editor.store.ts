'use client';

import { create } from 'zustand';
import { fileApi, getErrorMessage } from '@/lib/utils/apiClient';
import { logger, safeAsync, PerformanceTimer } from '@/lib/utils/errorUtils';
import { useToast } from '@/lib/toast';

// 파일 메타데이터 타입
interface FileMetadata {
  createdAt: Date | null;
  modifiedAt: Date | null;
  size: number | null;
}

interface EditorState {
  // 상태
  content: string;
  currentFilePath: string | null;  // 현재 로드된 파일 경로
  isEditing: boolean;
  fileMetadata: FileMetadata;
  isLoading: boolean;
  error: string | null;
}

interface EditorActions {
  // 상태 업데이트
  setContent: (content: string) => void;
  setIsEditing: (editing: boolean) => void;
  setError: (error: string | null) => void;
  
  // 파일 로드
  loadFile: (path: string) => Promise<void>;
  
  // 파일 저장
  saveFile: (path: string, content: string) => Promise<void>;
  saveFileKeepEditing: (path: string, content: string) => Promise<void>;
  
  // 메타데이터
  refreshFileMetadata: (path: string) => Promise<void>;
  
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
  isLoading: false,
  error: null,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,

  setContent: (content) => set({ content }),
  
  setIsEditing: (editing) => set({ isEditing: editing }),
  
  setError: (error) => set({ error }),

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
          });
        } else {
          set({ fileMetadata: initialState.fileMetadata });
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
        });
      }
    } catch (error) {
      logger.warn('메타데이터 새로고침 실패', error);
    }
  },

  reset: () => set(initialState),
}));
