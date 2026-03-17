import { Marked, type Renderer } from 'marked';

function resolveImageSrc(src: string): string {
  if (!src) return src;
  if (src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  return `/api/file/raw?path=${encodeURIComponent(src)}`;
}

function createCustomRenderer(): Partial<Renderer> {
  let headingCounter = 0;

  return {
    heading({ tokens, depth }): string {
      const text = tokens.map((token) => ('text' in token ? token.text : '')).join('');
      const id = `heading-${headingCounter++}`;
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },
    image({ href, title, text }): string {
      const resolvedSrc = resolveImageSrc(href);
      const titleAttr = title ? ` title="${title}"` : '';
      // data-original-src: 원본 경로 보존 (본문 이미지 검색용)
      return `<img src="${resolvedSrc}" alt="${text || ''}" data-original-src="${href}"${titleAttr} />`;
    },
  };
}

export function markdownToHtmlSync(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return '';
  }

  try {
    const renderer = createCustomRenderer();
    const parser = new Marked({
      gfm: true,
      breaks: true,
    });
    parser.use({ renderer });
    return parser.parse(markdown, { async: false }) as string;
  } catch (error) {
    console.error('Markdown to HTML 변환 실패:', error);
    return `<p>${markdown}</p>`;
  }
}
