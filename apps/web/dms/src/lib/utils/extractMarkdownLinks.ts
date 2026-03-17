/**
 * 마크다운 콘텐츠에서 URL을 추출하는 유틸리티
 *
 * 추출 대상:
 * - 마크다운 링크: [text](url)
 * - 이미지 링크: ![alt](url)
 * - bare URL: https://... 또는 http://...
 *
 * 제외 대상:
 * - 코드 블록 내부 (fenced ```, inline `)
 * - 앵커 전용 링크: [text](#anchor)
 */

export interface BodyLink {
  url: string;
  label: string;
  /** 'link' = 일반 링크, 'image' = 이미지 링크 */
  type: 'link' | 'image';
}

const FENCED_CODE_BLOCK = /^```[\s\S]*?^```/gm;
const INLINE_CODE = /`[^`\n]+`/g;

const IMAGE_LINK = /!\[([^\]]*)\]\(([^)]+)\)/g;
const MARKDOWN_LINK = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;

const BARE_URL = /(?<!\]\()https?:\/\/[^\s)<>\]"']+/g;

export function extractMarkdownLinks(markdown: string): BodyLink[] {
  if (!markdown) return [];

  // 1. 코드 블록 제거
  let cleaned = markdown.replace(FENCED_CODE_BLOCK, '');
  cleaned = cleaned.replace(INLINE_CODE, '');

  const seen = new Set<string>();
  const links: BodyLink[] = [];

  // 2. 이미지 링크 추출
  for (const match of cleaned.matchAll(IMAGE_LINK)) {
    const label = match[1].trim();
    const url = match[2].trim();
    if (url && !url.startsWith('#') && !seen.has(url)) {
      seen.add(url);
      links.push({ url, label: label || url, type: 'image' });
    }
  }

  // 3. 마크다운 링크에서 URL + 라벨 추출 (이미지 제외)
  for (const match of cleaned.matchAll(MARKDOWN_LINK)) {
    const label = match[1].trim();
    const url = match[2].trim();
    if (url && !url.startsWith('#') && !seen.has(url)) {
      seen.add(url);
      links.push({ url, label: label || url, type: 'link' });
    }
  }

  // 4. bare URL 추출 (이미 캡처된 건 제외)
  for (const match of cleaned.matchAll(BARE_URL)) {
    const url = match[0];
    if (!seen.has(url)) {
      seen.add(url);
      links.push({ url, label: url, type: 'link' });
    }
  }

  return links;
}
