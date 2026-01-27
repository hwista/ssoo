/**
 * 파일 시스템 서비스를 위한 React Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { fileSystemService, type ServiceResult, type GetTreeOptions } from '@/services';
import type { FileNode } from '@/types';

export interface UseFileSystemState {
  // 데이터 상태
  files: FileNode[];
  currentFile: string | null;
  fileContent: string;
  
  // 로딩 상태
  isLoading: boolean;
  isLoadingTree: boolean;
  isLoadingFile: boolean;
  isSaving: boolean;
  
  // 에러 상태
  error: string | null;
  
  // 성공 상태
  lastOperation: {
    type: string;
    success: boolean;
    message?: string;
  } | null;
}

export interface UseFileSystemActions {
  // 파일 트리 관련
  loadFileTree: (options?: GetTreeOptions) => Promise<ServiceResult<FileNode[]>>;
  refreshFileTree: () => Promise<void>;
  
  // 파일 조작
  loadFile: (path: string) => Promise<ServiceResult<string>>;
  saveFile: (path: string, content: string) => Promise<ServiceResult<FileNode>>;
  createFile: (path: string, content: string, overwrite?: boolean) => Promise<ServiceResult<FileNode>>;
  deleteFile: (path: string, force?: boolean) => Promise<ServiceResult<void>>;
  renameFile: (oldPath: string, newPath: string) => Promise<ServiceResult<FileNode>>;
  
  // 폴더 조작
  createFolder: (path: string, recursive?: boolean) => Promise<ServiceResult<FileNode>>;
  
  // 검색
  searchFiles: (query: string, options?: { caseSensitive?: boolean; includeContent?: boolean }) => Promise<ServiceResult<FileNode[]>>;
  
  // 상태 관리
  setCurrentFile: (path: string | null) => void;
  setFileContent: (content: string) => void;
  clearError: () => void;
  clearLastOperation: () => void;
}

export function useFileSystem(): UseFileSystemState & UseFileSystemActions {
  // 상태 정의
  const [state, setState] = useState<UseFileSystemState>({
    files: [],
    currentFile: null,
    fileContent: '',
    isLoading: false,
    isLoadingTree: false,
    isLoadingFile: false,
    isSaving: false,
    error: null,
    lastOperation: null,
  });

  // 상태 업데이트 헬퍼
  const updateState = useCallback((updates: Partial<UseFileSystemState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 에러 처리 헬퍼
  const handleError = useCallback((operation: string, error: string) => {
    console.error(`[useFileSystem] ${operation} failed:`, error);
    updateState({
      error,
      lastOperation: { type: operation, success: false, message: error },
      isLoading: false,
      isLoadingTree: false,
      isLoadingFile: false,
      isSaving: false,
    });
  }, [updateState]);

  // 성공 처리 헬퍼
  const handleSuccess = useCallback((operation: string, message?: string) => {
    updateState({
      error: null,
      lastOperation: { type: operation, success: true, message },
      isLoading: false,
      isLoadingTree: false,
      isLoadingFile: false,
      isSaving: false,
    });
  }, [updateState]);

  // 파일 트리 로드
  const loadFileTree = useCallback(async (options?: GetTreeOptions): Promise<ServiceResult<FileNode[]>> => {
    updateState({ isLoadingTree: true, error: null });
    
    const result = await fileSystemService.getFileTree(undefined, options);
    
    if (result.success && result.data) {
      updateState({ files: result.data });
      handleSuccess('loadFileTree', 'File tree loaded successfully');
    } else {
      handleError('loadFileTree', result.error?.message || 'Failed to load file tree');
    }
    
    return result;
  }, [updateState, handleError, handleSuccess]);

  // 파일 트리 새로고침
  const refreshFileTree = useCallback(async (): Promise<void> => {
    await loadFileTree();
  }, [loadFileTree]);

  // 파일 내용 로드
  const loadFile = useCallback(async (path: string): Promise<ServiceResult<string>> => {
    updateState({ isLoadingFile: true, error: null });
    
    const result = await fileSystemService.readFile(path);
    
    if (result.success && result.data !== undefined) {
      updateState({ 
        fileContent: result.data,
        currentFile: path,
      });
      handleSuccess('loadFile', `File "${path}" loaded successfully`);
    } else {
      handleError('loadFile', result.error?.message || `Failed to load file "${path}"`);
    }
    
    return result;
  }, [updateState, handleError, handleSuccess]);

  // 파일 저장
  const saveFile = useCallback(async (path: string, content: string): Promise<ServiceResult<FileNode>> => {
    updateState({ isSaving: true, error: null });
    
    const result = await fileSystemService.updateFile(path, content);
    
    if (result.success && result.data) {
      updateState({ fileContent: content });
      handleSuccess('saveFile', `File "${path}" saved successfully`);
      // NOTE: 자동 새로고침 제거 - 필요시 수동으로 호출
      // await refreshFileTree();
    } else {
      handleError('saveFile', result.error?.message || `Failed to save file "${path}"`);
    }
    
    return result;
  }, [updateState, handleError, handleSuccess]); // refreshFileTree 의존성 제거

  // 파일 생성
  const createFile = useCallback(async (
    path: string, 
    content: string, 
    overwrite?: boolean
  ): Promise<ServiceResult<FileNode>> => {
    updateState({ isSaving: true, error: null });
    
    const result = await fileSystemService.createFile(path, content, { 
      overwrite, 
      createParentFolders: true 
    });
    
    if (result.success && result.data) {
      handleSuccess('createFile', `File "${path}" created successfully`);
      // NOTE: 자동 새로고침 제거 - 필요시 수동으로 호출
      // await refreshFileTree();
    } else {
      handleError('createFile', result.error?.message || `Failed to create file "${path}"`);
    }
    
    return result;
  }, [updateState, handleError, handleSuccess]); // refreshFileTree 의존성 제거

  // 파일 삭제
  const deleteFile = useCallback(async (path: string, force?: boolean): Promise<ServiceResult<void>> => {
    updateState({ isLoading: true, error: null });
    
    const result = await fileSystemService.deleteFile(path, { force });
    
    if (result.success) {
      // 현재 파일이 삭제된 파일이면 초기화
      if (state.currentFile === path) {
        updateState({ currentFile: null, fileContent: '' });
      }
      handleSuccess('deleteFile', `File "${path}" deleted successfully`);
      // NOTE: 자동 새로고침 제거 - 필요시 수동으로 호출
      // await refreshFileTree();
    } else {
      handleError('deleteFile', result.error?.message || `Failed to delete file "${path}"`);
    }

    return result;
  }, [state.currentFile, updateState, handleError, handleSuccess]); // refreshFileTree 의존성 제거  // 파일 이름 변경
  const renameFile = useCallback(async (
    oldPath: string, 
    newPath: string
  ): Promise<ServiceResult<FileNode>> => {
    updateState({ isLoading: true, error: null });
    
    const result = await fileSystemService.rename(oldPath, newPath);
    
    if (result.success && result.data) {
      // 현재 파일 경로 업데이트
      if (state.currentFile === oldPath) {
        updateState({ currentFile: newPath });
      }
      handleSuccess('renameFile', `File renamed from "${oldPath}" to "${newPath}"`);
      // NOTE: 자동 새로고침 제거 - 필요시 수동으로 호출
      // await refreshFileTree();
    } else {
      handleError('renameFile', result.error?.message || `Failed to rename file "${oldPath}"`);
    }
    
    return result;
  }, [state.currentFile, updateState, handleError, handleSuccess]); // refreshFileTree 의존성 제거

  // 폴더 생성
  const createFolder = useCallback(async (
    path: string, 
    recursive?: boolean
  ): Promise<ServiceResult<FileNode>> => {
    updateState({ isLoading: true, error: null });
    
    const result = await fileSystemService.createFolder(path, { recursive });
    
    if (result.success && result.data) {
      handleSuccess('createFolder', `Folder "${path}" created successfully`);
      // NOTE: 자동 새로고침 제거 - 필요시 수동으로 호출
      // await refreshFileTree();
    } else {
      handleError('createFolder', result.error?.message || `Failed to create folder "${path}"`);
    }
    
    return result;
  }, [updateState, handleError, handleSuccess]); // refreshFileTree 의존성 제거

  // 파일 검색
  const searchFiles = useCallback(async (
    query: string,
    options: { caseSensitive?: boolean; includeContent?: boolean } = {}
  ): Promise<ServiceResult<FileNode[]>> => {
    updateState({ isLoading: true, error: null });
    
    const result = await fileSystemService.searchFiles(query, options);
    
    if (result.success) {
      handleSuccess('searchFiles', `Search completed for "${query}"`);
    } else {
      handleError('searchFiles', result.error?.message || `Search failed for "${query}"`);
    }
    
    return result;
  }, [updateState, handleError, handleSuccess]);

  // 상태 관리 메서드들
  const setCurrentFile = useCallback((path: string | null) => {
    updateState({ currentFile: path });
  }, [updateState]);

  const setFileContent = useCallback((content: string) => {
    updateState({ fileContent: content });
  }, [updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const clearLastOperation = useCallback(() => {
    updateState({ lastOperation: null });
  }, [updateState]);

  // 초기 로드 (한 번만 실행하도록 수정)
  useEffect(() => {
    const initialLoad = async () => {
      await loadFileTree();
    };
    initialLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 컴포넌트 마운트시에만 실행

  return {
    // 상태
    ...state,
    
    // 액션
    loadFileTree,
    refreshFileTree,
    loadFile,
    saveFile,
    createFile,
    deleteFile,
    renameFile,
    createFolder,
    searchFiles,
    setCurrentFile,
    setFileContent,
    clearError,
    clearLastOperation,
  };
}