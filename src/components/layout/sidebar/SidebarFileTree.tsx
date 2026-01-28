'use client';

import { useMemo } from 'react';
import { ChevronRight, Folder, FolderOpen, FileText, File, FileCode, FileJson, Image, Bookmark } from 'lucide-react';
import { useTreeStore, useLayoutStore, useTabStore } from '@/stores';
import type { FileNode } from '@/types';

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
}

/**
 * 파일 확장자에 따른 아이콘 컴포넌트 반환
 */
function getFileIcon(name: string, isSelected: boolean) {
  const iconClass = `w-4 h-4 flex-shrink-0 ${isSelected ? 'text-ssoo-primary' : 'text-muted-foreground'}`;
  const extension = name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'md':
      return <FileText className={iconClass} />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return <FileCode className={iconClass} />;
    case 'json':
      return <FileJson className={iconClass} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <Image className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
}

/**
 * 파일 트리 노드 (PMS SidebarMenuTree 스타일)
 */
function FileTreeNode({ node, level }: FileTreeNodeProps) {
  const { expandedFolders, toggleFolder } = useLayoutStore();
  const { selectedFile, selectFile } = useTreeStore();
  const { openTab, addBookmark, removeBookmark, isBookmarked } = useTabStore();
  
  const isExpanded = expandedFolders.has(node.path);
  const isFolder = node.type === 'directory';
  const hasChildren = node.children && node.children.length > 0;
  
  // 선택 상태 확인
  const isSelected = selectedFile === node.path;
  
  const iconClass = `w-4 h-4 flex-shrink-0 ${isSelected ? 'text-ssoo-primary' : 'text-muted-foreground'}`;

  const handleClick = () => {
    if (isFolder) {
      toggleFolder(node.path);
    } else {
      selectFile(node.path);
      
      // 탭으로 열기
      openTab({
        id: `file-${node.path.replace(/\//g, '-')}`,
        title: node.name,
        path: `/wiki/${encodeURIComponent(node.path)}`,
        icon: 'FileText',
        closable: true,
        activate: true,
      });
    }
  };

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const bookmarkId = `file-${node.path.replace(/\//g, '-')}`;
    
    if (isBookmarked(bookmarkId)) {
      removeBookmark(bookmarkId);
    } else {
      addBookmark({
        id: bookmarkId,
        title: node.name,
        path: `/wiki/${encodeURIComponent(node.path)}`,
        icon: 'FileText',
      });
    }
  };

  const bookmarkId = `file-${node.path.replace(/\//g, '-')}`;
  const bookmarked = isBookmarked(bookmarkId);

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center gap-1 w-full h-control-h px-2 text-sm rounded-md transition-colors cursor-pointer group ${
          isSelected 
            ? 'bg-ssoo-content-border text-ssoo-primary font-medium' 
            : 'hover:bg-ssoo-sitemap-bg text-foreground'
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {/* 폴더 확장/축소 아이콘 */}
        {isFolder && hasChildren ? (
          <ChevronRight
            className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}

        {/* 파일/폴더 아이콘 */}
        {isFolder ? (
          isExpanded ? <FolderOpen className={iconClass} /> : <Folder className={iconClass} />
        ) : (
          getFileIcon(node.name, isSelected)
        )}

        {/* 파일/폴더명 */}
        <span className={`flex-1 truncate ${isSelected ? 'text-ssoo-primary' : 'text-foreground'}`}>
          {node.name}
        </span>

        {/* 책갈피 버튼 (파일만) */}
        {!isFolder && (
          <button
            onClick={handleBookmarkToggle}
            className={`opacity-0 group-hover:opacity-100 p-0.5 hover:bg-ssoo-sitemap-bg rounded transition-opacity ${
              bookmarked ? 'opacity-100' : ''
            }`}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${
                bookmarked
                  ? 'fill-ssoo-primary text-ssoo-primary'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        )}
      </div>

      {/* 자식 노드 */}
      {isFolder && hasChildren && isExpanded && (
        <div>
          {sortNodes(node.children!).map((child) => (
            <FileTreeNode key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 노드 정렬 (폴더 먼저, 이름순)
 */
function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

/**
 * 검색 필터링
 */
function filterTree(nodes: FileNode[], query: string): FileNode[] {
  if (!query.trim()) return nodes;
  
  const lowerQuery = query.toLowerCase();
  
  return nodes.reduce<FileNode[]>((acc, node) => {
    const matchesName = node.name.toLowerCase().includes(lowerQuery);
    const filteredChildren = node.children ? filterTree(node.children, query) : [];
    
    if (matchesName || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      });
    }
    
    return acc;
  }, []);
}

/**
 * 사이드바 전체 파일 트리 (PMS SidebarMenuTree 스타일)
 */
export function SidebarFileTree() {
  const { files } = useTreeStore();
  const { searchQuery } = useLayoutStore();
  
  const displayTree = useMemo(() => {
    const filtered = searchQuery ? filterTree(files, searchQuery) : files;
    return sortNodes(filtered);
  }, [files, searchQuery]);

  if (displayTree.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
        {searchQuery ? '검색 결과가 없습니다.' : '파일이 없습니다.'}
      </div>
    );
  }

  return (
    <div className="py-1">
      {displayTree.map((node) => (
        <FileTreeNode key={node.path} node={node} level={0} />
      ))}
    </div>
  );
}
