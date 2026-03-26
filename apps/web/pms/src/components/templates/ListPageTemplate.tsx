'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  Header,
  HeaderProps,
  Content,
  ContentProps,
  DataGrid,
  DataGridProps,
} from '../common';

/**
 * ListPageTemplate Props (새 표준)
 */
export interface ListPageTemplateProps<TData, TValue> {
  /** 브레드크럼 경로 */
  breadcrumb?: (string | BreadcrumbItem)[];
  /** Header 설정 */
  header: Omit<HeaderProps, 'className'>;
  /** Content 설정 */
  content?: Omit<ContentProps, 'children' | 'className'>;
  /** DataGrid Props */
  table: Omit<DataGridProps<TData, TValue>, 'className'>;
  /** 페이지 wrapper className */
  className?: string;
  /** 자식 요소 (DataGrid 직접 전달 시) */
  children?: React.ReactNode;
}

/**
 * ListPageTemplate 컴포넌트 (새 표준)
 * 
 * 목록 페이지의 표준 레이아웃을 제공합니다.
 * 
 * 구조:
 * - Breadcrumb: 경로 표시
 * - Header: 액션 버튼 + 검색 필터 (접기/펼치기)
 * - Content: 고정 크기 컨텐츠 영역
 *   - DataGrid: 테이블 슬롯 (내장 페이지네이션)
 * 
 * @example
 * ```tsx
 * <ListPageTemplate
 *   breadcrumb={['요청', '고객요청 관리']}
 *   header={{
 *     collapsible: true,
 *     actions: [
 *       { label: '등록', icon: <Plus />, onClick: handleCreate },
 *       { label: '삭제', variant: 'destructive', onClick: handleDelete },
 *     ],
 *     filters: [
 *       { key: 'name', type: 'text', placeholder: '프로젝트명' },
 *       { key: 'status', type: 'select', options: statusOptions },
 *     ],
 *     onSearch: handleSearch,
 *     onReset: handleReset,
 *   }}
 *   table={{
 *     columns,
 *     data,
 *     loading: isLoading,
 *     onRowClick: handleRowClick,
 *     pagination: {
 *       page,
 *       pageSize,
 *       total,
 *       onPageChange: setPage,
 *       onPageSizeChange: setPageSize,
 *     },
 *   }}
 * />
 * ```
 */
export function ListPageTemplate<TData, TValue>({
  breadcrumb,
  header,
  content,
  table,
  className,
  children,
}: ListPageTemplateProps<TData, TValue>) {
  return (
    <div className={cn('flex flex-col h-full p-4 gap-4', className)}>
      {/* 브레드크럼 */}
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb items={breadcrumb} />
      )}

      {/* 페이지 헤더 (액션 + 필터, 접기/펼치기) */}
      <Header {...header} />

      {/* 페이지 컨텐츠 */}
      {children ? (
        <Content {...content}>{children}</Content>
      ) : (
        <Content {...content}>
          <DataGrid {...table} />
        </Content>
      )}
    </div>
  );
}

// displayName for DataGrid child detection
ListPageTemplate.displayName = 'ListPageTemplate';
