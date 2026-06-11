'use client';

import { SsooSidebarSearchBox } from '@ssoo/web-shell';
import { useSidebarStore } from '@/stores';
import { Search as SearchIcon, X } from 'lucide-react';

/**
 * 사이드바 메뉴 검색
 * - 입력 시 실시간 필터링
 */
export function Search() {
  const { searchQuery, setSearchQuery, clearSearch } = useSidebarStore();

  return (
    <SsooSidebarSearchBox
      placeholder="메뉴 검색..."
      value={searchQuery}
      onChange={setSearchQuery}
      iconSlot={<SearchIcon className="h-4 w-4 text-gray-400" />}
      trailingSlot={
        searchQuery ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 flex h-control-h-sm w-control-h-sm -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null
      }
    />
  );
}
