/**
 * 링크/이미지 경로 처리 공용 유틸리티
 *
 * 뷰어 본문, 사이드카, 에디터에서 공통으로 사용하는
 * 링크 분류·해석·이미지 경로 변환 함수를 모아 둔다.
 */

const ABSOLUTE_SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;
const DOMAIN_LIKE_URL_RE = /^(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;
const ALLOWED_EXTERNAL_HREF_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const ALLOWED_IMAGE_SRC_PROTOCOLS = new Set(['http:', 'https:', 'blob:']);

function stripQueryAndHash(value: string): string {
  return value.split('#')[0]?.split('?')[0] ?? value;
}

function isMarkdownDocumentHref(value: string): boolean {
  const pathOnly = stripQueryAndHash(value.trim());
  return /\.md$/i.test(pathOnly);
}

function isDomainLikeHref(value: string): boolean {
  const rawValue = value.trim();
  const lowerValue = rawValue.toLowerCase();
  const pathOnly = stripQueryAndHash(rawValue);
  if (
    /\.md$/i.test(pathOnly)
    && !pathOnly.includes('/')
    && !lowerValue.startsWith('www.')
  ) {
    return false;
  }

  return DOMAIN_LIKE_URL_RE.test(rawValue);
}

/** URL이 외부 링크인지 판별 */
export function isExternalUrl(url: string): boolean {
  const rawUrl = url.trim();
  if (!rawUrl) return false;
  if (rawUrl.startsWith('#')) return true;
  if (rawUrl.startsWith('//')) return true;
  if (ABSOLUTE_SCHEME_RE.test(rawUrl)) return true;
  if (rawUrl.startsWith('/') || rawUrl.startsWith('./') || rawUrl.startsWith('../')) return false;
  if (isDomainLikeHref(rawUrl)) return true;
  if (isMarkdownDocumentHref(rawUrl)) return false;
  return false;
}

/** 브라우저에서 열 수 있는 외부 href로 정규화한다. 내부 문서/앵커이면 null. */
export function resolveExternalHref(href: string): string | null {
  const rawHref = href.trim();
  if (!rawHref || rawHref.startsWith('#')) return null;
  if (rawHref.startsWith('//')) return `https:${rawHref}`;
  if (ABSOLUTE_SCHEME_RE.test(rawHref)) {
    try {
      const url = new URL(rawHref);
      return ALLOWED_EXTERNAL_HREF_PROTOCOLS.has(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }
  if (rawHref.startsWith('/') || rawHref.startsWith('./') || rawHref.startsWith('../')) return null;
  if (isDomainLikeHref(rawHref)) return `https://${rawHref}`;
  if (isMarkdownDocumentHref(rawHref)) return null;
  return null;
}

export function normalizeDocumentPath(pathValue: string): string {
  if (!pathValue) return '';

  return pathValue
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

export function joinDocumentPath(directory: string, fileName: string): string {
  const normalizedDirectory = normalizeDocumentPath(directory);
  const normalizedFileName = normalizeDocumentPath(fileName);

  if (!normalizedFileName) {
    return normalizedDirectory;
  }

  return normalizedDirectory
    ? `${normalizedDirectory}/${normalizedFileName}`
    : normalizedFileName;
}

/** basePath 기준으로 상대 경로를 절대 경로로 해석 */
export function resolveRelativePath(basePath: string, relativePath: string): string {
  const baseParts = normalizeDocumentPath(basePath).split('/').filter(Boolean);
  baseParts.pop();
  const relParts = normalizeDocumentPath(relativePath).split('/').filter(Boolean);
  for (const part of relParts) {
    if (part === '.') continue;
    if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }
  return normalizeDocumentPath(baseParts.join('/'));
}

/**
 * href를 내부 문서 경로로 해석.
 * 외부 URL·앵커 링크이면 null 반환.
 */
export function resolveDocPath(href: string, currentFilePath?: string | null): string | null {
  const rawHref = href.trim();
  if (!rawHref) return null;
  if (isExternalUrl(rawHref)) return null;

  const noQuery = stripQueryAndHash(rawHref);
  if (!noQuery) return null;

  if (noQuery.startsWith('/doc/')) {
    try {
      return normalizeDocumentPath(decodeURIComponent(noQuery.slice('/doc/'.length)));
    } catch {
      return normalizeDocumentPath(noQuery.slice('/doc/'.length));
    }
  }

  if (noQuery.startsWith('/')) {
    return normalizeDocumentPath(noQuery);
  }

  // 상대 경로 (./,  ../) 또는 bare 경로 (goals.md 등) → 현재 파일 기준 해석
  if (currentFilePath) {
    return resolveRelativePath(currentFilePath, noQuery);
  }

  return normalizeDocumentPath(noQuery);
}

/** 이미지 src를 렌더링 가능한 URL로 변환 (내부 경로 → same-origin binary route) */
export function resolveImageSrc(src: string): string {
  if (!src) return src;
  const trimmedSrc = src.trim();
  if (trimmedSrc.startsWith('/api/')) {
    return src;
  }
  if (trimmedSrc.startsWith('//')) {
    return `https:${trimmedSrc}`;
  }
  if (ABSOLUTE_SCHEME_RE.test(trimmedSrc)) {
    try {
      const url = new URL(trimmedSrc);
      return ALLOWED_IMAGE_SRC_PROTOCOLS.has(url.protocol) ? url.toString() : '';
    } catch {
      return '';
    }
  }

  const normalizedSrc = normalizeDocumentPath(trimmedSrc);
  return `/api/file/serve-attachment?path=${encodeURIComponent(normalizedSrc)}`;
}
