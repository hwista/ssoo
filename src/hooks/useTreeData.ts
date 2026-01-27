/**
 * useTreeData - 트리 구조 데이터 관리를 위한 커스텀 훅
 * 
 * 기능:
 * - 트리 노드 확장/축소 상태 관리
 * - 검색 및 필터링
 * - 선택된 노드 추적
 * - 트리 네비게이션 유틸리티
 * 
 * 사용처: WikiSidebar, TreeComponent
 */

import { useState, useCallback, useMemo } from 'react';
import { FileNode } from '@/types';
import { logger } from '@/lib/utils/errorUtils';

export interface UseTreeDataOptions {
  initialExpandedFolders?: Set<string>;
  initialSelectedFile?: string | null;
  searchDebounceMs?: number;
}

export interface UseTreeDataReturn {
  // 상태
  expandedFolders: Set<string>;
  selectedFile: string | null;
  searchTerm: string;
  filteredData: FileNode[];
  
  // 노드 확장/축소
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // 선택 관리
  selectFile: (path: string | null) => void;
  
  // 검색
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
  
  // 트리 네비게이션
  getParentPath: (path: string) => string | null;
  getNodeDepth: (path: string) => number;
  isNodeExpanded: (path: string) => boolean;
  isNodeSelected: (path: string) => boolean;
  
  // 유틸리티
  findNodeByPath: (path: string, nodes?: FileNode[]) => FileNode | null;
  getAllPaths: (nodes?: FileNode[]) => string[];
  getExpandedPaths: () => string[];
}

/**
 * 트리 구조 데이터 관리를 위한 커스텀 훅
 */
export const useTreeData = (
  data: FileNode[],
  options: UseTreeDataOptions = {}
): UseTreeDataReturn => {
  const {
    initialExpandedFolders = new Set<string>(),
    initialSelectedFile = null
  } = options;

  // 상태
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(initialExpandedFolders);
  const [selectedFile, setSelectedFile] = useState<string | null>(initialSelectedFile);
  const [searchTerm, setSearchTerm] = useState('');

  // 폴더 토글
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
        logger.debug('폴더 축소', { path });
      } else {
        newSet.add(path);
        logger.debug('폴더 확장', { path });
      }
      return newSet;
    });
  }, []);

  // 폴더 확장
  const expandFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      if (!prev.has(path)) {
        const newSet = new Set(prev);
        newSet.add(path);
        logger.debug('폴더 확장', { path });
        return newSet;
      }
      return prev;
    });
  }, []);

  // 폴더 축소
  const collapseFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      if (prev.has(path)) {
        const newSet = new Set(prev);
        newSet.delete(path);
        logger.debug('폴더 축소', { path });
        return newSet;
      }
      return prev;
    });
  }, []);

  // 모든 폴더 확장
  const expandAll = useCallback(() => {
    const getAllFolderPaths = (nodes: FileNode[]): string[] => {
      const paths: string[] = [];
      for (const node of nodes) {
        if (node.type === 'directory') {
          paths.push(node.path);
          if (node.children) {
            paths.push(...getAllFolderPaths(node.children));
          }
        }
      }
      return paths;
    };

    const allFolderPaths = getAllFolderPaths(data);
    setExpandedFolders(new Set(allFolderPaths));
    logger.debug('모든 폴더 확장', { count: allFolderPaths.length });
  }, [data]);

  // 모든 폴더 축소
  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
    logger.debug('모든 폴더 축소');
  }, []);

  // 파일 선택
  const selectFile = useCallback((path: string | null) => {
    setSelectedFile(path);
    logger.debug('파일 선택', { path });
  }, []);

  // 검색어 클리어
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    logger.debug('검색어 클리어');
  }, []);

  // 부모 경로 추출
  const getParentPath = useCallback((path: string): string | null => {
    const lastSlashIndex = path.lastIndexOf('/');
    return lastSlashIndex > 0 ? path.substring(0, lastSlashIndex) : null;
  }, []);

  // 노드 깊이 계산
  const getNodeDepth = useCallback((path: string): number => {
    return path.split('/').length - 1;
  }, []);

  // 노드 확장 상태 확인
  const isNodeExpanded = useCallback((path: string): boolean => {
    return expandedFolders.has(path);
  }, [expandedFolders]);

  // 노드 선택 상태 확인
  const isNodeSelected = useCallback((path: string): boolean => {
    return selectedFile === path;
  }, [selectedFile]);

  // 경로로 노드 찾기
  const findNodeByPath = useCallback((targetPath: string, nodes: FileNode[] = data): FileNode | null => {
    for (const node of nodes) {
      if (node.path === targetPath) {
        return node;
      }
      if (node.children) {
        const found = findNodeByPath(targetPath, node.children);
        if (found) return found;
      }
    }
    return null;
  }, [data]);

  // 모든 경로 추출
  const getAllPaths = useCallback((nodes: FileNode[] = data): string[] => {
    const paths: string[] = [];
    const traverse = (nodeList: FileNode[]) => {
      for (const node of nodeList) {
        paths.push(node.path);
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(nodes);
    return paths;
  }, [data]);

  // 확장된 경로 목록
  const getExpandedPaths = useCallback((): string[] => {
    return Array.from(expandedFolders);
  }, [expandedFolders]);

  // 필터링된 데이터 계산 (검색 적용)
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {
      return data;
    }

    const searchLower = searchTerm.toLowerCase();
    
    const filterNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce((filtered: FileNode[], node) => {
        const nameMatches = node.name.toLowerCase().includes(searchLower);
        const pathMatches = node.path.toLowerCase().includes(searchLower);
        
        if (node.type === 'directory' && node.children) {
          // 폴더의 경우, 자식 노드도 검사
          const filteredChildren = filterNodes(node.children);
          
          if (nameMatches || pathMatches || filteredChildren.length > 0) {
            filtered.push({
              ...node,
              children: filteredChildren.length > 0 ? filteredChildren : node.children
            });
          }
        } else {
          // 파일의 경우, 이름이나 경로가 매치되면 포함
          if (nameMatches || pathMatches) {
            filtered.push(node);
          }
        }
        
        return filtered;
      }, []);
    };

    const result = filterNodes(data);
    logger.debug('검색 필터링 완료', { 
      searchTerm, 
      originalCount: data.length, 
      filteredCount: result.length 
    });
    
    return result;
  }, [data, searchTerm]);

  return {
    // 상태
    expandedFolders,
    selectedFile,
    searchTerm,
    filteredData,
    
    // 노드 확장/축소
    toggleFolder,
    expandFolder,
    collapseFolder,
    expandAll,
    collapseAll,
    
    // 선택 관리
    selectFile,
    
    // 검색
    setSearchTerm,
    clearSearch,
    
    // 트리 네비게이션
    getParentPath,
    getNodeDepth,
    isNodeExpanded,
    isNodeSelected,
    
    // 유틸리티
    findNodeByPath,
    getAllPaths,
    getExpandedPaths
  };
};