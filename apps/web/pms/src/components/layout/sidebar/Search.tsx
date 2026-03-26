'use client';

import { useSidebarStore } from '@/stores';
import { Search as SearchIcon, X } from 'lucide-react';

/**
 * 사이드바 메뉴 검색
 * - 입력 시 실시간 필터링
 */
export function Search() {
  const { searchQuery, setSearchQuery, clearSearch } = useSidebarStore();

  return (
    <div className="relative flex-1">
      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder="메뉴 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-control-h pl-8 pr-3 text-sm border border-ssoo-content-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ssoo-primary focus:border-transparent"
      />
      {searchQuery && (
        <button
          onClick={clearSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-control-h-sm w-control-h-sm flex items-center justify-center hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
