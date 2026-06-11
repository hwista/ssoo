'use client';

import { useMemo } from 'react';
import { FileText, X } from 'lucide-react';
import { useAuthStore, useTabStore, useFileStore, useActiveEditorFilePath } from '@/stores';
import { useOpenDocumentTab, useOpenTabWithConfirm } from '@/hooks';
import { getFileNodeDisplayTitle } from '@/lib/utils/fileTree';
import { resolveDocPath } from '@/lib/utils/linkUtils';
import type { BookmarkItem } from '@/types';
import { SsooSidebarEmptyState, SsooSidebarList, SsooSidebarListItem } from '@ssoo/web-shell';

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

  const handleRemove = (e: React.MouseEvent, bookmarkId: string) => {
    e.stopPropagation();
    removeBookmark(bookmarkId);
  };

  return (
    <SsooSidebarList>
      {resolvedBookmarks.map((bookmark) => {
        const isActive = bookmark.documentPath
          ? bookmark.documentPath === activeDocumentPath
          : bookmark.id === activeTabId;

        return (
          <SsooSidebarListItem
            key={bookmark.id}
            icon={FileText}
            label={bookmark.title}
            title={bookmark.title}
            active={isActive}
            onSelect={() => {
              void handleClick(bookmark);
            }}
            trailingAction={
              <button
                type="button"
                onClick={(e) => handleRemove(e, bookmark.id)}
                className="h-control-h-sm w-control-h-sm flex-shrink-0 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 rounded flex items-center justify-center"
                title="책갈피 해제"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            }
          />
        );
      })}
    </SsooSidebarList>
  );
}
