'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { FileNode } from '@/types';
import { CreateFileParams } from '@/types/wiki';
import { useFileSystem } from '@/hooks/services/useFileSystem';
import { useToast } from '@/lib/toast';
import { fileApi, getErrorMessage } from '@/lib/utils/apiClient';
import { logger, safeAsync, PerformanceTimer } from '@/lib/utils/errorUtils';
import { useWikiEditorStore } from '@/stores/wiki-editor-store';
import { useWikiItemsStore } from '@/stores/wiki-items-store';

// 간소화된 Context 타입 - 파일시스템 CRUD만 담당
interface WikiContextType {
  // 파일 트리 상태
  files: FileNode[];
  
  // 파일시스템 액션
  loadFileTree: () => Promise<void>;
  refreshFileTree: () => Promise<void>;
  loadFile: (path: string) => Promise<void>;
  createFile: (params: CreateFileParams) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  
  // 알림
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const WikiContext = createContext<WikiContextType | null>(null);

export const useWikiContext = (): WikiContextType => {
  const context = useContext(WikiContext);
  if (!context) {
    throw new Error('useWikiContext must be used within a WikiProvider');
  }
  return context;
};

export const WikiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 서비스 레이어
  const { files, refreshFileTree, loadFileTree } = useFileSystem();
  const { showSuccess, showError } = useToast();
  
  // Store 액션
  const editorLoadFile = useWikiEditorStore((s) => s.loadFile);
  const { addNewlyCreatedItem, clearAll: clearItemStatus } = useWikiItemsStore();
  
  // 초기화 플래그
  const initializedRef = useRef(false);

  // 래핑된 함수들
  const loadFileTreeWrapper = useCallback(async () => {
    const result = await loadFileTree();
    if (!result.success) {
      showError('오류', '파일 트리 로드 실패');
    }
  }, [loadFileTree, showError]);

  const refreshFileTreeWrapper = useCallback(async () => {
    await refreshFileTree();
    clearItemStatus(); // 리프레시 시 항목 상태 초기화
  }, [refreshFileTree, clearItemStatus]);

  // 파일 로드 - Editor Store 위임
  const loadFile = useCallback(async (path: string) => {
    await editorLoadFile(path);
  }, [editorLoadFile]);

  // 초기 로딩
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    loadFileTree().catch((error) => {
      logger.error('앱 초기화 중 오류', error);
    });
  }, []);

  // 파일 생성
  const createFile = useCallback(async (params: CreateFileParams) => {
    const timer = new PerformanceTimer('파일/폴더 생성');
    
    try {
      if (params.type === 'file') {
        const fullPath = params.path 
          ? `${params.path}/${params.name}${params.extension ? `.${params.extension}` : '.md'}`
          : `${params.name}${params.extension ? `.${params.extension}` : '.md'}`;
        
        // 중복 검사
        const checkDuplicate = (nodes: FileNode[]): boolean => {
          return nodes.some(node => {
            if (node.path === fullPath && node.type === 'file') return true;
            return node.children ? checkDuplicate(node.children) : false;
          });
        };
        
        if (checkDuplicate(files)) {
          throw new Error(`이미 같은 이름의 파일이 존재합니다: "${params.name}"`);
        }
        
        const content = params.extension === 'md' ? `# ${params.name}\n\n` :
                       params.extension === 'json' ? '{\n  \n}' :
                       params.extension === 'js' ? '// JavaScript 파일\n\n' :
                       params.extension === 'ts' ? '// TypeScript 파일\n\n' :
                       params.extension === 'css' ? '/* CSS 파일 */\n\n' : '';
        
        const response = await fileApi.create(fullPath, content);
        if (!response.success) {
          throw new Error(`파일 생성 실패: ${getErrorMessage(response)}`);
        }

        await refreshFileTree();
        await loadFile(fullPath);
        
        setTimeout(() => addNewlyCreatedItem(fullPath), 100);
        logger.info('파일 생성 성공', { fullPath });

      } else {
        const fullPath = params.path 
          ? `${params.path}/${params.name}`
          : params.name;
        
        const checkDuplicate = (nodes: FileNode[]): boolean => {
          return nodes.some(node => {
            if (node.path === fullPath && node.type === 'directory') return true;
            return node.children ? checkDuplicate(node.children) : false;
          });
        };
        
        if (checkDuplicate(files)) {
          throw new Error(`이미 같은 이름의 폴더가 존재합니다: "${params.name}"`);
        }
        
        const response = await fileApi.createFolder(fullPath);
        if (!response.success) {
          throw new Error(`폴더 생성 실패: ${getErrorMessage(response)}`);
        }

        await refreshFileTree();
        setTimeout(() => addNewlyCreatedItem(fullPath), 100);
        logger.info('폴더 생성 성공', { fullPath });
      }
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일/폴더 생성 중 오류', error);
      throw error;
    }
  }, [files, refreshFileTree, loadFile, addNewlyCreatedItem]);

  // 파일 삭제
  const deleteFile = useCallback(async (path: string) => {
    const timer = new PerformanceTimer('파일/폴더 삭제');
    
    try {
      await safeAsync(async () => {
        const response = await fileApi.delete(path);
        if (!response.success) {
          throw new Error(`삭제 실패: ${getErrorMessage(response)}`);
        }
        await refreshFileTree();
        logger.info('파일/폴더 삭제 성공', { path });
      }, {
        operation: 'deleteFile',
        component: 'WikiProvider',
        context: 'deleteFile'
      });
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일/폴더 삭제 중 오류', error);
      throw error;
    }
  }, [refreshFileTree]);

  // 파일 이름 변경
  const renameFile = useCallback(async (oldPath: string, newPath: string) => {
    const timer = new PerformanceTimer('파일/폴더 이름 변경');
    
    try {
      await safeAsync(async () => {
        const response = await fileApi.rename(oldPath, newPath);
        if (!response.success) {
          throw new Error(`이름 변경 실패: ${getErrorMessage(response)}`);
        }
        await refreshFileTree();
        logger.info('파일/폴더 이름 변경 성공', { oldPath, newPath });
      }, {
        operation: 'renameFile',
        component: 'WikiProvider',
        context: 'renameFile'
      });
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일/폴더 이름 변경 중 오류', error);
      throw error;
    }
  }, [refreshFileTree]);

  // 알림
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (type === 'success') {
      showSuccess('알림', message);
    } else if (type === 'error') {
      showError('오류', message);
    } else {
      showSuccess('정보', message);
    }
  }, [showSuccess, showError]);

  const contextValue: WikiContextType = {
    files,
    loadFileTree: loadFileTreeWrapper,
    refreshFileTree: refreshFileTreeWrapper,
    loadFile,
    createFile,
    deleteFile,
    renameFile,
    showNotification,
  };

  return (
    <WikiContext.Provider value={contextValue}>
      {children}
    </WikiContext.Provider>
  );
};
