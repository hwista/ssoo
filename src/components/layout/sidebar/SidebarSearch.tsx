'use client';

import { Search, X } from 'lucide-react';
import { useLayoutStore } from '@/stores';

/**
 * 사이드바 파일 검색
 */
export function SidebarSearch() {
  const { searchQuery, setSearchQuery, clearSearch } = useLayoutStore();

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="파일 검색..."
        className="w-full h-8 pl-8 pr-8 text-sm bg-white border border-gray-200 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/20"
      />
      {searchQuery && (
        <button
          onClick={clearSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      )}
    </div>
  );
}
