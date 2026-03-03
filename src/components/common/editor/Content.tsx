'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { DOCUMENT_WIDTHS } from '@/components/common/page';
import { BlockEditor, BlockEditorRef } from './BlockEditor';

/**
 * Content Props
 */
export interface ContentProps {
  /** Markdown 콘텐츠 (BlockEditor용) */
  markdownContent: string;
  /** BlockEditor 변경 핸들러 */
  onBlockEditorChange: (markdown: string) => void;
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
  /** 에디터 placeholder */
  placeholder?: string;
  /** 현재 편집 파일 경로 (상대 링크 해석용) */
  currentFilePath?: string | null;
  /** 미리보기 모드 여부 */
  isPreview?: boolean;
  /** BlockEditor ref (외부 툴바 명령 연동용) */
  blockEditorRef?: React.RefObject<BlockEditorRef | null>;
  /** BlockEditor 내부 툴바 표시 여부 */
  showToolbar?: boolean;
}

/**
 * Editor Content 컴포넌트
 *
 * 에디터 본문 영역
 * - markdown 문자열을 단일 소스로 유지
 * - 활성 블록은 raw markdown, 나머지는 html 렌더
 */
export function Content({
  markdownContent,
  onBlockEditorChange,
  onSave,
  maxWidth,
  variant = 'standalone',
  showSurface,
  className,
  placeholder = '/를 입력하여 블록 추가',
  currentFilePath,
  isPreview = false,
  blockEditorRef,
  showToolbar = true,
}: ContentProps) {
  const isEmbedded = variant === 'embedded';
  const resolvedMaxWidth = maxWidth ?? (isEmbedded ? undefined : DOCUMENT_WIDTHS.portrait);
  const shouldShowSurface = showSurface ?? !isEmbedded;
  const fallbackEditorRef = React.useRef<BlockEditorRef>(null);
  const resolvedEditorRef = blockEditorRef ?? fallbackEditorRef;

  return (
    <div
      className={cn(
        isEmbedded ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1 min-h-0 flex justify-center overflow-hidden px-4',
        className
      )}
    >
      {/* 에디터 컨테이너 - 고정 너비 */}
      <div 
        className={cn(
          'h-full min-h-0 w-full overflow-hidden flex flex-col',
          shouldShowSurface && 'bg-white border border-gray-200 rounded-lg'
        )}
        style={resolvedMaxWidth ? { maxWidth: resolvedMaxWidth } : undefined}
      >
        <BlockEditor
          ref={resolvedEditorRef}
          content={markdownContent}
          onChange={onBlockEditorChange}
          onSave={onSave}
          editable={true}
          placeholder={placeholder}
          currentFilePath={currentFilePath}
          isPreview={isPreview}
          showToolbar={showToolbar}
          className="flex-1 min-h-0"
        />
      </div>
    </div>
  );
}
