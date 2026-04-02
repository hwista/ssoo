'use client';

import * as React from 'react';

interface UseAutoScrollOptions {
  scrollRef: React.RefObject<HTMLElement | null>;
  active: boolean;
  threshold?: number;
}

interface UseAutoScrollReturn {
  scrollToBottomIfNeeded: () => void;
}

export function useAutoScroll({
  scrollRef,
  active,
  threshold = 60,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const isNearBottomRef = React.useRef(true);
  const rafIdRef = React.useRef<number>(0);

  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element || !active) return;

    const syncNearBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < threshold;
    };

    syncNearBottom();
    element.addEventListener('scroll', syncNearBottom, { passive: true });
    return () => element.removeEventListener('scroll', syncNearBottom);
  }, [active, scrollRef, threshold]);

  const scrollToBottomIfNeeded = React.useCallback(() => {
    if (!active || !isNearBottomRef.current) return;

    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = window.requestAnimationFrame(() => {
      const element = scrollRef.current;
      if (!element) return;
      element.scrollTop = element.scrollHeight;
    });
  }, [active, scrollRef]);

  React.useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  return { scrollToBottomIfNeeded };
}
