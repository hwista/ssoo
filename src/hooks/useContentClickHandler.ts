'use client';

import { useEffect } from 'react';

export interface ContentClickHandlerOptions {
  /** <a> 클릭 시 호출. href를 전달한다. */
  onLinkClick?: (href: string) => void;
  /** <img> 클릭 시 호출. src(원본 경로 우선)와 alt를 전달한다. */
  onImageClick?: (src: string, alt: string) => void;
}

/**
 * dangerouslySetInnerHTML로 렌더링된 HTML 콘텐츠 안의
 * `<a>` / `<img>` 클릭을 이벤트 위임으로 가로채는 훅.
 *
 * - `<a>` 클릭 → `preventDefault` + `onLinkClick(href)`
 * - `<img>` 클릭 → `onImageClick(originalSrc, alt)`
 */
export function useContentClickHandler(
  containerRef: React.RefObject<HTMLElement | null>,
  options: ContentClickHandlerOptions,
) {
  const { onLinkClick, onImageClick } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;

      // 이미지 클릭 (이미지가 <a> 안에 있을 수도 있으므로 먼저 검사)
      if (target.tagName === 'IMG' && onImageClick) {
        const img = target as HTMLImageElement;
        const originalSrc = img.getAttribute('data-original-src') || img.src;
        onImageClick(originalSrc, img.alt || '이미지');
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 링크 클릭 (target 자체 또는 부모가 <a>)
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (anchor && onLinkClick) {
        const href = anchor.getAttribute('href');
        if (href) {
          e.preventDefault();
          onLinkClick(href);
        }
      }
    }

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [containerRef, onLinkClick, onImageClick]);
}
