'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * ScrollArea 컴포넌트
 * 
 * @description 커스텀 스크롤바가 적용된 스크롤 영역 컴포넌트
 * CSS 유틸리티 클래스 기반으로 동작 (추가 의존성 없음)
 * 
 * @example
 * // 기본 사용 (세로 스크롤)
 * <ScrollArea className="h-[200px]">
 *   <div>스크롤 가능한 콘텐츠</div>
 * </ScrollArea>
 * 
 * @example
 * // 가로 스크롤
 * <ScrollArea orientation="horizontal" className="w-[400px]">
 *   <div className="flex">가로 스크롤 콘텐츠</div>
 * </ScrollArea>
 * 
 * @example
 * // 양방향 스크롤 + 얇은 스크롤바 + primary 색상
 * <ScrollArea orientation="both" scrollbarSize="thin" scrollbarTheme="primary">
 *   <div>콘텐츠</div>
 * </ScrollArea>
 * 
 * @example
 * // 사이드바용 스크롤 (호버 시만 표시)
 * <ScrollArea variant="sidebar" showOnHover>
 *   <div>사이드바 콘텐츠</div>
 * </ScrollArea>
 */

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 스크롤 방향 */
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** 스크롤바 크기 */
  scrollbarSize?: 'thin' | 'default' | 'wide';
  /** 스크롤바 색상 테마 */
  scrollbarTheme?: 'default' | 'primary' | 'accent' | 'transparent';
  /** 호버 시에만 스크롤바 표시 */
  showOnHover?: boolean;
  /** 프리셋 변형 */
  variant?: 'default' | 'sidebar' | 'table';
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      className,
      children,
      orientation = 'vertical',
      scrollbarSize = 'default',
      scrollbarTheme = 'default',
      showOnHover = false,
      variant = 'default',
      ...props
    },
    ref
  ) => {
    // 방향별 overflow 클래스
    const overflowClasses = {
      vertical: 'overflow-y-auto overflow-x-hidden',
      horizontal: 'overflow-x-auto overflow-y-hidden',
      both: 'overflow-auto',
    };

    // 크기별 스크롤바 클래스
    const sizeClasses = {
      thin: 'scrollbar-thin',
      default: 'scrollbar-default',
      wide: 'scrollbar-wide',
    };

    // 테마별 스크롤바 클래스
    const themeClasses = {
      default: '',
      primary: 'scrollbar-primary',
      accent: 'scrollbar-accent',
      transparent: 'scrollbar-transparent',
    };

    // 프리셋 변형 클래스
    const variantClasses = {
      default: '',
      sidebar: 'scrollbar-sidebar',
      table: 'scrollbar-table',
    };

    return (
      <div
        ref={ref}
        className={cn(
          overflowClasses[orientation],
          variant !== 'default' ? variantClasses[variant] : [
            sizeClasses[scrollbarSize],
            themeClasses[scrollbarTheme],
            'scrollbar-rounded',
          ],
          showOnHover && 'scrollbar-on-hover',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
