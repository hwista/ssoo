'use client';

import { FileText, X } from 'lucide-react';
import { useTabStore, useFileStore } from '@/stores';

/**
 * 사이드바 책갈피 목록
 * - 각 항목에 삭제 버튼 포함
 * - PMS 즐겨찾기와 동일한 기능
 */
export function Bookmarks() {
  const { openTab, activeTabId } = useTabStore();
  const { bookmarks, removeBookmark } = useFileStore();

  if (bookmarks.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-gray-400">
        책갈피가 없습니다.
      </div>
    );
  }

  const handleClick = (bookmark: typeof bookmarks[0]) => {
    openTab({
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
    <div className="space-y-0.5">
      {bookmarks.map((bookmark) => {
        const isActive = bookmark.id === activeTabId;

        return (
          <div
            key={bookmark.id}
            className={`flex items-center gap-2 w-full h-control-h px-3 text-sm rounded-md transition-colors group ${
              isActive
                ? 'bg-ssoo-content-border text-ssoo-primary font-medium'
                : 'text-gray-700 hover:bg-ssoo-sitemap-bg'
            }`}
          >
            <button
              onClick={() => handleClick(bookmark)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <FileText className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-ssoo-primary' : 'text-gray-500'}`} />
              <span className="truncate">{bookmark.title}</span>
            </button>
            <button
              onClick={(e) => handleRemove(e, bookmark.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
              title="책갈피 해제"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
