'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * LineNumbers Props
 */
export interface LineNumbersProps {
  /** 총 줄 수 */
  lineCount: number;
  /** 시작 줄 번호 (기본 1) */
  startLine?: number;
  /** 현재 활성 줄 (하이라이트) */
  activeLine?: number;
  /** 줄 클릭 핸들러 */
  onLineClick?: (lineNumber: number) => void;
  /** 추가 className */
  className?: string;
}

/**
 * LineNumbers 컴포넌트
 * 
 * 문서 본문 옆에 표시되는 줄번호
 * 
 * @example
 * ```tsx
 * <div className="flex">
 *   <LineNumbers 
 *     lineCount={156} 
 *     activeLine={currentLine}
 *     onLineClick={(line) => scrollToLine(line)}
 *   />
 *   <div className="flex-1">
 *     <article>문서 본문...</article>
 *   </div>
 * </div>
 * ```
 */
export function LineNumbers({
  lineCount,
  startLine = 1,
  activeLine,
  onLineClick,
  className,
}: LineNumbersProps) {
  // 줄 번호 배열 생성
  const lines = React.useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => startLine + i);
  }, [lineCount, startLine]);

  // 최대 자릿수 계산 (정렬을 위해)
  const maxDigits = String(startLine + lineCount - 1).length;

  return (
    <div
      className={cn(
        'select-none text-right pr-3 py-4',
        'text-sm font-mono text-ssoo-primary/60', // 보라색 (ssoo-primary) 60% 투명도
        'shrink-0',
        className
      )}
      style={{
        minWidth: `${maxDigits * 0.6 + 1.5}rem`, // 자릿수에 따라 너비 조정
      }}
      aria-hidden="true"
    >
      {lines.map((line) => (
        <div
          key={line}
          onClick={() => onLineClick?.(line)}
          className={cn(
            'leading-6 h-6', // 에디터 줄 높이와 맞춤
            onLineClick && 'cursor-pointer hover:text-ssoo-primary',
            activeLine === line && 'text-ssoo-primary bg-ssoo-content-bg font-medium'
          )}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

/**
 * 텍스트에서 줄 수 계산 헬퍼
 */
export function countLines(text: string): number {
  if (!text) return 0;
  return text.split('\n').length;
}

/**
 * HTML에서 줄 수 추정 헬퍼
 * (정확하지 않을 수 있음 - 실제 렌더링 결과와 다를 수 있음)
 */
export function estimateLinesFromHtml(html: string): number {
  if (!html) return 0;
  
  // HTML 태그 제거 후 줄바꿈 기준으로 계산
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  
  return countLines(text);
}
