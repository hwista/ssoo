'use client';

import { create } from 'zustand';
import { FileNode } from '@/types';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';
import { fileSystemService } from '@/server/services';

interface TreeState {
  // 데이터
  files: FileNode[];
  
  // 상태
  expandedFolders: Set<string>;
  selectedFile: string | null;
  searchTerm: string;
  
  // 로딩 상태
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface TreeActions {
  // 파일 트리 로드
  loadFileTree: () => Promise<{ success: boolean; error?: string }>;
  refreshFileTree: () => Promise<void>;
  
  // 데이터 설정
  setFiles: (files: FileNode[]) => void;
  
  // 폴더 확장/축소
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // 파일 선택
  selectFile: (path: string | null) => void;
  
  // 검색
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
  
  // 유틸리티
  findNodeByPath: (path: string) => FileNode | null;
  getFilteredData: () => FileNode[];
}

type TreeStore = TreeState & TreeActions;

// 검색 필터링 헬퍼
function filterNodes(nodes: FileNode[], term: string): FileNode[] {
  if (!term.trim()) return nodes;
  
  const lowerTerm = term.toLowerCase();
  
  const filterRecursive = (nodeList: FileNode[]): FileNode[] => {
    return nodeList.reduce<FileNode[]>((acc, node) => {
      const nameMatches = node.name.toLowerCase().includes(lowerTerm);
      
      if (node.children) {
        const filteredChildren = filterRecursive(node.children);
        if (nameMatches || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children
          });
        }
      } else if (nameMatches) {
        acc.push(node);
      }
      
      return acc;
    }, []);
  };
  
  return filterRecursive(nodes);
}

// 모든 폴더 경로 추출
function getAllFolderPaths(nodes: FileNode[]): string[] {
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
}

// 경로로 노드 찾기
function findNode(path: string, nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node;
    }
    if (node.children) {
      const found = findNode(path, node.children);
      if (found) return found;
    }
  }
  return null;
}

export const useTreeStore = create<TreeStore>((set, get) => ({
  // 초기 상태
  files: [],
  expandedFolders: new Set<string>(),
  selectedFile: null,
  searchTerm: '',
  isLoading: false,
  isInitialized: false,
  error: null,

  // 파일 트리 로드
  loadFileTree: async () => {
    // 이미 초기화됨 - 중복 방지
    if (get().isInitialized) {
      logger.debug('파일 트리 이미 로드됨, 건너뜀');
      return { success: true };
    }
    
    const timer = new PerformanceTimer('파일 트리 로드');
    set({ isLoading: true, error: null });
    
    try {
      const result = await fileSystemService.getFileTree(undefined, { includeHidden: false });
      
      if (result.success && result.data) {
        set({ 
          files: result.data, 
          isLoading: false, 
          isInitialized: true,
          error: null 
        });
        logger.info('파일 트리 로드 성공', { fileCount: result.data.length });
        timer.end({ success: true });
        return { success: true };
      } else {
        const errorMsg = result.error || '파일 트리 로드 실패';
        set({ isLoading: false, error: typeof errorMsg === 'string' ? errorMsg : '파일 트리 로드 실패' });
        timer.end({ success: false });
        return { success: false, error: typeof errorMsg === 'string' ? errorMsg : '파일 트리 로드 실패' };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '파일 트리 로드 실패';
      logger.error('파일 트리 로드 중 오류', error);
      set({ isLoading: false, error: errorMsg });
      timer.end({ success: false });
      return { success: false, error: errorMsg };
    }
  },

  // 파일 트리 새로고침
  refreshFileTree: async () => {
    const timer = new PerformanceTimer('파일 트리 새로고침');
    set({ isLoading: true, error: null });
    
    try {
      const result = await fileSystemService.getFileTree(undefined, { includeHidden: false });
      
      if (result.success && result.data) {
        set({ files: result.data, isLoading: false, error: null });
        logger.info('파일 트리 새로고침 성공', { fileCount: result.data.length });
        timer.end({ success: true });
      } else {
        const errorMsg = result.error || '파일 트리 새로고침 실패';
        set({ isLoading: false, error: typeof errorMsg === 'string' ? errorMsg : '파일 트리 새로고침 실패' });
        logger.error('파일 트리 새로고침 실패', { error: errorMsg });
        timer.end({ success: false });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '파일 트리 새로고침 실패';
      logger.error('파일 트리 새로고침 중 오류', error);
      set({ isLoading: false, error: errorMsg });
      timer.end({ success: false });
    }
  },

  // 데이터 설정
  setFiles: (files) => set({ files }),

  // 폴더 토글
  toggleFolder: (path) => set((state) => {
    const newSet = new Set(state.expandedFolders);
    if (newSet.has(path)) {
      newSet.delete(path);
      logger.debug('폴더 축소', { path });
    } else {
      newSet.add(path);
      logger.debug('폴더 확장', { path });
    }
    return { expandedFolders: newSet };
  }),

  // 폴더 확장
  expandFolder: (path) => set((state) => {
    if (!state.expandedFolders.has(path)) {
      const newSet = new Set(state.expandedFolders);
      newSet.add(path);
      logger.debug('폴더 확장', { path });
      return { expandedFolders: newSet };
    }
    return state;
  }),

  // 폴더 축소
  collapseFolder: (path) => set((state) => {
    if (state.expandedFolders.has(path)) {
      const newSet = new Set(state.expandedFolders);
      newSet.delete(path);
      logger.debug('폴더 축소', { path });
      return { expandedFolders: newSet };
    }
    return state;
  }),

  // 모든 폴더 확장
  expandAll: () => set((state) => {
    const allFolderPaths = getAllFolderPaths(state.files);
    logger.debug('모든 폴더 확장', { count: allFolderPaths.length });
    return { expandedFolders: new Set(allFolderPaths) };
  }),

  // 모든 폴더 축소
  collapseAll: () => {
    logger.debug('모든 폴더 축소');
    set({ expandedFolders: new Set() });
  },

  // 파일 선택
  selectFile: (path) => {
    logger.debug('파일 선택', { path });
    set({ selectedFile: path });
  },

  // 검색어 설정
  setSearchTerm: (term) => set({ searchTerm: term }),

  // 검색어 클리어
  clearSearch: () => set({ searchTerm: '' }),

  // 유틸리티: 경로로 노드 찾기
  findNodeByPath: (path) => {
    const { files } = get();
    return findNode(path, files);
  },

  // 유틸리티: 필터된 데이터 반환
  getFilteredData: () => {
    const { files, searchTerm } = get();
    return filterNodes(files, searchTerm);
  },
}));
