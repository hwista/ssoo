'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * 정렬 가능한 헤더를 생성하는 유틸리티 함수
 * 
 * @example
 * ```tsx
 * const columns: ColumnDef<User>[] = [
 *   {
 *     accessorKey: 'name',
 *     header: createSortableHeader('이름'),
 *   },
 * ];
 * ```
 */
export function createSortableHeader(label: string) {
  const SortableHeader = ({ 
    column 
  }: { 
    column: { 
      toggleSorting: (desc?: boolean) => void; 
      getIsSorted: () => 'asc' | 'desc' | false;
    };
  }) => (
    <Button
      variant="ghost"
      className="-ml-4"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      <ArrowUpDown className="ml-2 icon-body" />
    </Button>
  );
  SortableHeader.displayName = `SortableHeader(${label})`;
  return SortableHeader;
}

/**
 * 액션 메뉴 컬럼을 생성하는 유틸리티 함수
 * 
 * @example
 * ```tsx
 * const columns: ColumnDef<User>[] = [
 *   { accessorKey: 'name', header: '이름' },
 *   createActionsColumn([
 *     { label: '수정', onClick: (row) => handleEdit(row) },
 *     { label: '삭제', onClick: (row) => handleDelete(row), variant: 'destructive' },
 *   ]),
 * ];
 * ```
 */
export function createActionsColumn<TData>(
  actions: {
    label: string;
    onClick: (row: TData) => void;
    variant?: 'default' | 'destructive';
  }[]
): ColumnDef<TData> {
  return {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-control-h-sm w-control-h-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">메뉴 열기</span>
              <MoreHorizontal className="icon-body" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>작업</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {actions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(row.original);
                }}
                className={cn(
                  action.variant === 'destructive' && 'text-destructive'
                )}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };
}
