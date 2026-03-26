import { useState, useEffect, useRef } from 'react';
import { extractMarkdownLinks } from '@/lib/utils';
import type { BodyLink } from '@/lib/utils';

const DEBOUNCE_MS = 300;

/**
 * 마크다운 콘텐츠에서 URL을 추출하는 훅 (debounce 적용)
 *
 * @param content 마크다운 텍스트
 * @returns 추출된 BodyLink 배열
 */
export function useBodyLinks(content: string): BodyLink[] {
  const [bodyLinks, setBodyLinks] = useState<BodyLink[]>(() =>
    extractMarkdownLinks(content),
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setBodyLinks(extractMarkdownLinks(content));
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content]);

  return bodyLinks;
}
