'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// 문서 본문 최대 너비 (DocPageTemplate과 동일)
export const DOCUMENT_WIDTH = 975;

/**
 * ViewerContent Props
 */
export interface ViewerContentProps {
  /** 문서 콘텐츠 (HTML) */
  content: string;
  /** 줌 레벨 (퍼센트) */
  zoomLevel: number;
  /** 문서 최대 너비 */
  maxWidth?: number;
  /** 스크롤 컨테이너 ref */
  contentRef?: React.RefObject<HTMLDivElement | null>;
  /** 추가 className */
  className?: string;
}

/**
 * ViewerContent 컴포넌트
 * 
 * 문서 본문 렌더링 영역
 * - 최대 너비 975px
 * - prose 스타일 적용
 * - 줌 레벨 적용
 */
export function ViewerContent({
  content,
  zoomLevel,
  maxWidth = DOCUMENT_WIDTH,
  contentRef,
  className,
}: ViewerContentProps) {
  return (
    <div className={cn('flex-1 flex justify-center overflow-hidden px-4', className)}>
      {/* 문서 컨테이너 - 고정 너비 + 내부 스크롤 */}
      <div 
        ref={contentRef as React.RefObject<HTMLDivElement>}
        className={cn(
          'h-full w-full',
          'bg-white border border-gray-200 rounded-lg',
          'overflow-y-auto overflow-x-hidden',
          'scrollbar-thin'
        )}
        style={{ maxWidth }}
      >
        {/* 문서 본문 - 줌 적용 */}
        <article
          className={cn(
            'py-6 px-8',
            'prose prose-base max-w-none',
            'prose-headings:scroll-mt-4',
            // 코드 블록 스타일
            'prose-pre:bg-ssoo-content-bg prose-pre:text-ssoo-primary prose-pre:border-0',
            // 인라인 코드
            'prose-code:text-ssoo-primary prose-code:bg-ssoo-content-bg prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border-0'
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
