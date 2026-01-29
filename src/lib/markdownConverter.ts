import TurndownService from 'turndown';
import { marked, Renderer } from 'marked';

/**
 * 텍스트를 slug로 변환 (URL-safe ID 생성)
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣-]/g, '') // 특수문자 제거 (한글, 영문, 숫자, 공백, 하이픈만 유지)
    .replace(/\s+/g, '-') // 공백을 하이픈으로
    .replace(/-+/g, '-') // 중복 하이픈 제거
    .replace(/^-|-$/g, ''); // 앞뒤 하이픈 제거
}

// 헤딩 인덱스 추적 (중복 id 방지)
let headingCounter = 0;

/**
 * 커스텀 renderer - 헤딩에 id 부여
 */
function createCustomRenderer(): Partial<Renderer> {
  return {
    heading({ tokens, depth }): string {
      const text = tokens.map(t => ('text' in t ? t.text : '')).join('');
      const id = `heading-${headingCounter++}`;
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },
  };
}

// HTML을 Markdown으로 변환
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Task list 지원 추가
turndownService.addRule('taskListItem', {
  filter: (node) => {
    return (
      node.nodeName === 'LI' &&
      node.parentNode?.nodeName === 'UL' &&
      (node.parentNode as HTMLElement).getAttribute('data-type') === 'taskList'
    );
  },
  replacement: (content, node) => {
    const checkbox = (node as HTMLElement).querySelector('input[type="checkbox"]');
    const checked = checkbox?.hasAttribute('checked') ? 'x' : ' ';
    return `- [${checked}] ${content.trim()}\n`;
  },
});

// 테이블 지원 개선
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (content, node) {
    const table = node as HTMLTableElement;
    const rows = Array.from(table.querySelectorAll('tr'));

    if (rows.length === 0) return content;

    let markdown = '\n';

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const cellContents = cells.map(cell => cell.textContent?.trim() || '');

      markdown += '| ' + cellContents.join(' | ') + ' |\n';

      // 첫 번째 행 후에 구분선 추가
      if (rowIndex === 0) {
        markdown += '| ' + cellContents.map(() => '---').join(' | ') + ' |\n';
      }
    });

    return markdown + '\n';
  },
});

// 하이라이트 지원
turndownService.addRule('highlight', {
  filter: 'mark',
  replacement: function (content) {
    return `==${content}==`;
  },
});

/**
 * HTML을 Markdown으로 변환
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '' || html === '<p></p>') {
    return '';
  }

  try {
    const markdown = turndownService.turndown(html);
    return markdown;
  } catch (error) {
    console.error('HTML to Markdown 변환 실패:', error);
    return html;
  }
}

/**
 * Markdown을 HTML로 변환
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown || markdown.trim() === '') {
    return '';
  }

  try {
    // marked 설정
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // 줄바꿈을 <br>로 변환
    });

    const html = await marked(markdown);
    return html;
  } catch (error) {
    console.error('Markdown to HTML 변환 실패:', error);
    return `<p>${markdown}</p>`;
  }
}

/**
 * 동기 방식으로 Markdown을 HTML로 변환
 * 헤딩에 자동으로 id 부여 (heading-0, heading-1, ...)
 */
export function markdownToHtmlSync(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return '';
  }

  try {
    // 헤딩 카운터 리셋
    headingCounter = 0;
    
    // 커스텀 renderer 설정
    marked.use({
      renderer: createCustomRenderer(),
    });
    
    marked.setOptions({
      gfm: true,
      breaks: true,
    });

    const html = marked.parse(markdown, { async: false }) as string;
    return html;
  } catch (error) {
    console.error('Markdown to HTML 변환 실패:', error);
    return `<p>${markdown}</p>`;
  }
}
