'use client';

import { Search, X } from 'lucide-react';
import { useLayoutStore } from '@/stores';

/**
 * 사이드바 파일 검색
 * - PMS 디자인 표준 적용
 */
export function SidebarSearch() {
  const { searchQuery, setSearchQuery, clearSearch } = useLayoutStore();

  return (
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="파일 검색..."
        className="w-full h-control-h pl-8 pr-8 text-sm bg-white border border-ssoo-content-border rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ssoo-primary focus:border-transparent"
      />
      {searchQuery && (
        <button
          onClick={clearSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
