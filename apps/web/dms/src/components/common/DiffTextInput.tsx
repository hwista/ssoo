'use client';

import * as React from 'react';
import diff from 'fast-diff';

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
  const hasChanges = originalValue !== undefined && value !== originalValue;

  const diffSegments = React.useMemo(() => {
    if (!hasChanges || originalValue === undefined) return null;
    return diff(originalValue, value);
  }, [hasChanges, originalValue, value]);

  if (!diffSegments) {
    // 변경 없음 — 일반 textarea
    return (
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full rounded border border-ssoo-content-border bg-transparent px-2 py-1.5 text-sm text-ssoo-primary leading-relaxed focus:border-ssoo-primary focus:outline-none ${resizable ? 'resize-y' : 'resize-none'} ${className ?? ''}`}
      />
    );
  }

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = React.useCallback(() => {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    if (ta && ov) {
      ov.scrollTop = ta.scrollTop;
      ov.scrollLeft = ta.scrollLeft;
    }
  }, []);

  // 변경 있음 — diff overlay
  return (
    <div className={`relative ${className ?? ''}`}>
      {/* Diff overlay (뒤) */}
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded border border-transparent px-2 py-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
      >
        {diffSegments.map(([op, text], i) => {
          if (op === diff.EQUAL) return <span key={i} className="text-ssoo-primary">{text}</span>;
          if (op === diff.INSERT) return <span key={i} className="text-ssoo-primary bg-destructive/10 rounded-sm">{text}</span>;
          if (op === diff.DELETE) return <span key={i} className="text-gray-400 line-through text-[0.9em] bg-destructive/10 rounded-sm">{text}</span>;
          return null;
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
        className={`relative w-full rounded border border-ssoo-content-border bg-transparent px-2 py-1.5 text-sm leading-relaxed text-transparent caret-ssoo-primary selection:bg-blue-200/50 focus:border-ssoo-primary focus:outline-none ${resizable ? 'resize-y' : 'resize-none'}`}
      />
    </div>
  );
}
