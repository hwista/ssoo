'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
  Updater,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Table as ReactTable,
} from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorState, LoadingState } from '../StateDisplay';
import { Toolbar } from './Toolbar';
import { Body } from './Body';
import { Footer } from './Footer';
import { SecondGridPanel } from './SecondGridPanel';

/**
 * DataGrid Props
 */
export interface DataGridProps<TData, TValue> {
  /** 컬럼 정의 */
  columns: ColumnDef<TData, TValue>[];
  /** 데이터 배열 */
  data: TData[];
  /** 로딩 상태 */
  loading?: boolean;
  /** 에러 */
  error?: Error | string | null;
  /** 재시도 핸들러 */
  onRetry?: () => void;
  /** 행 클릭 핸들러 */
  onRowClick?: (row: TData) => void;
  /** 선택 활성화 */
  enableRowSelection?: boolean;
  /** 선택된 행 변경 핸들러 */
  onSelectionChange?: (selectedRows: TData[]) => void;
  /** 검색 활성화 */
  enableSearch?: boolean;
  /** 검색 필드 (검색 대상 컬럼 accessorKey) */
  searchField?: string;
  /** 검색 placeholder */
  searchPlaceholder?: string;
  /** 컬럼 숨김 활성화 */
  enableColumnVisibility?: boolean;
  /** 정렬 활성화 */
  enableSorting?: boolean;
  /** 페이지네이션 - 서버 사이드 */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  /** 페이지네이션 - 클라이언트 사이드 */
  enableClientPagination?: boolean;
  /** 빈 상태 커스텀 */
  emptyState?: React.ReactNode;
  /** 테이블 wrapper className */
  className?: string;
  /** 테이블 body className */
  tableClassName?: string;
  /** 테이블 헤더 className */
  headerClassName?: string;
  /** 테이블 헤더 셀 className */
  headerCellClassName?: string;
  /** 행 ID 추출 함수 (선택 하이라이트용) */
  getRowId?: (row: TData) => string | number;
  /** 하이라이트할 행 ID */
  selectedRowId?: string | number | null;
  /** 세컨 그리드 패널 */
  secondGrid?: {
    enabled?: boolean;
    content: React.ReactNode;
    defaultOpen?: boolean;
    height?: number | string;
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
  };
}

/**
 * DataTable 컴포넌트
 * 
 * TanStack Table 기반의 데이터 테이블 컴포넌트입니다.
 * 정렬, 필터, 페이지네이션, 행 선택 등의 기능을 제공합니다.
 * 
 * @example
 * ```tsx
 * const columns: ColumnDef<User>[] = [
 *   { accessorKey: 'name', header: '이름' },
 *   { accessorKey: 'email', header: '이메일' },
 * ];
 * 
 * <DataTable
 *   columns={columns}
 *   data={users}
 *   loading={isLoading}
 *   onRowClick={(user) => router.push(`/users/${user.id}`)}
 * />
 * ```
 */
