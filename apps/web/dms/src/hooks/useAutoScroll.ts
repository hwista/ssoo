'use client';

import * as React from 'react';

interface UseAutoScrollOptions<TElement extends HTMLElement = HTMLElement> {
  scrollRef: React.RefObject<TElement | null>;
  active?: boolean;
  threshold?: number;
  behavior?: ScrollBehavior;
}

interface ScrollToBottomOptions {
  behavior?: ScrollBehavior;
  force?: boolean;
}

interface UseAutoScrollReturn {
  isAtBottom: boolean;
  showScrollToBottom: boolean;
  scrollToBottom: (options?: ScrollToBottomOptions) => void;
  scrollToBottomIfNeeded: (options?: Omit<ScrollToBottomOptions, 'force'>) => void;
}

export function useAutoScroll<TElement extends HTMLElement = HTMLElement>({
  scrollRef,
  active = true,
  threshold = 60,
  behavior = 'auto',
}: UseAutoScrollOptions<TElement>): UseAutoScrollReturn {
  const isNearBottomRef = React.useRef(true);
  const rafIdRef = React.useRef<number>(0);
  const [isAtBottom, setIsAtBottom] = React.useState(true);

  const syncNearBottom = React.useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      isNearBottomRef.current = true;
      setIsAtBottom(true);
      return true;
    }

    const { scrollTop, scrollHeight, clientHeight } = element;
    const nextIsNearBottom = scrollHeight - scrollTop - clientHeight <= threshold;
    isNearBottomRef.current = nextIsNearBottom;
    setIsAtBottom(nextIsNearBottom);
    return nextIsNearBottom;
  }, [scrollRef, threshold]);

  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element || !active) {
      isNearBottomRef.current = true;
      setIsAtBottom(true);
      return;
    }

    syncNearBottom();
    element.addEventListener('scroll', syncNearBottom, { passive: true });
    return () => element.removeEventListener('scroll', syncNearBottom);
  }, [active, scrollRef, syncNearBottom]);

  const scrollToBottom = React.useCallback((options?: ScrollToBottomOptions) => {
    if (!active && !options?.force) return;

    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = window.requestAnimationFrame(() => {
      const element = scrollRef.current;
      if (!element) return;

      element.scrollTo({
        top: element.scrollHeight,
        behavior: options?.behavior ?? behavior,
      });
      isNearBottomRef.current = true;
      setIsAtBottom(true);
    });
  }, [active, behavior, scrollRef]);

  const scrollToBottomIfNeeded = React.useCallback((options?: Omit<ScrollToBottomOptions, 'force'>) => {
    if (!active || !isNearBottomRef.current) return;
    scrollToBottom({ ...options, force: true });
  }, [active, scrollToBottom]);

  React.useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  return {
    isAtBottom,
    showScrollToBottom: active && !isAtBottom,
    scrollToBottom,
    scrollToBottomIfNeeded,
  };
}
