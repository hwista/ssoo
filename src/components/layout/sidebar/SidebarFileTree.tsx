'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import TreeComponent from '@/components/TreeComponent';
import { useTreeStore, useLayoutStore, useTabStore } from '@/stores';
import type { FileNode } from '@/types';

interface SidebarFileTreeProps {
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * 사이드바 파일 트리
 * - 기존 TreeComponent 활용
 * - 검색 필터 적용
 * - 파일 선택 시 탭으로 열기
 */
export function SidebarFileTree({ isExpanded, onToggle }: SidebarFileTreeProps) {
  const { files, selectedFile, selectFile } = useTreeStore();
  const { searchQuery } = useLayoutStore();
  const { openTab } = useTabStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // 검색 필터 적용
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;

    const query = searchQuery.toLowerCase();

    const filterTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce<FileNode[]>((acc, node) => {
        const nameMatch = node.name.toLowerCase().includes(query);
        
        if (node.type === 'directory') {
          const filteredChildren = filterTree(node.children || []);
          if (nameMatch || filteredChildren.length > 0) {
            acc.push({
              ...node,
              children: filteredChildren,
            });
          }
        } else if (nameMatch) {
          acc.push(node);
        }
        
        return acc;
      }, []);
    };

    return filterTree(files);
  }, [files, searchQuery]);

  // 파일 선택 핸들러 - 탭으로 열기
  const handleFileSelect = useCallback((path: string) => {
    selectFile(path);

    // 파일명 추출
    const fileName = path.split('/').pop() || path;

    // 탭으로 열기
    openTab({
      id: `file-${path.replace(/\//g, '-')}`,
      title: fileName,
      path: `/wiki/${encodeURIComponent(path)}`,
      icon: 'FileText',
      closable: true,
      activate: true,
    });
  }, [selectFile, openTab]);

  // 폴더 토글
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return (
    <div>
      {/* 섹션 헤더 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span>파일 탐색기</span>
      </button>

      {/* 파일 트리 */}
      {isExpanded && (
        <div className="px-1 pb-4">
          {filteredFiles.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">
              {searchQuery ? '검색 결과가 없습니다' : '파일이 없습니다'}
            </div>
          ) : (
            <TreeComponent
              treeData={filteredFiles}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              showSearch={false}
              showExpandCollapseButtons={false}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              enableContextMenu={false}
              className="px-2 pt-0.5"
            />
          )}
        </div>
      )}
    </div>
  );
}
