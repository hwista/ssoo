'use client';

import type { MouseEvent } from 'react';
import { useMemo } from 'react';
import { ChevronRight, Folder, FolderOpen, FileText, File, FileCode, FileJson, ImageIcon, Bookmark } from 'lucide-react';
import { useAuthStore, useFileStore, useSidebarStore, useTabStore, useActiveEditorFilePath } from '@/stores';
import { useOpenDocumentTab } from '@/hooks';
import { getFileNodeDisplayTitle } from '@/lib/utils/fileTree';
import type { FileNode } from '@/types';
import {
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarState,
  SsooSidebarTreeActionButton,
  SsooSidebarTreeNodeIcon,
  type SsooSidebarIcon,
} from '@ssoo/web-shell';

/**
 * 파일 확장자에 따른 아이콘 컴포넌트 반환
 */
function getFileIcon(name: string): SsooSidebarIcon {
  const extension = name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'md':
      return FileText;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return FileCode;
    case 'json':
      return FileJson;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return ImageIcon;
    default:
      return File;
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
    toggleFolder,
  } = useSidebarStore();
  const activeTabId = useTabStore(state => state.activeTabId);
  const currentFilePath = useActiveEditorFilePath(activeTabId);
  const openDocumentTab = useOpenDocumentTab();
  const isCurrentFileTree = Boolean(currentUserId && filesOwnerUserId === currentUserId);
  const isScopedInitialized = isInitialized && isCurrentFileTree;
  const shouldShowLoading = isLoading || Boolean(currentUserId && !isScopedInitialized && !error);
  
  const displayTree = useMemo(() => {
    const sourceFiles = isCurrentFileTree ? files : [];
    return sortNodes(sourceFiles);
  }, [files, isCurrentFileTree]);

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
      <SsooSidebarState variant="loading">
        파일을 불러오는 중...
      </SsooSidebarState>
    );
  }

  if (error) {
    return (
      <SsooSidebarState variant="error">
        {error}
      </SsooSidebarState>
    );
  }

  if (displayTree.length === 0) {
    return (
      <SsooSidebarEmptyState>
        파일이 없습니다.
      </SsooSidebarEmptyState>
    );
  }

  return (
    <SsooSidebarSearchableTree<FileNode>
      key={`file-tree-${currentUserId ?? 'anonymous'}-${fileTreeResetEpoch}`}
      nodes={displayTree}
      getNodeId={(node) => node.path}
      getNodeLabel={(node) => getFileNodeDisplayTitle(node)}
      getNodeTitle={(node) => node.path}
      getNodeChildren={(node) => node.children ?? []}
      getNodeSearchText={(node) => [getFileNodeDisplayTitle(node), node.name, node.path]}
      cloneNodeWithChildren={(node, children) => ({ ...node, children })}
      isNodeFolder={(node) => node.type === 'directory'}
      isNodeExpanded={isNodeExpanded}
      isNodeActive={(node) => node.type !== 'directory' && currentFilePath === node.path}
      renderNodeIcon={(node, state) => {
        if (state.folder) {
          return <SsooSidebarTreeNodeIcon icon={state.expanded ? FolderOpen : Folder} active={state.active} />;
        }

        return <SsooSidebarTreeNodeIcon icon={getFileIcon(node.name)} active={state.active} />;
      }}
      renderNodeTrailingAction={(node, state) => {
        if (state.folder) {
          return null;
        }

        const bookmarkId = `file-${node.path.replace(/\//g, '-')}`;
        const bookmarked = isBookmarked(bookmarkId);

        return (
          <SsooSidebarTreeActionButton
            label={bookmarked ? '책갈피 해제' : '책갈피 추가'}
            icon={Bookmark}
            active={bookmarked}
            tone="primary"
            onClick={(event) => handleBookmarkToggle(event, node)}
          />
        );
      }}
      onNodeSelect={handleNodeSelect}
      sortChildren={sortNodes}
      disclosureIcon={ChevronRight}
      emptyState={<SsooSidebarEmptyState>파일이 없습니다.</SsooSidebarEmptyState>}
    />
  );
}
