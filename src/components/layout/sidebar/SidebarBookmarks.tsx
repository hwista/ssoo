'use client';

import { FileText, X, Bookmark } from 'lucide-react';
import { useTabStore } from '@/stores';

/**
 * 사이드바 책갈피 목록
 * - 각 항목에 삭제 버튼 포함
 * - PMS 즐겨찾기와 동일한 기능
 */
export function SidebarBookmarks() {
  const { bookmarks, removeBookmark, openTab, activeTabId } = useTabStore();

  if (bookmarks.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
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
                : 'text-foreground hover:bg-ssoo-sitemap-bg'
            }`}
          >
            <button
              onClick={() => handleClick(bookmark)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <FileText className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-ssoo-primary' : 'text-muted-foreground'}`} />
              <span className="truncate">{bookmark.title}</span>
            </button>
            <button
              onClick={(e) => handleRemove(e, bookmark.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-ssoo-sitemap-bg rounded transition-opacity"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
