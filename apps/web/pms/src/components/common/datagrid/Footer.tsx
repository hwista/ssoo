'use client';

import { Table as ReactTable } from '@tanstack/react-table';
import { GripHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Pagination } from './Pagination';

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
    <div className="flex flex-col bg-gray-50">
      {secondGrid && (
        <div className="flex justify-center py-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-control-h-sm w-10 rounded-full border border-gray-200 bg-white shadow-sm"
            onClick={secondGrid.onToggle}
            aria-label={secondGrid.isOpen ? '상세 그리드 접기' : '상세 그리드 펼치기'}
          >
            <GripHorizontal className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex items-center px-4 py-2 min-h-[52px]">
        {/* 선택 정보 */}
        {showSelectionInfo && (
          <div className="text-sm text-muted-foreground whitespace-nowrap">
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
            <span className="text-sm text-muted-foreground">
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
    </div>
  );
}
