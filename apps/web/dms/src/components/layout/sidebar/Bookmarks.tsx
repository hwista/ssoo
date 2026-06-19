'use client';

import type { MouseEvent } from 'react';
import { useMemo } from 'react';
import { FileText, X } from 'lucide-react';
import { useAuthStore, useTabStore, useFileStore, useActiveEditorFilePath } from '@/stores';
import { useOpenDocumentTab, useOpenTabWithConfirm } from '@/hooks';
import { getFileNodeDisplayTitle } from '@/lib/utils/fileTree';
import { resolveDocPath } from '@/lib/utils/linkUtils';
import type { BookmarkItem } from '@/types';
import {
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarTreeActionButton,
} from '@ssoo/web-shell';

type ResolvedBookmarkItem = BookmarkItem & {
  documentPath: string | null;
};

/**
 * 사이드바 책갈피 목록
 * - 각 항목에 삭제 버튼 포함
 * - PMS 즐겨찾기와 동일한 기능
 */
export function Bookmarks() {
  const activeTabId = useTabStore((state) => state.activeTabId);
  const activeTabPath = useTabStore(
    (state) => state.tabs.find((tab) => tab.id === state.activeTabId)?.path ?? null,
  );
  const activeEditorFilePath = useActiveEditorFilePath(activeTabId);
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const { bookmarks, ownerUserId, fileMap, filesOwnerUserId, removeBookmark } = useFileStore();
  const scopedBookmarks = useMemo(
    () => (currentUserId && ownerUserId === currentUserId ? bookmarks : []),
    [bookmarks, currentUserId, ownerUserId],
  );
  const openDocumentTab = useOpenDocumentTab();
  const openTabWithConfirm = useOpenTabWithConfirm();
  const activeDocumentPath = activeEditorFilePath ?? (activeTabPath ? resolveDocPath(activeTabPath) : null);

  const resolvedBookmarks = useMemo<ResolvedBookmarkItem[]>(() => (
    scopedBookmarks.map((bookmark) => {
      const documentPath = resolveDocPath(bookmark.path);
      const baseBookmark = { ...bookmark, documentPath };

      if (!documentPath || !currentUserId || filesOwnerUserId !== currentUserId) {
        return baseBookmark;
      }

      const node = fileMap.get(documentPath);
      if (!node) {
        return baseBookmark;
      }

      const resolvedTitle = getFileNodeDisplayTitle(node);
      if (resolvedTitle === bookmark.title) {
        return baseBookmark;
      }

      return {
        ...bookmark,
        title: resolvedTitle,
        documentPath,
      };
    })
  ), [currentUserId, fileMap, filesOwnerUserId, scopedBookmarks]);

  if (resolvedBookmarks.length === 0) {
    return (
      <SsooSidebarEmptyState>
        책갈피가 없습니다.
      </SsooSidebarEmptyState>
    );
  }

  const handleClick = async (bookmark: ResolvedBookmarkItem) => {
    if (bookmark.documentPath) {
      await openDocumentTab({
        path: bookmark.documentPath,
        title: bookmark.title,
        activate: true,
      });
      return;
    }

    await openTabWithConfirm({
      id: bookmark.id,
      title: bookmark.title,
      path: bookmark.path,
      icon: bookmark.icon || 'FileText',
      closable: true,
      activate: true,
    });
  };

  const handleRemove = (e: MouseEvent<HTMLButtonElement>, bookmarkId: string) => {
    e.stopPropagation();
    removeBookmark(bookmarkId);
  };

  return (
    <SsooSidebarSearchableTree<ResolvedBookmarkItem>
      nodes={resolvedBookmarks}
      getNodeId={(bookmark) => bookmark.id}
      getNodeLabel={(bookmark) => bookmark.title}
      getNodeTitle={(bookmark) => bookmark.title}
      getNodeSearchText={(bookmark) => [bookmark.title, bookmark.path, bookmark.documentPath ?? '']}
      getNodeIcon={() => FileText}
      isNodeActive={(bookmark) => (
        bookmark.documentPath
          ? bookmark.documentPath === activeDocumentPath
          : bookmark.id === activeTabId
      )}
      renderNodeTrailingAction={(bookmark) => (
        <SsooSidebarTreeActionButton
          label="책갈피 해제"
          icon={X}
          onClick={(event) => handleRemove(event, bookmark.id)}
        />
      )}
      onNodeSelect={(bookmark) => {
        void handleClick(bookmark);
      }}
      emptyState={<SsooSidebarEmptyState>책갈피가 없습니다.</SsooSidebarEmptyState>}
    />
  );
}
