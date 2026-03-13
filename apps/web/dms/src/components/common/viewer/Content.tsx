'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { DOCUMENT_WIDTHS } from '@/components/templates/page-frame';

// 문서 본문 최대 너비 (PageTemplate과 동일)
export const DOCUMENT_WIDTH = DOCUMENT_WIDTHS.portrait;

type ContentVariant = 'standalone' | 'embedded';

/**
 * Content Props
 */
export interface ContentProps {
  /** 문서 콘텐츠 (HTML) */
  content: string;
  /** 줌 레벨 (퍼센트) */
  zoomLevel: number;
  /** 문서 최대 너비 */
  maxWidth?: number;
  /** 레이아웃 변형 */
  variant?: ContentVariant;
  /** 콘텐츠 표면 표시 여부 */
  showSurface?: boolean;
  /** 스크롤 컨테이너 ref */
  contentRef?: React.RefObject<HTMLDivElement | null>;
  /** 추가 className */
  className?: string;
}

/**
 * Content 컴포넌트
 * 
 * 문서 본문 렌더링 영역
 * - 최대 너비 975px
 * - prose 스타일 적용
 * - 줌 레벨 적용
 */
export function Content({
  content,
  zoomLevel,
  maxWidth,
  variant = 'standalone',
  showSurface,
  contentRef,
  className,
}: ContentProps) {
  const isEmbedded = variant === 'embedded';
  const resolvedMaxWidth = maxWidth ?? (isEmbedded ? undefined : DOCUMENT_WIDTHS.portrait);
  const shouldShowSurface = showSurface ?? !isEmbedded;

  return (
    <div
      className={cn(
        isEmbedded ? 'h-full min-h-0 overflow-hidden' : 'h-full min-h-0 flex justify-center overflow-hidden px-4',
        className
      )}
    >
      {/* 문서 컨테이너 - 고정 너비 + 내부 스크롤 */}
      <div 
        ref={contentRef}
        className={cn(
          'h-full w-full overflow-y-auto overflow-x-hidden scrollbar-thin bg-white',
          shouldShowSurface && 'bg-white border border-gray-200 rounded-lg'
        )}
        style={resolvedMaxWidth ? { maxWidth: resolvedMaxWidth } : undefined}
      >
        {/* 문서 본문 - 줌 적용 */}
        <article
          className={cn(
            'py-6 px-8',
            'prose prose-base max-w-none font-sans',
            'prose-headings:scroll-mt-4',
            // 줄 간격, margin 통일
            'prose-p:my-2 prose-p:leading-relaxed prose-li:leading-relaxed',
            // 코드 블록 스타일
            'prose-pre:bg-ssoo-content-bg prose-pre:text-ssoo-primary prose-pre:border-0 prose-pre:font-mono',
            // 인라인 코드
            'prose-code:text-ssoo-primary prose-code:bg-ssoo-content-bg prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border-0 prose-code:font-mono'
          )}
          style={{
            fontSize: `${zoomLevel}%`,
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}
