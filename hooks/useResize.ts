import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useResize
 * 수평 패널 리사이즈를 간단히 관리하기 위한 커스텀 훅.
 * (초기 버전) - horizontal only, 추후 direction/snapPoints/onChange 옵션 확장 예정
 */
export interface UseResizeOptions {
  initial: number;
  min?: number;
  max?: number;
  direction?: 'horizontal' | 'vertical';
  onChange?: (size: number) => void;
  onCommit?: (size: number) => void;
}

export interface UseResizeReturn {
  size: number;
  isResizing: boolean;
  /** 리사이저 요소에 바인딩할 props */
  resizerProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    role: string;
    'aria-label': string;
    'aria-valuenow': number;
    'aria-valuemin': number;
    'aria-valuemax': number;
    tabIndex: number;
  };
  /** 수동으로 크기 설정(예: 프리셋 버튼) */
  setSize: (size: number) => void;
}

export function useResize({
                            initial,
                            min = 200,
                            max = 600,
                            direction = 'horizontal',
                            onChange,
                            onCommit,
                          }: UseResizeOptions): UseResizeReturn {
  const [size, setSizeState] = useState(initial);
  const [isResizing, setIsResizing] = useState(false);
  const frameRef = useRef<number | null>(null);
  const latestSizeRef = useRef(size);

  // 외부에서 호출 가능한 size setter (범위 클램프 포함)
  const setSize = useCallback((next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    latestSizeRef.current = clamped;
    setSizeState(clamped);
    onChange?.(clamped);
  }, [min, max, onChange]);

  // 마우스 move 핸들러 (window 레벨)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    frameRef.current = requestAnimationFrame(() => {
      if (direction === 'horizontal') {
        setSize(e.clientX);
      } else {
        setSizeState(prevSize => {
          const newSize = prevSize + e.movementY;
          return Math.min(max, Math.max(min, newSize));
        });
      }
    });
  }, [isResizing, direction, min, max]);

  const endResize = useCallback(() => {
    if (!isResizing) return;
    setIsResizing(false);
    onCommit?.(latestSizeRef.current);
  }, [isResizing, onCommit]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // window 이벤트 등록/해제
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', endResize);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', endResize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isResizing, handleMouseMove, endResize]);

  // 접근성: 키보드 지원 (좌우/상하 화살표)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!document.activeElement || (document.activeElement as HTMLElement).getAttribute('data-resizer') !== 'true') return;

    const move = (delta: number) => {
      e.preventDefault();
      setSize(latestSizeRef.current + delta);
    };

    if (direction === 'horizontal') {
      if (e.key === 'ArrowLeft') move(-10);
      else if (e.key === 'ArrowRight') move(10);
    } else { // vertical
      if (e.key === 'ArrowUp') move(-10);
      else if (e.key === 'ArrowDown') move(10);
    }
  }, [setSize, direction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resizerProps = {
    onMouseDown: handleMouseDown,
    role: 'separator',
    'aria-label': 'Resize sidebar',
    'aria-valuenow': size,
    'aria-valuemin': min,
    'aria-valuemax': max,
    tabIndex: 0,
    'data-resizer': 'true'
  } as const;

  return { size, isResizing, resizerProps, setSize };
}

export default useResize;
