'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WikiContextType, CreateFileParams, RenamingState, CreateModalState, ContextMenuState } from '@/types/wiki';
import { FileNode } from '@/types';
import { useFileSystem } from '@/hooks/services/useFileSystem';
import { useToast } from '@/lib/toast';
import { fileApi, getErrorMessage } from '@/lib/utils/apiClient';
import { logger, safeAsync, PerformanceTimer } from '@/lib/utils/errorUtils';

// Context 생성
const WikiContext = createContext<WikiContextType | null>(null);

// Context Hook
export const useWikiContext = (): WikiContextType => {
  const context = useContext(WikiContext);
  if (!context) {
    throw new Error('useWikiContext must be used within a WikiProvider');
  }
  return context;
};

// Provider Component
export const WikiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 서비스 레이어 및 기존 훅 사용
  const { files, refreshFileTree, loadFileTree } = useFileSystem();
  const { showSuccess, showError } = useToast();

  // 상태 정의
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [newlyCreatedItems, setNewlyCreatedItems] = useState<Set<string>>(new Set());
  const [updatedItems, setUpdatedItems] = useState<Set<string>>(new Set());
  const [renamingItem, setRenamingItem] = useState<RenamingState | null>(null);
  const [createModal, setCreateModal] = useState<CreateModalState>({
    isOpen: false,
    mode: 'file',
    initialPath: ''
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileMetadata, setFileMetadata] = useState<{
    createdAt: Date | null;
    modifiedAt: Date | null;
    size: number | null;
  }>({
    createdAt: null,
    modifiedAt: null,
    size: null
  });

  // 래핑된 함수들 먼저 정의
  const loadFileTreeWrapper = useCallback(async () => {
    const result = await loadFileTree();
    if (!result.success) {
      setError(typeof result.error === 'string' ? result.error : '파일 트리 로드 실패');
    }
  }, [loadFileTree]);

  const refreshFileTreeWrapper = useCallback(async () => {
    await refreshFileTree();
    
    // 리프레시 시 모든 업데이트 상태 제거 (VS Code 방식)
    setNewlyCreatedItems(new Set());
    setUpdatedItems(new Set());
  }, [refreshFileTree]);

  // 파일 로드 함수
  const loadFile = useCallback(async (path: string) => {
    const timer = new PerformanceTimer('파일 로드');
    setIsLoading(true);
    setError(null);
    
    try {
      await safeAsync(async () => {
        const response = await fileApi.read(path);
        
        if (!response.success) {
          throw new Error(`파일 읽기 실패: ${getErrorMessage(response)}`);
        }
        
        // API가 JSON을 반환하는지 확인하고 파싱
        let fileData;
        console.log('🔍 API 응답 타입:', typeof response.data, response.data);
        
        try {
          fileData = typeof response.data === 'string' 
            ? JSON.parse(response.data) 
            : response.data;
          console.log('✅ 파싱된 파일 데이터:', fileData);
        } catch (parseError) {
          // 기존 형식 (문자열만 반환)인 경우 호환성 유지
          console.log('⚠️ JSON 파싱 실패, 기존 형식으로 처리:', parseError);
          fileData = { content: response.data || '', metadata: null };
        }
        
        setContent(fileData.content || '');
        
        // 메타데이터 설정
        console.log('🔍 메타데이터 확인:', fileData.metadata);
        if (fileData.metadata) {
          const metadata = {
            createdAt: new Date(fileData.metadata.createdAt),
            modifiedAt: new Date(fileData.metadata.modifiedAt),
            size: fileData.metadata.size
          };
          console.log('✅ 메타데이터 설정:', metadata);
          setFileMetadata(metadata);
        } else {
          // 메타데이터가 없는 경우 초기화
          console.log('❌ 메타데이터 없음 - 초기화');
          setFileMetadata({
            createdAt: null,
            modifiedAt: null,
            size: null
          });
        }
        
        logger.info('파일 로드 성공', { path, hasMetadata: !!fileData.metadata });
      }, {
        operation: 'loadFile',
        component: 'WikiProvider',
        context: 'loadFile'
      });
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일 로드 중 오류', error);
      setError(error instanceof Error ? error.message : '파일 로드 실패');
      showError('파일 로드 실패', error instanceof Error ? error.message : '파일 로드 실패');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // 파일 메타데이터 새로고침 함수
  const refreshFileMetadata = useCallback(async (path: string) => {
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
        console.warn('메타데이터 파싱 실패');
        return;
      }
      
      if (metadataResponse.metadata) {
        const metadata = {
          createdAt: new Date(metadataResponse.metadata.createdAt),
          modifiedAt: new Date(metadataResponse.metadata.modifiedAt),
          size: metadataResponse.metadata.size
        };
        
        console.log('🔄 메타데이터 새로고침:', metadata);
        setFileMetadata(metadata);
      }
    } catch (error) {
      logger.warn('메타데이터 새로고침 실패', error);
    }
  }, []);

  // 파일 저장 함수 (편집 모드 종료)
  const saveFile = useCallback(async (path: string, fileContent: string) => {
    const timer = new PerformanceTimer('파일 저장');
    setIsLoading(true);
    setError(null);
    
    try {
      await safeAsync(async () => {
        const response = await fileApi.update(path, fileContent);
        
        if (!response.success) {
          throw new Error(`파일 저장 실패: ${getErrorMessage(response)}`);
        }
        
        setContent(fileContent);
        setIsEditing(false); // 편집 모드 종료
        
        // 업데이트된 항목으로 표시
        setUpdatedItems(prev => new Set([...prev, path]));
        
        // 파일 저장 후 메타데이터 새로고침
        await refreshFileMetadata(path);
        
        showSuccess('파일 저장', '파일이 저장되었습니다.');
        logger.info('파일 저장 성공', { path });
      }, {
        operation: 'saveFile',
        component: 'WikiProvider',
        context: 'saveFile'
      });
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일 저장 중 오류', error);
      setError(error instanceof Error ? error.message : '파일 저장 실패');
      showError('파일 저장 실패', error instanceof Error ? error.message : '파일 저장 실패');
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError, refreshFileMetadata]);

  // 임시 저장 함수 (편집 모드 유지)
  const saveFileKeepEditing = useCallback(async (path: string, fileContent: string) => {
    const timer = new PerformanceTimer('임시 파일 저장');
    
    try {
      await safeAsync(async () => {
        const response = await fileApi.update(path, fileContent);
        
        if (!response.success) {
          throw new Error(`파일 저장 실패: ${getErrorMessage(response)}`);
        }
        
        setContent(fileContent);
        // 편집 모드는 유지 - setIsEditing(false) 호출하지 않음
        
        // 업데이트된 항목으로 표시
        setUpdatedItems(prev => new Set([...prev, path]));
        
        // 파일 저장 후 메타데이터 새로고침
        await refreshFileMetadata(path);
        
        logger.info('임시 저장 성공 (편집 모드 유지)', { path });
      }, {
        operation: 'saveFileKeepEditing',
        component: 'WikiProvider',
        context: 'saveFileKeepEditing'
      });
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('임시 저장 중 오류', error);
      throw error; // 호출자가 에러를 처리할 수 있도록
    }
  }, [refreshFileMetadata]);

  // 초기 로딩 시 파일 트리 로드
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const result = await loadFileTree();
        if (!result.success) {
          setError(typeof result.error === 'string' ? result.error : '파일 트리 로드 실패');
        }
      } catch (error) {
        logger.error('앱 초기화 중 오류', error);
        setError(error instanceof Error ? error.message : '앱 초기화 실패');
      }
    };

    initializeApp();
  }, [loadFileTree]);

  // 파일 생성 함수
  const createFile = useCallback(async (params: CreateFileParams) => {
    const timer = new PerformanceTimer('파일/폴더 생성');
    setIsLoading(true);
    setError(null);
    
    try {
      if (params.type === 'file') {
        const fullPath = params.path 
          ? `${params.path}/${params.name}${params.extension ? `.${params.extension}` : '.md'}`
          : `${params.name}${params.extension ? `.${params.extension}` : '.md'}`;
        
        // 파일 중복 검사
        const checkDuplicateFile = (nodes: FileNode[]): boolean => {
          return nodes.some(node => {
            if (node.path === fullPath && node.type === 'file') return true;
            return node.children ? checkDuplicateFile(node.children) : false;
          });
        };
        
        if (checkDuplicateFile(files)) {
          throw new Error(`이미 같은 이름의 파일이 존재합니다: "${params.name}${params.extension ? `.${params.extension}` : '.md'}"`);
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
        
        // 새로 생성된 항목으로 표시
        setTimeout(() => {
          setNewlyCreatedItems(prev => new Set([...prev, fullPath]));
        }, 100);
        
        logger.info('파일 생성 성공', { fullPath });

      } else {
        const fullPath = params.path 
          ? `${params.path}/${params.name}`
          : params.name;
        
        // 폴더 중복 검사
        const checkDuplicateFolder = (nodes: FileNode[]): boolean => {
          return nodes.some(node => {
            if (node.path === fullPath && node.type === 'directory') return true;
            return node.children ? checkDuplicateFolder(node.children) : false;
          });
        };
        
        if (checkDuplicateFolder(files)) {
          throw new Error(`이미 같은 이름의 폴더가 존재합니다: "${params.name}"`);
        }
        
        const response = await fileApi.createFolder(fullPath);
        
        if (!response.success) {
          throw new Error(`폴더 생성 실패: ${getErrorMessage(response)}`);
        }

        await refreshFileTree();
        
        // 새로 생성된 항목으로 표시
        setTimeout(() => {
          setNewlyCreatedItems(prev => new Set([...prev, fullPath]));
        }, 100);
        
        logger.info('폴더 생성 성공', { fullPath });
      }
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일/폴더 생성 중 오류', error);
      setError(error instanceof Error ? error.message : '파일/폴더 생성 실패');
      throw error; // 모달에서 에러를 처리할 수 있도록 re-throw
    } finally {
      setIsLoading(false);
    }
  }, [files, refreshFileTree, loadFile]);

  // 파일 삭제 함수
  const deleteFile = useCallback(async (path: string) => {
    const timer = new PerformanceTimer('파일/폴더 삭제');
    setIsLoading(true);
    setError(null);
    
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
      setError(error instanceof Error ? error.message : '삭제 실패');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshFileTree]);

  // 파일 이름 변경 함수
  const renameFile = useCallback(async (oldPath: string, newPath: string) => {
    const timer = new PerformanceTimer('파일/폴더 이름 변경');
    setIsLoading(true);
    setError(null);
    
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
      setError(error instanceof Error ? error.message : '이름 변경 실패');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshFileTree]);

  // 항목 상태 관리 함수들
  const addNewlyCreatedItem = useCallback((path: string) => {
    setNewlyCreatedItems(prev => new Set([...prev, path]));
  }, []);

  const removeNewlyCreatedItem = useCallback((path: string) => {
    setNewlyCreatedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(path);
      return newSet;
    });
  }, []);

  const addUpdatedItem = useCallback((path: string) => {
    setUpdatedItems(prev => new Set([...prev, path]));
  }, []);

  const removeUpdatedItem = useCallback((path: string) => {
    setUpdatedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(path);
      return newSet;
    });
  }, []);

  // 알림 표시 함수
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (type === 'success') {
      showSuccess('알림', message);
    } else if (type === 'error') {
      showError('오류', message);
    } else {
      showSuccess('정보', message);
    }
  }, [showSuccess, showError]);

  // Context 값 구성
  const contextValue: WikiContextType = {
    // 상태
    files,
    content,
    isEditing,
    fileMetadata,
    sidebarWidth,
    newlyCreatedItems,
    updatedItems,
    renamingItem,
    createModal,
    contextMenu,
    isLoading,
    error,

    // 파일 시스템 액션
    loadFileTree: loadFileTreeWrapper,
    refreshFileTree: refreshFileTreeWrapper,
    loadFile,
    saveFile,
    saveFileKeepEditing,
    refreshFileMetadata,
    createFile,
    deleteFile,
    renameFile,

    // 상태 업데이트 액션
    setContent,
    setIsEditing,
    setSidebarWidth,

    // 항목 상태 관리
    addNewlyCreatedItem,
    removeNewlyCreatedItem,
    addUpdatedItem,
    removeUpdatedItem,

    // 모달 및 메뉴 액션
    setRenamingItem,
    setCreateModal,
    setContextMenu,

    // 에러 처리
    setError,
    showNotification,
  };

  return (
    <WikiContext.Provider value={contextValue}>
      {children}
    </WikiContext.Provider>
  );
};