'use client';

function ensureFileExtension(filename: string, extension: string): string {
  return filename.endsWith(extension) ? filename : `${filename}${extension}`;
}

export function downloadAsFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(content: string, filename: string): void {
  downloadAsFile(content, ensureFileExtension(filename, '.md'), 'text/markdown;charset=utf-8');
}

export function printHtmlContent(htmlContent: string, title: string): void {
  const printWindow = window.open('', '_blank', 'width=960,height=720');
  if (!printWindow) return;

  const safeTitle = title || '문서';
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        color: #172554;
        font-family: "Pretendard", "Noto Sans KR", sans-serif;
        background: #fff;
      }
      article {
        max-width: 960px;
        margin: 0 auto;
        line-height: 1.7;
        word-break: break-word;
      }
      h1, h2, h3, h4, h5, h6 {
        margin: 1.25em 0 0.5em;
        line-height: 1.25;
      }
      p, ul, ol, blockquote, pre, table {
        margin: 0.75em 0;
      }
      pre, code {
        font-family: "JetBrains Mono", "Fira Code", monospace;
      }
      pre {
        white-space: pre-wrap;
        border: 1px solid #dbe4f0;
        border-radius: 8px;
        background: #f8fafc;
        padding: 12px 16px;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #dbe4f0;
        padding: 8px 10px;
        text-align: left;
      }
      blockquote {
        margin-left: 0;
        padding-left: 16px;
        border-left: 3px solid #cbd5e1;
        color: #475569;
      }
      @media print {
        body {
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <article>${htmlContent}</article>
  </body>
</html>`);
  printWindow.document.close();

  const invokePrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (printWindow.document.readyState === 'complete') {
    invokePrint();
  } else {
    printWindow.addEventListener('load', invokePrint, { once: true });
  }
}
