'use client';

import { useSidebarStore } from '@/stores';
import { SearchInput } from './SearchInput';

/**
 * 사이드바 파일 검색
 * - PMS 디자인 표준 적용
 */
export function Search() {
  const { searchQuery, setSearchQuery, clearSearch } = useSidebarStore();

  return (
    <SearchInput
      value={searchQuery}
      onChange={(value) => {
        if (!value) {
          clearSearch();
          return;
        }
        setSearchQuery(value);
      }}
      placeholder="파일 검색..."
      clearAriaLabel="파일 검색 초기화"
    />
  );
}
