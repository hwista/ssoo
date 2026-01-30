'use client';

import * as React from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Breadcrumb Props
 * PMS Breadcrumb 확장 - 파일 경로 특화
 */
export interface BreadcrumbProps {
  /** 파일 경로 (예: 'docs/architecture/tech-stack.md') */
  filePath: string;
  /** 경로 세그먼트 클릭 시 해당 폴더로 이동 */
  onPathClick?: (path: string) => void;
  /** 추가 className */
  className?: string;
}

/**
 * Breadcrumb 컴포넌트
 * 
 * 파일 경로를 브레드크럼으로 표시합니다.
 * 루트는 폴더 아이콘만 표시 (PMS와 동일)
 * 
 * @example
 * ```tsx
 * <Breadcrumb 
 *   filePath="docs/architecture/tech-stack.md"
 *   onPathClick={(path) => openFolder(path)}
 * />
 * ```
 */
export function Breadcrumb({
  filePath,
  onPathClick,
  className,
}: BreadcrumbProps) {
  // 경로를 세그먼트로 분리
  const segments = React.useMemo(() => {
    if (!filePath) return [];
    
    // 앞뒤 슬래시 제거 후 분리
    const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
    return cleanPath.split('/').filter(Boolean);
  }, [filePath]);

  // 각 세그먼트의 전체 경로 계산
  const getPathUpTo = (index: number): string => {
    return segments.slice(0, index + 1).join('/');
  };

  if (segments.length === 0) {
    return null;
  }

  return (
    <nav 
      className={cn(
        'flex items-center text-sm text-gray-600 overflow-x-auto',
        'scrollbar-none', // 스크롤바 숨김
        className
      )}
      aria-label="파일 경로"
    >
      {/* 루트 - 폴더 아이콘만 (PMS와 동일) */}
      <button
        onClick={() => onPathClick?.('')}
        className="flex items-center hover:text-ssoo-primary transition-colors shrink-0"
      >
        <Folder className="h-3.5 w-3.5" />
      </button>

      {/* 경로 세그먼트들 */}
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const segmentPath = getPathUpTo(index);

        return (
          <React.Fragment key={segmentPath}>
            <ChevronRight className="mx-1 h-3.5 w-3.5 text-gray-400 shrink-0" />
            
            {isLast ? (
              // 마지막 세그먼트는 클릭 불가, 볼드 (PMS 스타일)
              <span className="text-ssoo-primary font-medium shrink-0">
                {segment}
              </span>
            ) : (
              // 중간 세그먼트는 클릭 가능 (아이콘 없이 텍스트만)
              <button
                onClick={() => onPathClick?.(segmentPath)}
                className="hover:text-ssoo-primary hover:underline transition-colors shrink-0"
              >
                {segment}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