export function DataGrid<TData, TValue>({
  columns,
  data,
  loading = false,
  error,
  onRetry,
  onRowClick,
  enableRowSelection = false,
  onSelectionChange,
  enableSearch = false,
  searchField,
  searchPlaceholder = '검색...',
  enableColumnVisibility = false,
  enableSorting = true,
  pagination,
  enableClientPagination = false,
  emptyState,
  className,
  tableClassName,
  headerClassName,
  headerCellClassName,
  getRowId,
  selectedRowId,
  secondGrid,
}: DataGridProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const shouldUseClientPagination = enableClientPagination;
  const fallbackPageSize = 10;
  const rowHeight = 36;
  const headerHeight = 36;
  const defaultSecondGridHeight = '66%';
  const secondGridEnabled = Boolean(secondGrid?.enabled);
  const secondGridHeight = secondGrid?.height ?? defaultSecondGridHeight;
  const [paginationState, setPaginationState] = React.useState<PaginationState>({
    pageIndex: Math.max(0, (pagination?.page ?? 1) - 1),
    pageSize: pagination?.pageSize ?? fallbackPageSize,
  });
  const isSecondGridControlled = secondGrid?.isOpen !== undefined;
  const [internalSecondGridOpen, setInternalSecondGridOpen] = React.useState<boolean>(
    secondGrid?.defaultOpen ?? false
  );
  const isSecondGridOpen = isSecondGridControlled
    ? Boolean(secondGrid?.isOpen)
    : internalSecondGridOpen;
  const setSecondGridOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!secondGridEnabled) {
        return;
      }
      if (!isSecondGridControlled) {
        setInternalSecondGridOpen(nextOpen);
      }
      secondGrid?.onOpenChange?.(nextOpen);
    },
    [isSecondGridControlled, secondGrid, secondGridEnabled]
  );

  React.useEffect(() => {
    if (!shouldUseClientPagination) {
      return;
    }

    const nextPageIndex = Math.max(0, (pagination?.page ?? 1) - 1);
    const nextPageSize = pagination?.pageSize ?? fallbackPageSize;

    setPaginationState((prev) => {
      if (prev.pageIndex === nextPageIndex && prev.pageSize === nextPageSize) {
        return prev;
      }
      return { pageIndex: nextPageIndex, pageSize: nextPageSize };
    });
  }, [shouldUseClientPagination, pagination?.page, pagination?.pageSize]);

  React.useEffect(() => {
    if (!secondGridEnabled) {
      return;
    }
    if (!isSecondGridControlled) {
      setInternalSecondGridOpen(secondGrid?.defaultOpen ?? false);
    }
  }, [secondGridEnabled, secondGrid?.defaultOpen, isSecondGridControlled]);

  const handlePaginationChange = React.useCallback(
    (updater: Updater<PaginationState>) => {
      setPaginationState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (pagination) {
          if (next.pageIndex !== prev.pageIndex) {
            pagination.onPageChange(next.pageIndex + 1);
          }
          if (next.pageSize !== prev.pageSize) {
            pagination.onPageSizeChange?.(next.pageSize);
          }
        }
        return next;
      });
    },
    [pagination]
  );

  // 선택 컬럼 추가
  const tableColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns;
    
    const selectColumn: ColumnDef<TData, TValue> = {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="전체 선택"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="행 선택"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };
    
    return [selectColumn, ...columns];
  }, [columns, enableRowSelection]);

  const tableState = {
    sorting,
    columnFilters,
    columnVisibility,
    rowSelection,
    ...(shouldUseClientPagination && { pagination: paginationState }),
  };

  const table = useReactTable({
    data,
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    ...(shouldUseClientPagination && {
      getPaginationRowModel: getPaginationRowModel(),
      onPaginationChange: handlePaginationChange,
    }),
    ...(enableSorting && { getSortedRowModel: getSortedRowModel() }),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: tableState,
  });

  // 선택 변경 콜백
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table
        .getSelectedRowModel()
        .rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, table, onSelectionChange]);

  // 에러 상태
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  // 로딩 상태 (데이터 없을 때)
  if (loading && data.length === 0) {
    return (
      <LoadingState
        message="데이터를 불러오는 중..."
        className={className}
      />
    );
  }

  const showToolbar = enableSearch || enableColumnVisibility;

  return (
    <div className={cn('flex h-full min-h-0 w-full flex-col', className)}>
      {/* 상단 툴바 */}
      {showToolbar && (
        <div className="mb-4">
          <Toolbar
            table={table}
            enableSearch={enableSearch}
            searchField={searchField}
            searchPlaceholder={searchPlaceholder}
            enableColumnVisibility={enableColumnVisibility}
          />
        </div>
      )}

      {/* 테이블 본문 */}
      <div className="relative flex flex-1 min-h-0">
        <Body
          table={table}
          columns={tableColumns}
          loading={loading}
          emptyState={emptyState}
          onRowClick={onRowClick}
          tableClassName={tableClassName}
          headerClassName={headerClassName}
          headerCellClassName={headerCellClassName}
          getRowId={getRowId}
          selectedRowId={selectedRowId}
          minRows={pagination?.pageSize ?? fallbackPageSize}
          rowHeight={rowHeight}
          headerHeight={headerHeight}
        />
        {secondGridEnabled && (
          <SecondGridPanel
            isOpen={isSecondGridOpen}
            height={secondGridHeight}
            onToggle={() => setSecondGridOpen(!isSecondGridOpen)}
          >
            {secondGrid?.content}
          </SecondGridPanel>
        )}
      </div>

      {/* 하단 푸터 */}
      <Footer
        table={table}
        enableRowSelection={enableRowSelection}
        pagination={pagination}
        enableClientPagination={enableClientPagination}
        secondGrid={
          secondGridEnabled
            ? {
                isOpen: isSecondGridOpen,
                onToggle: () => setSecondGridOpen(!isSecondGridOpen),
              }
            : undefined
        }
      />
    </div>
  );
}

// Re-export types and utilities
export type { ColumnDef } from '@tanstack/react-table';
export type { ReactTable };
