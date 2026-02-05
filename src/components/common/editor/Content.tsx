'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { BlockEditor, BlockEditorRef } from './BlockEditor';
import type { EditorMode } from './Editor';

/**
 * Content Props
 */
export interface ContentProps {
  /** 에디터 모드 */
  mode: EditorMode;
  /** HTML 콘텐츠 (BlockEditor용) */
  htmlContent: string;
  /** Markdown 콘텐츠 (textarea용) */
  markdownContent: string;
  /** BlockEditor 변경 핸들러 */
  onBlockEditorChange: (html: string) => void;
  /** Markdown 변경 핸들러 */
  onMarkdownChange: (markdown: string) => void;
  /** 저장 핸들러 (Ctrl+S) */
  onSave?: () => void;
  /** 문서 최대 너비 */
  maxWidth?: number;
  /** 추가 className */
  className?: string;
}

/**
 * Editor Content 컴포넌트
 * 
 * 에디터 본문 영역
 * - Block 모드: Tiptap BlockEditor
 * - Markdown 모드: textarea
 */
export function Content({
  mode,
  htmlContent,
  markdownContent,
  onBlockEditorChange,
  onMarkdownChange,
  onSave,
  maxWidth = 975,
  className,
}: ContentProps) {
  const blockEditorRef = React.useRef<BlockEditorRef>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // 모드 전환 시 포커스
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === 'block') {
        blockEditorRef.current?.focus();
      } else {
        textareaRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [mode]);

  return (
    <div className={cn('flex-1 flex justify-center overflow-hidden px-4', className)}>
      {/* 에디터 컨테이너 - 고정 너비 */}
      <div 
        className={cn(
          'h-full w-full',
          'bg-white border border-gray-200 rounded-lg',
          'overflow-hidden flex flex-col'
        )}
        style={{ maxWidth }}
      >
        {mode === 'block' ? (
          /* Block Editor */
          <BlockEditor
            ref={blockEditorRef}
            content={htmlContent}
            onChange={onBlockEditorChange}
            onSave={onSave}
            editable={true}
            placeholder="/를 입력하여 블록 추가"
            className="flex-1"
          />
        ) : (
          /* Markdown Editor */
          <textarea
            ref={textareaRef}
            value={markdownContent}
            onChange={(e) => onMarkdownChange(e.target.value)}
            className={cn(
              'flex-1 w-full p-6',
              'font-mono text-sm leading-relaxed',
              'border-0 outline-none resize-none',
              'bg-white text-gray-800',
              'placeholder:text-gray-400'
            )}
            placeholder="마크다운 내용을 입력하세요..."
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
