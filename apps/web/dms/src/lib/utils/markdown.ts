import { Marked, type Renderer } from 'marked';
import { resolveImageSrc } from './linkUtils';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
    code({ text, lang }): string {
      if (lang === 'mermaid') {
        return `<div class="mermaid-diagram">${escapeHtml(text)}</div>\n`;
      }
      const langClass = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langClass}>${escapeHtml(text)}</code></pre>\n`;
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
