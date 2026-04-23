/**
 * 링크/이미지 경로 처리 공용 유틸리티
 *
 * 뷰어 본문, 사이드카, 에디터에서 공통으로 사용하는
 * 링크 분류·해석·이미지 경로 변환 함수를 모아 둔다.
 */

const EXTERNAL_URL_RE = /^(https?:|mailto:|tel:|#)/i;

/** URL이 외부 링크(http, mailto, tel, anchor)인지 판별 */
export function isExternalUrl(url: string): boolean {
  return EXTERNAL_URL_RE.test(url);
}

/** basePath 기준으로 상대 경로를 절대 경로로 해석 */
export function resolveRelativePath(basePath: string, relativePath: string): string {
  const baseParts = basePath.split('/').filter(Boolean);
  baseParts.pop();
  const relParts = relativePath.split('/').filter(Boolean);
  for (const part of relParts) {
    if (part === '.') continue;
    if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join('/');
}

/**
 * href를 내부 문서 경로로 해석.
 * 외부 URL·앵커 링크이면 null 반환.
 */
export function resolveDocPath(href: string, currentFilePath?: string | null): string | null {
  const rawHref = href.trim();
  if (!rawHref) return null;
  if (isExternalUrl(rawHref)) return null;

  const noQuery = rawHref.split('#')[0]?.split('?')[0] ?? rawHref;
  if (!noQuery) return null;

  if (noQuery.startsWith('/doc/')) {
    try {
      return decodeURIComponent(noQuery.slice('/doc/'.length));
    } catch {
      return noQuery.slice('/doc/'.length);
    }
  }

  if (noQuery.startsWith('/')) {
    return noQuery.slice(1);
  }

  // 상대 경로 (./,  ../) 또는 bare 경로 (goals.md 등) → 현재 파일 기준 해석
  if (currentFilePath) {
    return resolveRelativePath(currentFilePath, noQuery);
  }

  return noQuery;
}

/** 이미지 src를 렌더링 가능한 URL로 변환 (내부 경로 → same-origin binary route) */
export function resolveImageSrc(src: string): string {
  if (!src) return src;
  if (
    src.startsWith('blob:')
    || src.startsWith('http://')
    || src.startsWith('https://')
    || src.startsWith('data:')
    || src.startsWith('/api/')
  ) {
    return src;
  }
  return `/api/file/serve-attachment?path=${encodeURIComponent(src)}`;
}
