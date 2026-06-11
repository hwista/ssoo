'use client';

import { useAccessStore, useAuthStore, useSidebarStore } from '@/stores';
import { Search as SearchIcon, X } from 'lucide-react';
import { SsooSidebarSearchBox } from '@ssoo/web-shell';

/**
 * 사이드바 문서명 검색
 * - PMS 디자인 표준 적용
 */
export function Search() {
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const { searchOwnerUserId, searchQuery, setSearchQuery, clearSearch } = useSidebarStore();
  const canReadDocuments = useAccessStore((state) => state.snapshot?.features.canReadDocuments ?? false);
  const scopedSearchQuery = currentUserId && searchOwnerUserId === currentUserId ? searchQuery : '';

  return (
    <SsooSidebarSearchBox
      value={scopedSearchQuery}
      onChange={(value) => {
        if (!value) {
          clearSearch();
          return;
        }
        setSearchQuery(value);
      }}
      placeholder="문서명 검색..."
      disabled={!canReadDocuments}
      iconSlot={<SearchIcon className="h-4 w-4 text-gray-400" />}
      trailingSlot={
        scopedSearchQuery && canReadDocuments ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSearch}
            className="absolute right-2 top-1/2 flex h-control-h-sm w-control-h-sm -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="문서명 검색 초기화"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null
      }
    />
  );
}
