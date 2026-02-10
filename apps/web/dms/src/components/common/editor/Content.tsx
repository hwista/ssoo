'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { DOCUMENT_WIDTHS } from '@/components/common/page';
import { BlockEditor, BlockEditorRef } from './BlockEditor';

/**
 * Content Props
 */
export interface ContentProps {
  /** HTML 콘텐츠 (BlockEditor용) */
  htmlContent: string;
  /** BlockEditor 변경 핸들러 */
  onBlockEditorChange: (html: string) => void;
  /** 저장 핸들러 (Ctrl+S) */
  onSave?: () => void;
  /** 문서 최대 너비 */
  maxWidth?: number;
  /** 레이아웃 변형 */
  variant?: 'standalone' | 'embedded';
  /** 콘텐츠 표면 표시 여부 */
  showSurface?: boolean;
  /** 추가 className */
  className?: string;
}

/**
 * Editor Content 컴포넌트
 * 
 * 에디터 본문 영역 (옵시디언 스타일 라이브 프리뷰)
 * - Tiptap BlockEditor + LivePreview 확장
 * - 커서 위치 블록에 마크다운 구문 표시
 */
export function Content({
  htmlContent,
  onBlockEditorChange,
  onSave,
  maxWidth,
  variant = 'standalone',
  showSurface,
  className,
}: ContentProps) {
  const isEmbedded = variant === 'embedded';
  const resolvedMaxWidth = maxWidth ?? (isEmbedded ? undefined : DOCUMENT_WIDTHS.portrait);
  const shouldShowSurface = showSurface ?? !isEmbedded;
  const blockEditorRef = React.useRef<BlockEditorRef>(null);

  return (
    <div
      className={cn(
        isEmbedded ? 'flex-1 overflow-hidden' : 'flex-1 flex justify-center overflow-hidden px-4',
        className
      )}
    >
      {/* 에디터 컨테이너 - 고정 너비 */}
      <div 
        className={cn(
          'h-full w-full overflow-hidden flex flex-col',
          shouldShowSurface && 'bg-white border border-gray-200 rounded-lg'
        )}
        style={resolvedMaxWidth ? { maxWidth: resolvedMaxWidth } : undefined}
      >
        <BlockEditor
          ref={blockEditorRef}
          content={htmlContent}
          onChange={onBlockEditorChange}
          onSave={onSave}
          editable={true}
          placeholder="/를 입력하여 블록 추가"
          className="flex-1"
        />
      </div>
    </div>
  );
}
