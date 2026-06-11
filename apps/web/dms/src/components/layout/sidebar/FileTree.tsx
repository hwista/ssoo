'use client';

import type { MouseEvent } from 'react';
import { useMemo } from 'react';
import { ChevronRight, Folder, FolderOpen, FileText, File, FileCode, FileJson, ImageIcon, Bookmark } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { useAuthStore, useFileStore, useSidebarStore, useTabStore, useActiveEditorFilePath } from '@/stores';
import { useOpenDocumentTab } from '@/hooks';
import { filterFileTree, getFileNodeDisplayTitle } from '@/lib/utils/fileTree';
import type { FileNode } from '@/types';
import { SsooSidebarEmptyState, SsooSidebarTree } from '@ssoo/web-shell';

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
 * 노드 정렬 (폴더 먼저, 이름순)
 */
function sortNodes(nodes: readonly FileNode[]): FileNode[] {
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
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const {
    files,
    filesOwnerUserId,
    isLoading,
    isInitialized,
    error,
    addBookmark,
    removeBookmark,
    isBookmarked,
  } = useFileStore();
  const {
    expandedFolders,
    fileTreeOwnerUserId,
    fileTreeResetEpoch,
    searchOwnerUserId,
    searchQuery,
    toggleFolder,
  } = useSidebarStore();
  const activeTabId = useTabStore(state => state.activeTabId);
  const currentFilePath = useActiveEditorFilePath(activeTabId);
  const openDocumentTab = useOpenDocumentTab();
  const isCurrentFileTree = Boolean(currentUserId && filesOwnerUserId === currentUserId);
  const isScopedInitialized = isInitialized && isCurrentFileTree;
  const scopedSearchQuery = currentUserId && searchOwnerUserId === currentUserId ? searchQuery : '';
  const shouldShowLoading = isLoading || Boolean(currentUserId && !isScopedInitialized && !error);
  
  const displayTree = useMemo(() => {
    const sourceFiles = isCurrentFileTree ? files : [];
    const filtered = scopedSearchQuery ? filterFileTree(sourceFiles, scopedSearchQuery) : sourceFiles;
    return sortNodes(filtered);
  }, [files, isCurrentFileTree, scopedSearchQuery]);

  const isNodeExpanded = (node: FileNode) => Boolean(
    currentUserId
    && fileTreeOwnerUserId === currentUserId
    && expandedFolders.has(node.path)
  );

  const handleNodeSelect = async (node: FileNode) => {
    if (node.type === 'directory') {
      toggleFolder(node.path);
      return;
    }

    await openDocumentTab({
      path: node.path,
      title: getFileNodeDisplayTitle(node),
      activate: true,
    });
  };

  const handleBookmarkToggle = (event: MouseEvent<HTMLButtonElement>, node: FileNode) => {
    event.stopPropagation();

    const bookmarkId = `file-${node.path.replace(/\//g, '-')}`;

    if (isBookmarked(bookmarkId)) {
      removeBookmark(bookmarkId);
      return;
    }

    addBookmark({
      id: bookmarkId,
      title: getFileNodeDisplayTitle(node),
      path: `/doc/${encodeURIComponent(node.path)}`,
      icon: 'FileText',
    });
  };

  if (shouldShowLoading) {
    return (
      <div className="px-3 py-4 flex items-center justify-center">
        <LoadingSpinner message="파일을 불러오는 중..." className="text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-4 text-body-sm text-red-500 text-center">
        {error}
      </div>
    );
  }

  if (displayTree.length === 0) {
    return (
      <SsooSidebarEmptyState className="px-3 py-4 text-center text-sm">
        {scopedSearchQuery ? '검색 결과가 없습니다.' : '파일이 없습니다.'}
      </SsooSidebarEmptyState>
    );
  }

  return (
    <SsooSidebarTree<FileNode>
      key={`file-tree-${currentUserId ?? 'anonymous'}-${fileTreeResetEpoch}`}
      nodes={displayTree}
      getNodeId={(node) => node.path}
      getNodeLabel={(node) => getFileNodeDisplayTitle(node)}
      getNodeTitle={(node) => node.path}
      getNodeChildren={(node) => node.children ?? []}
      isNodeFolder={(node) => node.type === 'directory'}
      isNodeExpanded={isNodeExpanded}
      isNodeActive={(node) => node.type !== 'directory' && currentFilePath === node.path}
      renderNodeIcon={(node, state) => {
        const iconClass = `h-4 w-4 flex-shrink-0 ${state.active ? 'text-ssoo-primary' : 'text-gray-500'}`;

        if (state.folder) {
          return state.expanded ? <FolderOpen className={iconClass} /> : <Folder className={iconClass} />;
        }

        return getFileIcon(node.name, state.active);
      }}
      renderNodeTrailingAction={(node, state) => {
        if (state.folder) {
          return null;
        }

        const bookmarkId = `file-${node.path.replace(/\//g, '-')}`;
        const bookmarked = isBookmarked(bookmarkId);

        return (
          <button
            type="button"
            onClick={(event) => handleBookmarkToggle(event, node)}
            className={`flex h-control-h-sm w-control-h-sm items-center justify-center rounded opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 ${
              bookmarked ? 'opacity-100' : ''
            }`}
            aria-label={bookmarked ? '책갈피 해제' : '책갈피 추가'}
          >
            <Bookmark
              className={`h-3.5 w-3.5 ${
                bookmarked
                  ? 'fill-ssoo-primary text-ssoo-primary'
                  : 'text-gray-400'
              }`}
            />
          </button>
        );
      }}
      onNodeSelect={handleNodeSelect}
      sortChildren={sortNodes}
      disclosureIcon={ChevronRight}
    />
  );
}
