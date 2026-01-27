'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { FileNode } from '@/types';
import { useTreeData as useTreeDataHook } from '@/hooks/useTreeData';

// TreeData Context 타입 정의
interface TreeDataContextType {
  // 상태
  expandedFolders: Set<string>;
  selectedFile: string | null;
  filteredData: FileNode[];
  searchTerm: string;
  
  // 액션
  toggleFolder: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  selectFile: (path: string | null) => void;
  setSearchTerm: (term: string) => void;
  findNodeByPath: (path: string) => FileNode | null;
}

// Context 생성
const TreeDataContext = createContext<TreeDataContextType | null>(null);

// Hook
export const useTreeDataContext = (): TreeDataContextType => {
  const context = useContext(TreeDataContext);
  if (!context) {
    throw new Error('useTreeDataContext must be used within TreeDataProvider');
  }
  return context;
};

// Provider Props
interface TreeDataProviderProps {
  children: ReactNode;
  files: FileNode[];
  initialExpandedFolders?: Set<string>;
  initialSelectedFile?: string | null;
}

// Provider Component
export const TreeDataProvider: React.FC<TreeDataProviderProps> = ({
  children,
  files,
  initialExpandedFolders,
  initialSelectedFile
}) => {
  const treeData = useTreeDataHook(files, {
    initialExpandedFolders,
    initialSelectedFile
  });

  return (
    <TreeDataContext.Provider value={treeData}>
      {children}
    </TreeDataContext.Provider>
  );
};
