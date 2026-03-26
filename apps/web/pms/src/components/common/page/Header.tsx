'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Search, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { FilterBar } from './FilterBar';
import type { FilterField, FilterValues } from './FilterBar';

/**
 * 액션 버튼 정의
 */
export interface ActionItem {
  /** 버튼 라벨 */
  label: string;
  /** 아이콘 */
  icon?: React.ReactNode;
  /** 버튼 스타일 */
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 로딩 상태 */
  loading?: boolean;
}

/**
 * Header Props
 */
export interface HeaderProps {
  /** 액션 버튼 목록 (좌측 정렬) */
  actions?: ActionItem[];
  /** 검색 필터 필드 (옵션) */
  filters?: FilterField[];
  /** 검색 실행 */
  onSearch?: (values: FilterValues) => void;
  /** 검색 초기화 */
  onReset?: () => void;
  /** 접기/펼치기 가능 여부 */
  collapsible?: boolean;
  /** 기본 접힘 상태 */
  defaultCollapsed?: boolean;
  /** 추가 className */
  className?: string;
}

export type { FilterField, FilterValues };

/**
 * Header 컴포넌트 (page/Header)
 * 
 * 액션 버튼(좌측 정렬) + 검색 필터로 구성되며, 접기/펼치기 가능
 * 
 * @example
 * ```tsx
 * <Header
 *   actions={[
 *     { label: '등록', icon: <Plus />, onClick: handleCreate },
 *     { label: '삭제', variant: 'destructive', onClick: handleDelete },
 *   ]}
 *   filters={[
 *     { key: 'name', type: 'text', placeholder: '검색어' },
 *     { key: 'status', type: 'select', options: statusOptions },
 *   ]}
 *   onSearch={handleSearch}
 *   onReset={handleReset}
 *   collapsible
 * />
 * ```
 */
export function Header({
  actions,
  filters,
  onSearch,
  onReset,
  collapsible = true,
  defaultCollapsed = false,
  className,
}: HeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSearch = useCallback(() => {
    onSearch?.(filterValues);
  }, [onSearch, filterValues]);

  const handleReset = useCallback(() => {
    setFilterValues({});
    onReset?.();
  }, [onReset]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const hasFilters = filters && filters.length > 0;
  const hasActions = actions && actions.length > 0;

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg overflow-hidden',
        className
      )}
    >
      {/* 액션 바 */}
      <div className="flex items-center justify-between px-4 py-2 min-h-[52px] border-b border-gray-100 bg-gray-50">
        {/* 좌측: 액션 버튼들 */}
        <div className="flex items-center gap-2">
          {hasActions && actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'default'}
              size="default"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className="h-control-h"
            >
              {action.loading ? (
                <LoadingSpinner className="mr-1.5" />
              ) : action.icon ? (
                <span className="mr-1.5">{action.icon}</span>
              ) : null}
              {action.label}
            </Button>
          ))}
        </div>

        {/* 우측: 접기/펼치기 버튼 */}
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="h-8 px-2 text-muted-foreground"
          >
            {isCollapsed ? (
              <>
                <span className="mr-1 text-xs">펼치기</span>
                <ChevronDown className="h-4 w-4" />
              </>
            ) : (
              <>
                <span className="mr-1 text-xs">접기</span>
                <ChevronUp className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* 필터 바 (접힘 상태가 아닐 때만 표시) */}
      {!isCollapsed && hasFilters && (
        <div className="px-4 py-2 min-h-[52px] bg-gray-50">
          <div className="flex items-center gap-3">
            <FilterBar
              fields={filters}
              values={filterValues}
              onChange={handleFilterChange}
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="default"
                onClick={handleSearch}
                className="h-control-h"
              >
                <Search className="h-4 w-4 mr-1.5" />
                검색
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={handleReset}
                className="h-control-h"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                초기화
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 필터가 없어도 기본 영역 확보 */}
      {!isCollapsed && !hasFilters && (
        <div className="px-4 py-2 bg-gray-50 min-h-[52px] flex items-center">
          <span className="text-sm text-muted-foreground">검색 조건이 없습니다</span>
        </div>
      )}
    </div>
  );
}
