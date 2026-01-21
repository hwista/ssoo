'use client';
import { useState, useCallback } from 'react';
import { FileNode, FileType } from '@/types';
import { filesApi, fileApi, getErrorMessage } from '@/utils/apiClient';
import { logger, PerformanceTimer } from '@/utils/errorUtils';

export const useFileOperations = () => {
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState<FileType>('md');

  const fetchTree = useCallback(async () => {
    const timer = new PerformanceTimer('useFileOperations: 파일 트리 로드');
    
    try {
      logger.info('파일 트리 로드 시도');
      const response = await filesApi.getFileTree();
      
      if (response.success && response.data) {
        setTreeData(response.data as FileNode[]);
        logger.info('파일 트리 로드 성공', { nodeCount: (response.data as FileNode[]).length });
      } else {
        const errorMessage = getErrorMessage(response);
        logger.error('파일 트리 로드 실패', { error: errorMessage });
        throw new Error(`파일 트리 로드 실패: ${errorMessage}`);
      }
    } catch (error) {
      logger.error('파일 트리 로드 중 오류', error);
      throw error;
    } finally {
      timer.end();
    }
  }, []);

  const loadFile = useCallback(async (filePath: string) => {
    const timer = new PerformanceTimer('useFileOperations: 파일 로드');
    
    try {
      logger.info('파일 로드 시도', { filePath });
      const response = await fileApi.read(filePath);
      
      if (response.success && response.data) {
        setContent(response.data as string);
        setSelectedFile(filePath);
        setIsEditing(false);
        logger.info('파일 로드 성공', { filePath, contentLength: (response.data as string).length });
      } else {
        const errorMessage = getErrorMessage(response);
        logger.error('파일 로드 실패', { filePath, error: errorMessage });
        throw new Error(`파일 로드 실패: ${errorMessage}`);
      }
    } catch (error) {
      logger.error('파일 로드 중 오류', error, { filePath });
      throw error;
    } finally {
      timer.end({ filePath });
    }
  }, []);

  const saveFile = async () => {
    if (!selectedFile) {
      logger.warn('파일 저장 시도했으나 선택된 파일이 없음');
      return;
    }
    
    const timer = new PerformanceTimer('useFileOperations: 파일 저장');
    
    try {
      logger.info('파일 저장 시도', { selectedFile, contentLength: content.length });
      const response = await fileApi.update(selectedFile, content);
      
      if (response.success) {
        setIsEditing(false);
        logger.info('파일 저장 성공', { selectedFile });
      } else {
        const errorMessage = getErrorMessage(response);
        logger.error('파일 저장 실패', { selectedFile, error: errorMessage });
        throw new Error(`파일 저장 실패: ${errorMessage}`);
      }
    } catch (error) {
      logger.error('파일 저장 중 오류', error, { selectedFile });
      throw error;
    } finally {
      timer.end({ selectedFile });
    }
  };

  const createFile = async (fileName: string, parentPath?: string) => {
    const extension = selectedFileType === 'md' ? '.md' : 
                     selectedFileType === 'txt' ? '.txt' :
                     selectedFileType === 'json' ? '.json' :
                     selectedFileType === 'js' ? '.js' :
                     selectedFileType === 'ts' ? '.ts' :
                     selectedFileType === 'css' ? '.css' : '.md';
    
    const fullPath = parentPath ? `${parentPath}/${fileName}${extension}` : `${fileName}${extension}`;
    const defaultContent = selectedFileType === 'md' ? `# ${fileName}\n\n` :
                          selectedFileType === 'json' ? '{\n  \n}' :
                          selectedFileType === 'js' ? '// JavaScript 파일\n\n' :
                          selectedFileType === 'ts' ? '// TypeScript 파일\n\n' :
                          selectedFileType === 'css' ? '/* CSS 파일 */\n\n' : '';
    
    const timer = new PerformanceTimer('useFileOperations: 파일 생성');
    
    try {
      logger.info('파일 생성 시도', { fileName, fullPath, selectedFileType, parentPath });
      const response = await fileApi.create(fullPath, defaultContent);
      
      if (response.success) {
        fetchTree();
        logger.info('파일 생성 성공', { fileName, fullPath });
      } else {
        const errorMessage = getErrorMessage(response);
        logger.error('파일 생성 실패', { fileName, fullPath, error: errorMessage });
        alert(`파일 생성에 실패했습니다: ${errorMessage}`);
      }
    } catch (error) {
      logger.error('파일 생성 중 오류', error, { fileName, fullPath });
      alert('파일 생성 중 오류가 발생했습니다.');
    } finally {
      timer.end({ fileName, fullPath });
    }
  };

  const createFolder = async (folderName: string, parentPath?: string) => {
    const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    const timer = new PerformanceTimer('useFileOperations: 폴더 생성');
    
    try {
      logger.info('폴더 생성 시도', { folderName, fullPath, parentPath });
      const response = await fileApi.createFolder(fullPath);
      
      if (response.success) {
        fetchTree();
        logger.info('폴더 생성 성공', { folderName, fullPath });
      } else {
        const errorMessage = getErrorMessage(response);
        logger.error('폴더 생성 실패', { folderName, fullPath, error: errorMessage });
        alert(`폴더 생성에 실패했습니다: ${errorMessage}`);
      }
    } catch (error) {
      logger.error('폴더 생성 중 오류', error, { folderName, fullPath });
      alert('폴더 생성 중 오류가 발생했습니다.');
    } finally {
      timer.end({ folderName, fullPath });
    }
  };

  const deleteFileOrFolder = async (path: string) => {
    if (confirm(`정말로 "${path}"를 삭제하시겠습니까?`)) {
      const timer = new PerformanceTimer('useFileOperations: 파일/폴더 삭제');
      
      try {
        logger.info('파일/폴더 삭제 시도', { path });
        const response = await fileApi.delete(path);
        
        if (response.success) {
          fetchTree();
          // 삭제된 파일이 현재 선택된 파일이면 선택 해제
          if (selectedFile === path) {
            setSelectedFile(null);
            setContent('');
          }
          logger.info('파일/폴더 삭제 성공', { path });
        } else {
          const errorMessage = getErrorMessage(response);
          logger.error('파일/폴더 삭제 실패', { path, error: errorMessage });
          alert(`삭제에 실패했습니다: ${errorMessage}`);
        }
      } catch (error) {
        logger.error('파일/폴더 삭제 중 오류', error, { path });
        alert('삭제 중 오류가 발생했습니다.');
      } finally {
        timer.end({ path });
      }
    }
  };

  return {
    // State
    treeData,
    selectedFile,
    content,
    isEditing,
    selectedFileType,
    
    // Setters
    setContent,
    setIsEditing,
    setSelectedFileType,
    
    // Operations
    fetchTree,
    loadFile,
    saveFile,
    createFile,
    createFolder,
    deleteFileOrFolder
  };
};