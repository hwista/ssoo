import { Marked, type Renderer } from 'marked';

function createHeadingRenderer(): Partial<Renderer> {
  let headingCounter = 0;

  return {
    heading({ tokens, depth }): string {
      const text = tokens.map((token) => ('text' in token ? token.text : '')).join('');
      const id = `heading-${headingCounter++}`;
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },
  };
}

export function markdownToHtmlSync(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return '';
  }

  try {
    const renderer = createHeadingRenderer();
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
