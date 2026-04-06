'use client';

import { FileText, X } from 'lucide-react';
import { useTabStore, useFileStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { FlatList, FlatListItem } from './FlatList';

/**
 * 사이드바 책갈피 목록
 * - 각 항목에 삭제 버튼 포함
 * - PMS 즐겨찾기와 동일한 기능
 */
export function Bookmarks() {
  const { activeTabId } = useTabStore();
  const { bookmarks, removeBookmark } = useFileStore();
  const openTabWithConfirm = useOpenTabWithConfirm();

  if (bookmarks.length === 0) {
    return (
      <div className="px-3 py-2 text-caption text-gray-400">
        책갈피가 없습니다.
      </div>
    );
  }

  const handleClick = async (bookmark: typeof bookmarks[0]) => {
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
    <FlatList>
      {bookmarks.map((bookmark) => {
        const isActive = bookmark.id === activeTabId;

        return (
          <FlatListItem
            key={bookmark.id}
            icon={FileText}
            label={bookmark.title}
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
    </FlatList>
  );
}
