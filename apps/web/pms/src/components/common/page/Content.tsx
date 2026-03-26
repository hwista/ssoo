'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Content Props
 */
export interface ContentProps {
  /** 레이아웃 타입 */
  layout?: 'single' | 'vertical' | 'horizontal';
  /** 그리드 비율 (2개일 때) - 예: [60, 40] */
  ratio?: [number, number];
  /** 자식 컴포넌트 (DataGrid들) */
  children: React.ReactNode;
  /** 추가 className */
  className?: string;
}

/**
 * Content 컴포넌트 (page/Content)
 * 
 * 표준 해상도에 맞는 고정 크기 컨텐츠 영역을 제공합니다.
 * 내부에 DataGrid를 배치하여 테이블+페이지네이션 또는 차트를 표시합니다.
 * 
 * @example
 * ```tsx
 * // 단일 그리드
 * <Content>
 *   <DataGrid>
 *     <DataTable ... />
 *     <Pagination ... />
 *   </DataGrid>
 * </Content>
 * 
 * // 상하 2그리드
 * <Content layout="vertical" ratio={[60, 40]}>
 *   <DataGrid>...</DataGrid>
 *   <DataGrid>...</DataGrid>
 * </Content>
 * 
 * // 좌우 2그리드
 * <Content layout="horizontal" ratio={[50, 50]}>
 *   <DataGrid scrollable>...</DataGrid>
 *   <DataGrid scrollable>...</DataGrid>
 * </Content>
 * ```
 */
export function Content({
  layout = 'single',
  ratio = [50, 50],
  children,
  className,
}: ContentProps) {
  const childArray = React.Children.toArray(children);

  // 레이아웃별 스타일
  const layoutStyles: Record<string, string> = {
    single: 'flex flex-col',
    vertical: 'flex flex-col gap-4',
    horizontal: 'flex flex-row gap-4',
  };

  // 비율 스타일 생성
  const getChildStyle = (index: number): React.CSSProperties | undefined => {
    if (layout === 'single' || childArray.length === 1) {
      return { flex: 1 };
    }

    const flexValue = ratio[index] || 50;
    return { flex: flexValue };
  };

  return (
    <div
      className={cn(
        'flex-1 min-h-0 bg-white border border-gray-200 rounded-lg overflow-hidden',
        layoutStyles[layout],
        className
      )}
    >
      {childArray.map((child, index) => (
        <div
          key={index}
          style={getChildStyle(index)}
          className={cn(
            'min-h-0', // flex에서 스크롤 가능하게
            layout === 'vertical' && index > 0 && 'border-t border-gray-200',
            layout === 'horizontal' && index > 0 && 'border-l border-gray-200'
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
