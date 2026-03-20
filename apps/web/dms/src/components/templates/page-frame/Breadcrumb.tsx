'use client';

import * as React from 'react';
import { Bot, ChevronRight, FilePenLine, Folder, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Breadcrumb Props
 * PMS Breadcrumb 확장 - 파일 경로 특화
 */
export interface BreadcrumbProps {
  /** 파일 경로 (예: 'docs/architecture/tech-stack.md') */
  filePath: string;
  /** 마지막 세그먼트를 오버라이드할 라벨 (예: 문서 제목) */
  lastSegmentLabel?: string;
  /** 경로 세그먼트 클릭 시 해당 폴더로 이동 */
  onPathClick?: (path: string) => void;
  /** 편집 중 상태 표시 */
  isEditing?: boolean;
  /** 루트 아이콘 변형 */
  rootIconVariant?: 'default' | 'ai' | 'folder' | 'editor';
  /** 추가 className */
  className?: string;
}

/**
 * 세그먼트 표시명 매핑
 * 경로 세그먼트를 사용자 친화적 이름으로 변환
 */
const SEGMENT_DISPLAY_NAMES: Record<string, string> = {
  'ai/chat': 'AI 대화',
  'ai/search': 'AI 검색',
  settings: '설정',
  git: 'Git',
  storage: 'Storage',
  ingest: 'Ingest',
};

/**
 * Breadcrumb 컴포넌트
 * 
 * 파일 경로를 브레드크럼으로 표시합니다.
 * 루트는 폴더 아이콘만 표시 (PMS와 동일)
 * AI 경로는 한글 제목으로 매핑됩니다.
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
  lastSegmentLabel,
  onPathClick,
  isEditing = false,
  rootIconVariant = 'default',
  className,
}: BreadcrumbProps) {
  // 경로를 세그먼트로 분리 (AI 경로는 단일 세그먼트로 표시)
  const segments = React.useMemo(() => {
    if (!filePath) return [];
    
    // 앞뒤 슬래시 제거 후 분리
    const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
    
    // AI 경로 매핑: ai/search → "AI 검색" 단일 세그먼트
    const displayName = SEGMENT_DISPLAY_NAMES[cleanPath];
    if (displayName) {
      return [displayName];
    }
    
    return cleanPath
      .split('/')
      .filter(Boolean)
      .map((segment) => SEGMENT_DISPLAY_NAMES[segment] ?? segment);
  }, [filePath]);

  // 각 세그먼트의 전체 경로 계산
  const getPathUpTo = (index: number): string => {
    return segments.slice(0, index + 1).join('/');
  };

  if (segments.length === 0) {
    return null;
  }

  const RootIcon = rootIconVariant === 'ai'
    ? Bot
    : rootIconVariant === 'folder'
      ? Folder
      : rootIconVariant === 'editor'
        ? FilePenLine
        : Settings;
  const isPathNavigationEnabled = typeof onPathClick === 'function';

  return (
    <nav 
      className={cn(
        'flex items-center text-sm text-gray-600 overflow-x-auto',
        'scrollbar-none', // 스크롤바 숨김
        className
      )}
      aria-label="파일 경로"
    >
      {/* 루트 아이콘 */}
      {isPathNavigationEnabled ? (
        <button
          onClick={() => onPathClick?.('')}
          className="flex items-center hover:text-ssoo-primary transition-colors shrink-0"
        >
          <RootIcon className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="flex items-center shrink-0 text-ssoo-primary/70">
          <RootIcon className="h-3.5 w-3.5" />
        </span>
      )}

      {/* 경로 세그먼트들 */}
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const segmentPath = getPathUpTo(index);

        return (
          <React.Fragment key={segmentPath}>
            <ChevronRight className="mx-1 h-3.5 w-3.5 text-gray-400 shrink-0" />
            
            {isLast ? (
              // 마지막 세그먼트는 클릭 불가, 볼드 (PMS 스타일)
              <span className="flex shrink-0 items-center gap-1 text-ssoo-primary font-medium">
                {lastSegmentLabel || segment}
                {isEditing && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-ssoo-primary/60" />
                )}
              </span>
            ) : isPathNavigationEnabled ? (
              // 중간 세그먼트는 클릭 가능 (아이콘 없이 텍스트만)
              <button
                onClick={() => onPathClick?.(segmentPath)}
                className="hover:text-ssoo-primary hover:underline transition-colors shrink-0"
              >
                {segment}
              </button>
            ) : (
              <span className="shrink-0 text-gray-500">
                {segment}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
