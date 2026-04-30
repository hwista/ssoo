'use client';

import { useMemo } from 'react';
import { ChevronRight, Folder, FolderOpen, FileText, File, FileCode, FileJson, ImageIcon, Bookmark } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { useFileStore, useSidebarStore, useTabStore, useActiveEditorFilePath } from '@/stores';
import { useOpenDocumentTab } from '@/hooks';
import { filterFileTree } from '@/lib/utils/fileTree';
import type { FileNode } from '@/types';

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
}

/**
 * 파일 확장자에 따른 아이콘 컴포넌트 반환
 */
function getFileIcon(name: string, isSelected: boolean) {
  const iconClass = `w-4 h-4 flex-shrink-0 ${isSelected ? 'text-ssoo-primary' : 'text-gray-500'}`;
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
      return <ImageIcon className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
}

/**
 * 파일 트리 노드 (PMS SidebarMenuTree 스타일)
 */
function FileTreeNode({ node, level }: FileTreeNodeProps) {
  const { expandedFolders, toggleFolder } = useSidebarStore();
  const activeTabId = useTabStore(state => state.activeTabId);
  const currentFilePath = useActiveEditorFilePath(activeTabId);
  const openDocumentTab = useOpenDocumentTab();
  const { addBookmark, removeBookmark, isBookmarked } = useFileStore();
  
  const isExpanded = expandedFolders.has(node.path);
  const isFolder = node.type === 'directory';
  const hasChildren = node.children && node.children.length > 0;
  
  // 선택 상태 확인 (currentFilePath 기반)
  const isSelected = currentFilePath === node.path;
  
  const iconClass = `w-4 h-4 flex-shrink-0 ${isSelected ? 'text-ssoo-primary' : 'text-gray-500'}`;

  const handleClick = async () => {
    if (isFolder) {
      toggleFolder(node.path);
    } else {
      // 사이드바와 검색이 동일한 정규화로 탭을 식별하도록 useOpenDocumentTab 통합 사용.
      // (이전엔 슬래시→'-' 와 encodeURIComponent 차이로 같은 문서가 두 탭에 중복으로 열림)
      await openDocumentTab({
        path: node.path,
        title: node.name,
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
        path: `/doc/${encodeURIComponent(node.path)}`,
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
        className={`flex h-control-h w-full cursor-pointer items-center gap-1 rounded-md px-2 text-body-sm transition-colors group ${
          isSelected 
            ? 'bg-ssoo-content-border text-label-md text-ssoo-primary' 
            : 'hover:bg-ssoo-sitemap-bg text-gray-700'
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {/* 폴더 확장/축소 아이콘 */}
        {isFolder && hasChildren ? (
          <ChevronRight
            className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${
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

        {/* 파일/폴더명 (문서명 우선, 없으면 파일명) */}
        <span className={`flex-1 truncate ${isSelected ? 'text-ssoo-primary' : 'text-gray-700'}`} title={node.path}>
          {node.title || node.name}
        </span>

        {/* 책갈피 버튼 (파일만) */}
        {!isFolder && (
          <button
            onClick={handleBookmarkToggle}
            className={`opacity-0 group-hover:opacity-100 h-control-h-sm w-control-h-sm flex items-center justify-center hover:bg-gray-200 rounded transition-opacity ${
              bookmarked ? 'opacity-100' : ''
            }`}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${
                bookmarked
                  ? 'fill-ssoo-primary text-ssoo-primary'
                  : 'text-gray-400'
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
/**
 * 사이드바 전체 파일 트리 (PMS MenuTree 스타일)
 */
export function FileTree() {
  const { files, isLoading, isInitialized } = useFileStore();
  const { searchQuery } = useSidebarStore();
  
  const displayTree = useMemo(() => {
    const filtered = searchQuery ? filterFileTree(files, searchQuery) : files;
    return sortNodes(filtered);
  }, [files, searchQuery]);

  if (isLoading && !isInitialized) {
    return (
      <div className="px-3 py-4 flex items-center justify-center">
        <LoadingSpinner message="파일을 불러오는 중..." className="text-gray-400" />
      </div>
    );
  }

  if (displayTree.length === 0) {
    return (
      <div className="px-3 py-4 text-body-sm text-gray-400 text-center">
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
