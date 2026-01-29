'use client';

import * as React from 'react';
import { ChevronRight, FileText, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DocBreadcrumb Props
 * PMS Breadcrumb 확장 - 파일 경로 특화
 */
export interface DocBreadcrumbProps {
  /** 파일 경로 (예: 'docs/architecture/tech-stack.md') */
  filePath: string;
  /** 경로 세그먼트 클릭 시 해당 폴더로 이동 */
  onPathClick?: (path: string) => void;
  /** 추가 className */
  className?: string;
}

/**
 * DocBreadcrumb 컴포넌트
 * 
 * 파일 경로를 브레드크럼으로 표시합니다.
 * 루트는 폴더 아이콘만 표시 (PMS와 동일)
 * 
 * @example
 * ```tsx
 * <DocBreadcrumb 
 *   filePath="docs/architecture/tech-stack.md"
 *   onPathClick={(path) => openFolder(path)}
 * />
 * ```
 */
export function DocBreadcrumb({
  filePath,
  onPathClick,
  className,
}: DocBreadcrumbProps) {
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

  // 파일인지 폴더인지 판단 (마지막 세그먼트가 확장자를 가지면 파일)
  const isFile = (segment: string): boolean => {
    return /\.[a-zA-Z0-9]+$/.test(segment);
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
        const isFileSegment = isFile(segment);

        return (
          <React.Fragment key={segmentPath}>
            <ChevronRight className="mx-1 h-3.5 w-3.5 text-gray-400 shrink-0" />
            
            {isLast ? (
              // 마지막 세그먼트는 클릭 불가
              <span className="flex items-center text-ssoo-primary font-medium shrink-0">
                {isFileSegment && <FileText className="h-3.5 w-3.5 mr-1" />}
                {segment}
              </span>
            ) : (
              // 중간 세그먼트는 클릭 가능
              <button
                onClick={() => onPathClick?.(segmentPath)}
                className="flex items-center hover:text-ssoo-primary hover:underline transition-colors shrink-0"
              >
                <Folder className="h-3.5 w-3.5 mr-1" />
                {segment}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
