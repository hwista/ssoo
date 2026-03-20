'use client';

import * as React from 'react';
import { buildDiffChunks } from '@/lib/utils/diffChunks';

export interface DiffTextInputProps {
  /** 현재 값 */
  value: string;
  /** 원본 값 (diff 비교 기준) */
  originalValue?: string;
  /** 값 변경 콜백 */
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** placeholder */
  placeholder?: string;
  /** 줄 수 */
  rows?: number;
  /** 추가 className (외곽 컨테이너) */
  className?: string;
  /** 세로 리사이즈 허용 */
  resizable?: boolean;
}

/**
 * 문자 수준 diff를 인라인으로 표시하는 textarea 컴포넌트.
 *
 * textarea 텍스트를 투명하게 하고 그 뒤에 diff 하이라이트를 렌더링하는
 * 오버레이 패턴을 사용합니다.
 */
export function DiffTextInput({
  value,
  originalValue,
  onChange,
  placeholder,
  rows = 3,
  className,
  resizable = false,
}: DiffTextInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const textareaClassName = `w-full rounded border border-ssoo-content-border bg-transparent px-2 py-1.5 text-xs leading-relaxed focus:border-ssoo-primary focus:outline-none ${resizable ? 'resize-y' : 'resize-none'}`;

  const handleScroll = React.useCallback(() => {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    if (ta && ov) {
      ov.scrollTop = ta.scrollTop;
      ov.scrollLeft = ta.scrollLeft;
    }
  }, []);

  const hasChanges = originalValue !== undefined && value !== originalValue;

  const diffChunks = React.useMemo(() => {
    if (!hasChanges || originalValue === undefined) return null;
    return buildDiffChunks(originalValue, value);
  }, [hasChanges, originalValue, value]);

  if (!diffChunks) {
    // 변경 없음 — 일반 textarea
    return (
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`${textareaClassName} text-ssoo-primary ${className ?? ''}`}
      />
    );
  }

  const hasBlockChunks = diffChunks.some((chunk) => chunk.kind === 'replace' && chunk.block);

  if (hasBlockChunks) {
    const blockChunks = diffChunks.filter((chunk): chunk is Extract<typeof chunk, { kind: 'replace' }> => chunk.kind === 'replace' && chunk.block);
    return (
      <div className={`space-y-2 ${className ?? ''}`}>
        <div className="space-y-2 rounded border border-ssoo-content-border/70 bg-ssoo-bg-secondary/40 p-2">
          {blockChunks.map((chunk, index) => (
            <div key={`${index}-${chunk.deleted.length}-${chunk.inserted.length}`} className="space-y-1.5">
              <div className="rounded-md border border-red-200/70 bg-red-50/60 px-2.5 py-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-red-700/70">이전</div>
                <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-500 line-through">
                  {chunk.deleted}
                </div>
              </div>
              <div className="rounded-md border border-ssoo-primary/15 bg-ssoo-primary/5 px-2.5 py-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ssoo-primary/70">변경 후</div>
                <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ssoo-primary">
                  {chunk.inserted}
                </div>
              </div>
            </div>
          ))}
        </div>
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={`${textareaClassName} text-ssoo-primary`}
        />
      </div>
    );
  }

  // 변경 있음 — diff overlay
  return (
    <div className={`relative ${className ?? ''}`}>
      {/* Diff overlay (뒤) */}
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded border border-transparent px-2 py-1.5 text-xs leading-relaxed whitespace-pre-wrap break-words"
      >
        {diffChunks.map((chunk, i) => {
          if (chunk.kind === 'equal') return <span key={i} className="text-ssoo-primary">{chunk.text}</span>;
          if (chunk.kind === 'insert') return <span key={i} className="text-ssoo-primary bg-destructive/10 rounded-sm">{chunk.text}</span>;
          if (chunk.kind === 'delete') return <span key={i} className="text-gray-400 line-through text-[0.9em] bg-destructive/10 rounded-sm">{chunk.text}</span>;
          return (
            <React.Fragment key={i}>
              <span className="text-gray-400 line-through text-[0.9em] bg-destructive/10 rounded-sm">{chunk.deleted}</span>
              <span className="text-ssoo-primary bg-destructive/10 rounded-sm">{chunk.inserted}</span>
            </React.Fragment>
          );
        })}
      </div>
      {/* Textarea (앞, 텍스트 투명) */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        placeholder={placeholder}
        rows={rows}
        className={`relative ${textareaClassName} text-transparent caret-ssoo-primary selection:bg-blue-200/50`}
      />
    </div>
  );
}
