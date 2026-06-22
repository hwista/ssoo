import {
  Marked,
  type RendererObject,
  type Token,
  type TokenizerAndRendererExtension,
} from 'marked';
import DOMPurify from 'dompurify';
import { resolveImageSrc } from './linkUtils';

export interface MarkdownRenderOptions {
  interactiveTaskCheckboxes?: boolean;
}

type HighlightToken = Token & {
  type: 'highlight';
  raw: string;
  text: string;
  tokens: Token[];
};

const HIGHLIGHT_PATTERN = /^==(?![=\s])([\s\S]*?\S)==(?![=])/;
const CODE_FENCE_PATTERN = /^\s*(`{3,}|~{3,})/;
const TASK_CHECKBOX_PATTERN = /^(\s*)([-+*]|\d+\.)(\s+)\[( |x|X)\](.*)$/;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeMarkdownHtml(html: string): string {
  const sanitized = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['base', 'embed', 'form', 'iframe', 'object', 'script', 'style'],
    ADD_ATTR: ['data-original-src', 'data-search-index', 'data-task-index'],
  });

  if (typeof DOMParser === 'undefined') {
    return sanitized;
  }

  const parsed = new DOMParser().parseFromString(sanitized, 'text/html');
  parsed.body.querySelectorAll<HTMLElement>('[href]').forEach((element) => {
    const href = element.getAttribute('href')?.trim();
    if (!href) {
      element.removeAttribute('href');
      return;
    }
    if (href.startsWith('//')) {
      element.setAttribute('href', `https:${href}`);
      return;
    }
    if (
      href.startsWith('#')
      || href.startsWith('/')
      || href.startsWith('./')
      || href.startsWith('../')
    ) {
      return;
    }

    try {
      const url = new URL(href);
      if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
        element.setAttribute('href', url.toString());
        return;
      }
    } catch {
      // Invalid URLs are stripped below.
    }

    element.removeAttribute('href');
  });

  parsed.body.querySelectorAll<HTMLElement>('[src]').forEach((element) => {
    const src = element.getAttribute('src')?.trim();
    if (!src) {
      element.removeAttribute('src');
      return;
    }
    if (src.startsWith('/') && !src.startsWith('//')) {
      return;
    }
    if (src.startsWith('//')) {
      element.setAttribute('src', `https:${src}`);
      return;
    }

    try {
      const url = new URL(src);
      if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'blob:') {
        element.setAttribute('src', url.toString());
        return;
      }
    } catch {
      // Invalid URLs are stripped below.
    }

    element.removeAttribute('src');
  });

  return parsed.body.innerHTML;
}

function createHighlightExtension(): TokenizerAndRendererExtension<string, string> {
  return {
    name: 'highlight',
    level: 'inline',
    start(src) {
      return src.indexOf('==');
    },
    tokenizer(src) {
      const match = HIGHLIGHT_PATTERN.exec(src);
      if (!match) {
        return undefined;
      }

      const text = match[1];
      return {
        type: 'highlight',
        raw: match[0],
        text,
        tokens: this.lexer.inlineTokens(text),
      };
    },
    renderer(token) {
      const highlightToken = token as HighlightToken;
      return `<mark class="md-highlight">${this.parser.parseInline(highlightToken.tokens)}</mark>`;
    },
    childTokens: ['tokens'],
  };
}

function buildInlineSource(tokens: Token[]): string {
  return tokens.map((token) => token.raw ?? '').join('');
}

function createCustomRenderer(
  inlineParser: Marked<string, string>,
  options: MarkdownRenderOptions,
): RendererObject<string, string> {
  let headingCounter = 0;
  let taskIndex = 0;

  return {
    heading({ tokens, depth }): string {
      const text = buildInlineSource(tokens);
      const id = `heading-${headingCounter++}`;
      const inlineHtml = text
        ? inlineParser.parseInline(text, { async: false }) as string
        : '';
      return `<h${depth} id="${id}">${inlineHtml}</h${depth}>\n`;
    },
    checkbox({ checked }): string {
      const checkedAttr = checked ? ' checked=""' : '';
      const interactiveAttr = options.interactiveTaskCheckboxes
        ? ` data-task-index="${taskIndex}"`
        : ' disabled=""';
      taskIndex += 1;
      return `<input${checkedAttr}${interactiveAttr} type="checkbox"> `;
    },
    image({ href, title, text }): string {
      const resolvedSrc = resolveImageSrc(href);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      // data-original-src: 원본 경로 보존 (본문 이미지 검색용)
      return `<img src="${escapeHtml(resolvedSrc)}" alt="${escapeHtml(text || '')}" data-original-src="${escapeHtml(href)}"${titleAttr} />`;
    },
    code({ text, lang }): string {
      if (lang === 'mermaid') {
        return `<div class="mermaid-diagram">${escapeHtml(text)}</div>\n`;
      }
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      return `<pre><code${langClass}>${escapeHtml(text)}</code></pre>\n`;
    },
  };
}

function toggleCodeFence(
  currentFence: string | null,
  line: string,
): string | null {
  const match = CODE_FENCE_PATTERN.exec(line);
  if (!match) {
    return currentFence;
  }

  const marker = match[1];
  if (!currentFence) {
    return marker;
  }

  if (marker[0] === currentFence[0] && marker.length >= currentFence.length) {
    return null;
  }

  return currentFence;
}

export function markdownToHtmlSync(markdown: string, options: MarkdownRenderOptions = {}): string {
  if (!markdown || markdown.trim() === '') {
    return '';
  }

  try {
    const parser = new Marked({
      gfm: true,
      breaks: true,
    });
    parser.use({
      renderer: createCustomRenderer(parser, options),
      extensions: [createHighlightExtension()],
    });
    return sanitizeMarkdownHtml(parser.parse(markdown, { async: false }) as string);
  } catch (error) {
    console.error('Markdown to HTML 변환 실패:', error);
    return `<p>${escapeHtml(markdown)}</p>`;
  }
}

export function toggleMarkdownTaskCheckbox(markdown: string, taskIndex: number): string | null {
  if (taskIndex < 0) {
    return null;
  }

  const lines = markdown.split('\n');
  let activeFence: string | null = null;
  let currentTaskIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextFence = toggleCodeFence(activeFence, line);

    if (activeFence) {
      activeFence = nextFence;
      continue;
    }

    if (nextFence) {
      activeFence = nextFence;
      continue;
    }

    const taskMatch = TASK_CHECKBOX_PATTERN.exec(line);
    if (!taskMatch) {
      continue;
    }

    if (currentTaskIndex === taskIndex) {
      const [, indent, marker, spacing, checkedState, rest] = taskMatch;
      const nextCheckedState = checkedState.toLowerCase() === 'x' ? ' ' : 'x';
      lines[index] = `${indent}${marker}${spacing}[${nextCheckedState}]${rest}`;
      return lines.join('\n');
    }

    currentTaskIndex += 1;
  }

  return null;
}
