'use client';

import { useCallback } from 'react';
import { FileNode } from '@/types';
import { CreateFileParams } from '@/types/wiki';
import { fileApi, getErrorMessage } from '@/lib/utils/apiClient';
import { logger, safeAsync, PerformanceTimer } from '@/lib/utils/errorUtils';
import { useTreeStore } from '@/stores/tree-store';
import { useWikiEditorStore } from '@/stores/wiki-editor-store';
import { useWikiItemsStore } from '@/stores/wiki-items-store';

/**
 * 파일 시스템 CRUD 작업을 위한 훅
 * - 파일/폴더 생성, 삭제, 이름 변경
 * - tree-store와 연동하여 상태 자동 갱신
 */
export function useFileOperations() {
  const { files, refreshFileTree } = useTreeStore();
  const { loadFile } = useWikiEditorStore();
  const { addNewlyCreatedItem, clearAll: clearItemStatus } = useWikiItemsStore();

  // 파일/폴더 생성
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

  // 파일/폴더 삭제
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
        component: 'useFileOperations',
        context: 'deleteFile'
      });
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일/폴더 삭제 중 오류', error);
      throw error;
    }
  }, [refreshFileTree]);

  // 파일/폴더 이름 변경
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
        component: 'useFileOperations',
        context: 'renameFile'
      });
      
      timer.end({ success: true });
    } catch (error) {
      timer.end({ success: false });
      logger.error('파일/폴더 이름 변경 중 오류', error);
      throw error;
    }
  }, [refreshFileTree]);

  // 파일 트리 새로고침 (아이템 상태 초기화 포함)
  const refreshWithClear = useCallback(async () => {
    await refreshFileTree();
    clearItemStatus();
  }, [refreshFileTree, clearItemStatus]);

  return {
    createFile,
    deleteFile,
    renameFile,
    refreshFileTree: refreshWithClear,
  };
}
