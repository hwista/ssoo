import TurndownService from 'turndown';
import { marked } from 'marked';

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
 */
export function markdownToHtmlSync(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return '';
  }

  try {
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
