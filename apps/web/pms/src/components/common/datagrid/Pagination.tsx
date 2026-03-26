'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Pagination Props
 */
export interface PaginationProps {
  /** 현재 페이지 (1부터 시작) */
  page: number;
  /** 페이지 당 항목 수 */
  pageSize: number;
  /** 전체 항목 수 */
  total: number;
  /** 페이지 변경 핸들러 */
  onPageChange: (page: number) => void;
  /** 페이지 사이즈 변경 핸들러 */
  onPageSizeChange?: (pageSize: number) => void;
  /** 페이지 사이즈 옵션 */
  pageSizeOptions?: number[];
  /** 페이지 사이즈 선택 표시 여부 */
  showPageSizeSelect?: boolean;
  /** 총 개수 표시 여부 */
  showTotal?: boolean;
  /** 추가 className */
  className?: string;
}

/**
 * Pagination 컴포넌트
 * 
 * 페이지 네비게이션을 제공합니다.
 * 
 * @example
 * ```tsx
 * <Pagination
 *   page={1}
 *   pageSize={10}
 *   total={100}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 * />
 * ```
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50, 100],
  showPageSizeSelect = true,
  showTotal = true,
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className={cn('flex items-center justify-between px-2', className)}>
      {/* 좌측: 페이지 사이즈 선택 & 총 개수 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {showPageSizeSelect && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>페이지당</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-control-h w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>개</span>
          </div>
        )}
        
        {showTotal && total > 0 && (
          <span>
            {startItem}-{endItem} / 총 {total.toLocaleString()}개
          </span>
        )}
      </div>

      {/* 우측: 페이지 네비게이션 */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-control-h w-control-h"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
        >
          <ChevronsLeft className="icon-body" />
          <span className="sr-only">첫 페이지</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-control-h w-control-h"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="icon-body" />
          <span className="sr-only">이전 페이지</span>
        </Button>

        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-medium">{page}</span>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">{totalPages}</span>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-control-h w-control-h"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
        >
          <ChevronRight className="icon-body" />
          <span className="sr-only">다음 페이지</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-control-h w-control-h"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
        >
          <ChevronsRight className="icon-body" />
          <span className="sr-only">마지막 페이지</span>
        </Button>
      </div>
    </div>
  );
}

// displayName for DataGrid child detection
Pagination.displayName = 'Pagination';
