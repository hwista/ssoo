'use client';

import * as React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 브레드크럼 아이템
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

/**
 * Breadcrumb Props
 */
export interface BreadcrumbProps {
  /** 브레드크럼 아이템 배열 (문자열 또는 객체) */
  items: (string | BreadcrumbItem)[];
  /** 추가 className */
  className?: string;
}

/**
 * Breadcrumb 컴포넌트
 * 
 * 페이지 경로를 표시합니다.
 * 
 * @example
 * ```tsx
 * <Breadcrumb items={['요청', '고객요청 관리', '목록']} />
 * ```
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav className={cn('flex items-center text-sm text-muted-foreground', className)}>
      <Home className="h-3.5 w-3.5 text-gray-400" />
      {items.map((item, index) => {
        const label = typeof item === 'string' ? item : item.label;
        const isLast = index === items.length - 1;
        const onClick = typeof item === 'object' ? item.onClick : undefined;

        return (
          <React.Fragment key={index}>
            <ChevronRight className="mx-1 h-3.5 w-3.5 text-gray-400" />
            {onClick && !isLast ? (
              <button
                onClick={onClick}
                className="hover:text-foreground hover:underline transition-colors"
              >
                {label}
              </button>
            ) : (
              <span className={cn(isLast && 'text-foreground font-medium')}>
                {label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
