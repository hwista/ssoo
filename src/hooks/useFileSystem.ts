/**
 * useFileSystem - 파일 시스템 관련 로직을 관리하는 커스텀 훅
 * 
 * 기능:
 * - 파일 CRUD 작업 (생성, 읽기, 수정, 삭제)
 * - 파일 목록 관리 및 새로고침
 * - 에러 처리 및 알림
 * - 파일 상태 추적
 * 
 * 사용처: WikiSidebar, WikiEditor
 */

import { useState, useCallback, useRef } from 'react';
import { FileNode } from '@/types';
import { fileSystemService } from '@/server/services';
import { logger } from '@/lib/utils/errorUtils';

export interface UseFileSystemOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  autoRefresh?: boolean;
}

export interface UseFileSystemReturn {
  // 상태
  files: FileNode[];
  loading: boolean;
  error: string | null;
  
  // 파일 CRUD 작업
  createFile: (path: string, content?: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  updateFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  
  // 파일 목록 관리
  loadFiles: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  
  // 유틸리티
  findNodeByPath: (path: string) => FileNode | null;
  isFileExists: (path: string) => boolean;
  getFileExtension: (path: string) => string;
  
  // 상태 관리
  clearError: () => void;
  setFiles: (files: FileNode[]) => void;
}

/**
 * 파일 시스템 관련 로직을 관리하는 커스텀 훅
 */
export const useFileSystem = (options: UseFileSystemOptions = {}): UseFileSystemReturn => {
  const {
    onSuccess,
    onError,
    autoRefresh = true
  } = options;

  // 상태
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 로딩 상태 추적을 위한 ref
  const operationInProgress = useRef(false);

  // 에러 처리 헬퍼
  const handleError = useCallback((err: unknown, operation: string) => {
    const message = err instanceof Error ? err.message : `${operation} 중 오류가 발생했습니다.`;
    setError(message);
    onError?.(message);
    logger.error(`useFileSystem ${operation} 실패`, err);
  }, [onError]);

  // 성공 처리 헬퍼
  const handleSuccess = useCallback((message: string) => {
    setError(null);
    onSuccess?.(message);
    logger.info(`useFileSystem: ${message}`);
  }, [onSuccess]);

  // 파일 목록 로드
  const loadFiles = useCallback(async () => {
    if (operationInProgress.current) return;
    
    try {
      operationInProgress.current = true;
      setLoading(true);
      setError(null);
      
      const result = await fileSystemService.getFileTree();
      if (result.success && result.data) {
        setFiles(result.data);
        logger.debug('파일 목록 로드 완료', { count: result.data.length });
      } else {
        throw new Error(result.error?.message || '파일 목록 로드 실패');
      }
    } catch (err) {
      handleError(err, '파일 목록 로드');
    } finally {
      setLoading(false);
      operationInProgress.current = false;
    }
  }, [handleError]);

  // 파일 목록 새로고침
  const refreshFiles = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  // 파일 생성
  const createFile = useCallback(async (path: string, content: string = '') => {
    try {
      setError(null);
      const result = await fileSystemService.createFile(path, content);
      if (result.success) {
        handleSuccess(`파일 "${path}"이 생성되었습니다.`);
      } else {
        throw new Error(result.error?.message || '파일 생성 실패');
      }
      
      if (autoRefresh) {
        await refreshFiles();
      }
    } catch (err) {
      handleError(err, '파일 생성');
      throw err; // 호출자에게 에러 전파
    }
  }, [handleSuccess, handleError, autoRefresh, refreshFiles]);

  // 폴더 생성
  const createFolder = useCallback(async (path: string) => {
    try {
      setError(null);
      const result = await fileSystemService.createFolder(path);
      if (result.success) {
        handleSuccess(`폴더 "${path}"이 생성되었습니다.`);
      } else {
        throw new Error(result.error?.message || '폴더 생성 실패');
      }
      
      if (autoRefresh) {
        await refreshFiles();
      }
    } catch (err) {
      handleError(err, '폴더 생성');
      throw err;
    }
  }, [handleSuccess, handleError, autoRefresh, refreshFiles]);

  // 파일 읽기
  const readFile = useCallback(async (path: string): Promise<string> => {
    try {
      setError(null);
      const result = await fileSystemService.readFile(path);
      if (result.success && result.data !== undefined) {
        logger.debug('파일 읽기 완료', { path, contentLength: result.data.length });
        return result.data;
      } else {
        throw new Error(result.error?.message || '파일 읽기 실패');
      }
    } catch (err) {
      handleError(err, '파일 읽기');
      throw err;
    }
  }, [handleError]);

  // 파일 수정
  const updateFile = useCallback(async (path: string, content: string) => {
    try {
      setError(null);
      const result = await fileSystemService.updateFile(path, content);
      if (result.success) {
        handleSuccess(`파일 "${path}"이 저장되었습니다.`);
      } else {
        throw new Error(result.error?.message || '파일 저장 실패');
      }
      
      if (autoRefresh) {
        await refreshFiles();
      }
    } catch (err) {
      handleError(err, '파일 저장');
      throw err;
    }
  }, [handleSuccess, handleError, autoRefresh, refreshFiles]);

  // 파일/폴더 삭제
  const deleteFile = useCallback(async (path: string) => {
    try {
      setError(null);
      const result = await fileSystemService.deleteFile(path);
      if (result.success) {
        handleSuccess(`"${path}"이 삭제되었습니다.`);
      } else {
        throw new Error(result.error?.message || '삭제 실패');
      }
      
      if (autoRefresh) {
        await refreshFiles();
      }
    } catch (err) {
      handleError(err, '삭제');
      throw err;
    }
  }, [handleSuccess, handleError, autoRefresh, refreshFiles]);

  // 파일/폴더 이름 변경
  const renameFile = useCallback(async (oldPath: string, newPath: string) => {
    try {
      setError(null);
      const result = await fileSystemService.rename(oldPath, newPath);
      if (result.success) {
        handleSuccess(`"${oldPath}"이 "${newPath}"로 이름이 변경되었습니다.`);
      } else {
        throw new Error(result.error?.message || '이름 변경 실패');
      }
      
      if (autoRefresh) {
        await refreshFiles();
      }
    } catch (err) {
      handleError(err, '이름 변경');
      throw err;
    }
  }, [handleSuccess, handleError, autoRefresh, refreshFiles]);

  // 경로로 노드 찾기
  const findNodeByPath = useCallback((targetPath: string): FileNode | null => {
    const findNode = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === targetPath) {
          return node;
        }
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findNode(files);
  }, [files]);

  // 파일 존재 여부 확인
  const isFileExists = useCallback((path: string): boolean => {
    return findNodeByPath(path) !== null;
  }, [findNodeByPath]);

  // 파일 확장자 추출
  const getFileExtension = useCallback((path: string): string => {
    const lastDotIndex = path.lastIndexOf('.');
    return lastDotIndex !== -1 ? path.slice(lastDotIndex + 1).toLowerCase() : '';
  }, []);

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // 상태
    files,
    loading,
    error,
    
    // 파일 CRUD 작업
    createFile,
    createFolder,
    readFile,
    updateFile,
    deleteFile,
    renameFile,
    
    // 파일 목록 관리
    loadFiles,
    refreshFiles,
    
    // 유틸리티
    findNodeByPath,
    isFileExists,
    getFileExtension,
    
    // 상태 관리
    clearError,
    setFiles
  };
};