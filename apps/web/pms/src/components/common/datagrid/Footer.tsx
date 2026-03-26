'use client';

import { Table as ReactTable } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Pagination } from './Pagination';
import { SecondGridToggleButton } from './SecondGridPanel';

interface FooterProps<TData> {
  table: ReactTable<TData>;
  enableRowSelection?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  enableClientPagination?: boolean;
  secondGrid?: {
    isOpen: boolean;
    onToggle: () => void;
  };
}

/**
 * DataGrid 하단 푸터
 * - 선택 정보
 * - 서버 사이드 페이지네이션
 * - 클라이언트 사이드 페이지네이션
 */
export function Footer<TData>({
  table,
  enableRowSelection = false,
  pagination,
  enableClientPagination = false,
  secondGrid,
}: FooterProps<TData>) {
  // 푸터 표시 조건
  const hasContent = enableRowSelection || pagination || enableClientPagination;
  if (!hasContent) {
    return null;
  }

  const showSelectionInfo = enableRowSelection;

  return (
    <div className="relative flex items-center px-4 py-2 min-h-[52px] bg-gray-50">
      {secondGrid && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-20 bg-transparent border-transparent pointer-events-none">
          <SecondGridToggleButton
            isOpen={secondGrid.isOpen}
            onToggle={secondGrid.onToggle}
            className="pointer-events-auto"
          />
        </div>
      )}
        {/* 선택 정보 */}
        {showSelectionInfo && (
          <div className="text-body-sm text-muted-foreground whitespace-nowrap">
            {table.getFilteredSelectedRowModel().rows.length}개 선택됨 /{' '}
            {table.getFilteredRowModel().rows.length}개
          </div>
        )}

        {/* 서버 사이드 페이지네이션 */}
        {pagination && (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            showTotal={!enableRowSelection}
            className={showSelectionInfo ? 'flex-1 ml-4 px-0' : 'flex-1 px-0'}
          />
        )}

        {/* 클라이언트 사이드 페이지네이션 */}
        {enableClientPagination && !pagination && (
          <div className={showSelectionInfo ? 'flex items-center space-x-2 ml-4' : 'flex items-center space-x-2 ml-auto'}>
            <Button
              variant="outline"
              size="default"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              이전
            </Button>
            <span className="text-body-sm text-muted-foreground">
              {table.getState().pagination.pageIndex + 1} /{' '}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="default"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              다음
            </Button>
          </div>
        )}
    </div>
  );
}
