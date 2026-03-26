'use client';

import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { ToolbarCommandId } from '../Toolbar';

interface LineRange {
  from: number;
  to: number;
}

interface ApplyEditorCommandOptions {
  view: EditorView;
  id: ToolbarCommandId;
  selection: {
    from: number;
    to: number;
  };
  slashLine?: LineRange | null;
  requestImageUrl: () => Promise<string | null>;
  requestLinkUrl: () => Promise<string | null>;
}

function stripLinePrefix(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/^- \[(?: |x)\]\s+/, '')
    .replace(/^>\s+/, '');
}

function applyWrappedSelection(params: {
  state: EditorState;
  view: EditorView;
  from: number;
  to: number;
  prefix: string;
  suffix?: string;
}) {
  const selection = params.state.doc.sliceString(params.from, params.to);
  const suffix = params.suffix ?? params.prefix;

  params.view.dispatch({
    changes: { from: params.from, to: params.to, insert: `${params.prefix}${selection}${suffix}` },
    selection: {
      anchor: params.from + params.prefix.length,
      head: params.from + params.prefix.length + selection.length,
    },
  });
}

// 공용 유틸리티에서 re-export (에디터 외부에서도 사용)
export { resolveRelativePath, resolveDocPath } from '@/lib/utils/linkUtils';

export async function applyEditorCommand({
  view,
  id,
  selection,
  slashLine,
  requestImageUrl,
  requestLinkUrl,
}: ApplyEditorCommandOptions) {
  const state = view.state;
  const insertFrom = slashLine ? slashLine.from : selection.from;
  const insertTo = slashLine ? slashLine.to : selection.to;

  if (id === 'bold') {
    applyWrappedSelection({ state, view, from: insertFrom, to: insertTo, prefix: '**' });
    return true;
  }

  if (id === 'italic') {
    applyWrappedSelection({ state, view, from: insertFrom, to: insertTo, prefix: '*' });
    return true;
  }

  if (id === 'strike') {
    applyWrappedSelection({ state, view, from: insertFrom, to: insertTo, prefix: '~~' });
    return true;
  }

  if (id === 'inlineCode') {
    applyWrappedSelection({ state, view, from: insertFrom, to: insertTo, prefix: '`' });
    return true;
  }

  if (id === 'highlight') {
    applyWrappedSelection({ state, view, from: insertFrom, to: insertTo, prefix: '==' });
    return true;
  }

  if (
    id === 'h1' ||
    id === 'h2' ||
    id === 'h3' ||
    id === 'ul' ||
    id === 'ol' ||
    id === 'task' ||
    id === 'quote'
  ) {
    const prefix: Record<string, string> = {
      h1: '# ',
      h2: '## ',
      h3: '### ',
      ul: '- ',
      ol: '1. ',
      task: '- [ ] ',
      quote: '> ',
    };
    const linePrefix = prefix[id] ?? '';

    if (slashLine) {
      view.dispatch({
        changes: { from: slashLine.from, to: slashLine.to, insert: linePrefix },
        selection: { anchor: slashLine.from + linePrefix.length },
      });
      return true;
    }

    const firstLine = state.doc.lineAt(selection.from);
    const lastLine = state.doc.lineAt(selection.to === selection.from ? selection.from : selection.to - 1);
    const changes: { from: number; to: number; insert: string }[] = [];

    for (let lineNumber = firstLine.number; lineNumber <= lastLine.number; lineNumber += 1) {
      const line = state.doc.line(lineNumber);
      changes.push({
        from: line.from,
        to: line.to,
        insert: `${linePrefix}${stripLinePrefix(line.text)}`,
      });
    }

    view.dispatch({ changes });
    return true;
  }

  if (id === 'hr') {
    const from = slashLine ? slashLine.from : selection.from;
    const to = slashLine ? slashLine.to : selection.from;
    view.dispatch({
      changes: { from, to, insert: '---\n' },
      selection: { anchor: from + 4 },
    });
    return true;
  }

  if (id === 'code') {
    const line = slashLine ?? state.doc.lineAt(selection.from);
    const inner = slashLine ? '' : state.doc.sliceString(line.from, line.to);
    const block = `\`\`\`\n${inner}\n\`\`\``;
    view.dispatch({
      changes: { from: line.from, to: slashLine ? line.to : line.from, insert: block },
      selection: { anchor: line.from + 4, head: line.from + 4 + inner.length },
    });
    return true;
  }

  if (id === 'table') {
    const table = '| 헤더1 | 헤더2 | 헤더3 |\n| --- | --- | --- |\n| 값1 | 값2 | 값3 |';
    view.dispatch({
      changes: { from: insertFrom, to: insertTo, insert: table },
      selection: { anchor: insertFrom + table.length },
    });
    return true;
  }

  if (id === 'image') {
    const url = await requestImageUrl();
    if (!url) {
      view.focus();
      return false;
    }

    const markdown = `![image](${url})`;
    view.dispatch({
      changes: { from: insertFrom, to: insertTo, insert: markdown },
      selection: { anchor: insertFrom + markdown.length },
    });
    return true;
  }

  if (id === 'link') {
    const url = await requestLinkUrl();
    if (!url) {
      view.focus();
      return false;
    }

    const selectionText = slashLine ? '' : state.doc.sliceString(insertFrom, insertTo);
    const label = selectionText || '링크';
    const markdown = `[${label}](${url})`;

    view.dispatch({
      changes: { from: insertFrom, to: insertTo, insert: markdown },
      selection: { anchor: insertFrom + 1, head: insertFrom + 1 + label.length },
    });
    return true;
  }

  return false;
}
