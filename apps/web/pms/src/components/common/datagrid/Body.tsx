'use client';

import { ColumnDef, flexRender, Table as ReactTable } from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '../StateDisplay';

interface BodyProps<TData, TValue> {
  table: ReactTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  tableClassName?: string;
  headerClassName?: string;
  headerCellClassName?: string;
  getRowId?: (row: TData) => string | number;
  selectedRowId?: string | number | null;
  minRows?: number;
  rowHeight?: number;
  headerHeight?: number;
}

/**
 * DataGrid 본문
 * - 테이블 헤더
 * - 테이블 바디 (로딩 스켈레톤, 데이터 행, 빈 상태)
 */
export function Body<TData, TValue>({
  table,
  columns,
  loading = false,
  emptyState,
  onRowClick,
  tableClassName,
  headerClassName,
  headerCellClassName,
  getRowId,
  selectedRowId,
  minRows = 0,
  rowHeight = 36,
  headerHeight = 36,
}: BodyProps<TData, TValue>) {
  const minBodyHeight = minRows > 0
    ? minRows * rowHeight + headerHeight
    : undefined;

  return (
    <div
      className={cn('flex flex-1 min-h-0 flex-col rounded-md border', tableClassName)}
      style={minBodyHeight ? { minHeight: minBodyHeight } : undefined}
    >
      <Table>
        <TableHeader className={cn('shadow-sm', headerClassName ?? 'bg-ssoo-content-bg')}>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} style={{ height: headerHeight }}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn('sticky top-0 z-10', headerCellClassName ?? 'bg-ssoo-content-bg')}
                  style={{ height: headerHeight }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {/* 로딩 중 스켈레톤 */}
          {loading && (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                {columns.map((_, colIndex) => (
                  <TableCell key={`skeleton-${index}-${colIndex}`}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}

          {/* 데이터 행 */}
          {!loading && table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const rowId = getRowId ? getRowId(row.original) : undefined;
              const isActive = selectedRowId !== null && selectedRowId !== undefined && rowId === selectedRowId;

              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  data-active={isActive ? 'true' : undefined}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'transition-colors',
                    row.index % 2 === 1 ? 'bg-gray-50' : 'bg-white',
                    onRowClick && 'cursor-pointer hover:bg-ssoo-sitemap-bg',
                    isActive && 'bg-ssoo-content-border'
                  )}
                  style={{ height: rowHeight }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            /* 빈 상태 */
            !loading && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-full text-center align-middle"
                  style={minBodyHeight ? { height: minBodyHeight - headerHeight } : undefined}
                >
                  {emptyState || (
                    <div className="text-sm text-muted-foreground font-normal">
                      조회된 데이터가 없습니다
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </div>
  );
}
