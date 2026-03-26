'use client';

import { Table as ReactTable } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ToolbarProps<TData> {
  table: ReactTable<TData>;
  enableSearch?: boolean;
  searchField?: string;
  searchPlaceholder?: string;
  enableColumnVisibility?: boolean;
}

/**
 * DataGrid 상단 툴바
 * - 검색 입력
 * - 컨럼 가시성 토글
 */
export function Toolbar<TData>({
  table,
  enableSearch = false,
  searchField,
  searchPlaceholder = '검색...',
  enableColumnVisibility = false,
}: ToolbarProps<TData>) {
  // 툴바 표시 조건
  if (!enableSearch && !enableColumnVisibility) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      {/* 검색 */}
      {enableSearch && searchField ? (
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchField)?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn(searchField)?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      ) : (
        <div />
      )}

      {/* 컬럼 가시성 */}
      {enableColumnVisibility && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              컬럼 <ChevronDown className="ml-2 icon-body" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
