'use client';

import { useAccessStore, useSidebarStore } from '@/stores';
import { SearchInput } from './SearchInput';

/**
 * 사이드바 파일 검색
 * - PMS 디자인 표준 적용
 */
export function Search() {
  const { searchQuery, setSearchQuery, clearSearch } = useSidebarStore();
  const canReadDocuments = useAccessStore((state) => state.snapshot?.features.canReadDocuments ?? false);

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
      disabled={!canReadDocuments}
      clearAriaLabel="파일 검색 초기화"
    />
  );
}
