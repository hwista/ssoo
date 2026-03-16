'use client';

import { Annotation, EditorState, Facet, type Range, StateEffect, StateField, type StateEffectType } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import diff from 'fast-diff';

export type SelectionRange = { from: number; to: number };

export const ExternalChange = Annotation.define<boolean>();
export const setSavedSelectionEffect = StateEffect.define<SelectionRange | null>();
export const setPendingInsertEffect = StateEffect.define<{
  range?: SelectionRange | null;
  loading?: boolean;
}>();

/** 원본 콘텐츠를 Facet으로 에디터에 전달 */
export const originalContentFacet = Facet.define<string, string>({
  combine: (values) => values[values.length - 1] ?? '',
});

/** 삭제된 텍스트를 인라인으로 표시하는 위젯 */
class DeletedTextWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-deletedText';
    span.textContent = this.text;
    return span;
  }
  eq(other: DeletedTextWidget) {
    return this.text === other.text;
  }
  get estimatedHeight() {
    return -1;
  }
}

/** 원본 대비 변경된 문자를 하이라이트하는 StateField */
export const changedLinesField = StateField.define<DecorationSet>({
  create(state) {
    return computeCharLevelDecorations(state);
  },
  update(value, tr) {
    if (tr.docChanged || tr.effects.length > 0) {
      return computeCharLevelDecorations(tr.state);
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

function computeCharLevelDecorations(state: EditorState): DecorationSet {
  const original = state.facet(originalContentFacet);
  if (!original) return Decoration.none;

  const originalLines = original.split('\n');
  const doc = state.doc;
  const decorations: Range<Decoration>[] = [];

  for (let i = 1; i <= doc.lines; i++) {
    const currentLine = doc.line(i).text;
    const originalLine = i <= originalLines.length ? originalLines[i - 1] : undefined;

    if (originalLine === undefined) {
      // 새로 추가된 줄 — 전체 mark
      if (currentLine.length > 0) {
        const lineInfo = doc.line(i);
        decorations.push(
          Decoration.mark({ class: 'cm-changedText' }).range(lineInfo.from, lineInfo.to)
        );
      }
      continue;
    }

    if (currentLine === originalLine) continue;

    // 문자 수준 diff
    const diffs = diff(originalLine, currentLine);
    const lineFrom = doc.line(i).from;
    let currentPos = lineFrom;

    for (const [op, text] of diffs) {
      if (op === diff.EQUAL) {
        currentPos += text.length;
      } else if (op === diff.INSERT) {
        // 추가된 문자 — mark
        decorations.push(
          Decoration.mark({ class: 'cm-changedText' }).range(currentPos, currentPos + text.length)
        );
        currentPos += text.length;
      } else if (op === diff.DELETE) {
        // 삭제된 문자 — 현재 위치에 위젯 삽입
        decorations.push(
          Decoration.widget({ widget: new DeletedTextWidget(text), side: -1 }).range(currentPos)
        );
      }
    }
  }

  // 원본에만 있고 현재 문서에 없는 줄 (끝에서 삭제된 줄들)
  if (originalLines.length > doc.lines) {
    const deletedTail = originalLines.slice(doc.lines).join('\n');
    if (deletedTail) {
      decorations.push(
        Decoration.widget({ widget: new DeletedTextWidget('\n' + deletedTail), side: 1 }).range(doc.length)
      );
    }
  }

  return decorations.length > 0 ? Decoration.set(decorations, true) : Decoration.none;
}

function normalizeRange(docLength: number, range: SelectionRange | null): SelectionRange | null {
  if (!range) return null;
  const from = Math.max(0, Math.min(docLength, range.from));
  const to = Math.max(0, Math.min(docLength, range.to));
  if (from <= to) return { from, to };
  return { from: to, to: from };
}

function createDecorationsForRange(
  state: EditorState,
  range: SelectionRange | null,
  lineClass: string,
  markClass: string
) {
  const normalized = normalizeRange(state.doc.length, range);
  if (!normalized) return [];

  if (normalized.from === normalized.to) {
    const line = state.doc.lineAt(normalized.from);
    return [Decoration.line({ class: lineClass }).range(line.from)];
  }

  return [Decoration.mark({ class: markClass }).range(normalized.from, normalized.to)];
}

function createSelectionDecorationField(
  effect: StateEffectType<SelectionRange | null>,
  lineClass: string,
  markClass: string
) {
  return StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(decorations, transaction) {
      let next = decorations.map(transaction.changes);
      for (const effectValue of transaction.effects) {
        if (effectValue.is(effect)) {
          const ranges = createDecorationsForRange(transaction.state, effectValue.value, lineClass, markClass);
          next = ranges.length > 0 ? Decoration.set(ranges, true) : Decoration.none;
        }
      }
      return next;
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}

class PendingInsertSpinnerWidget extends WidgetType {
  toDOM() {
    const wrapper = document.createElement('span');
    wrapper.className = 'cm-pendingInsertSpinner';
    wrapper.setAttribute('aria-label', 'AI 작성 중');

    const spinner = document.createElement('span');
    spinner.className = 'cm-pendingInsertSpinnerIcon';
    wrapper.appendChild(spinner);

    const label = document.createElement('span');
    label.className = 'cm-pendingInsertSpinnerLabel';
    label.textContent = 'AI 작성 중...';
    wrapper.appendChild(label);

    return wrapper;
  }
}

export const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: '700', fontSize: '1.5em' },
  { tag: tags.heading2, fontWeight: '700', fontSize: '1.25em' },
  { tag: tags.heading3, fontWeight: '700', fontSize: '1.125em' },
  { tag: tags.heading, fontWeight: '600' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.monospace, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.875em' },
  { tag: tags.link, color: '#6366f1' },
  { tag: tags.url, color: '#9ca3af', fontSize: '0.875em' },
  { tag: tags.quote, color: '#6b7280' },
  { tag: tags.processingInstruction, color: '#8b96c9', opacity: '0.55' },
  { tag: tags.meta, color: '#8b96c9', opacity: '0.55' },
  { tag: tags.punctuation, color: '#8b96c9', opacity: '0.55' },
]);

export const savedSelectionField = createSelectionDecorationField(
  setSavedSelectionEffect,
  'cm-savedCursorLine',
  'cm-savedSelection'
);

export const pendingInsertField = StateField.define<{
  range: SelectionRange | null;
  loading: boolean;
  decorations: DecorationSet;
}>({
  create: () => ({
    range: null,
    loading: false,
    decorations: Decoration.none,
  }),
  update(value, transaction) {
    let nextRange = value.range;
    let nextLoading = value.loading;

    if (nextRange) {
      nextRange = {
        from: transaction.changes.mapPos(nextRange.from, -1),
        to: transaction.changes.mapPos(nextRange.to, 1),
      };
    }

    for (const effectValue of transaction.effects) {
      if (effectValue.is(setPendingInsertEffect)) {
        if (Object.prototype.hasOwnProperty.call(effectValue.value, 'range')) {
          nextRange = effectValue.value.range ?? null;
        }
        if (typeof effectValue.value.loading === 'boolean') {
          nextLoading = effectValue.value.loading;
        }
      }
    }

    const decorationRanges = createDecorationsForRange(
      transaction.state,
      nextRange,
      'cm-pendingInsertLine',
      'cm-pendingInsertRange'
    );

    if (nextLoading && nextRange) {
      const widgetPos = normalizeRange(transaction.state.doc.length, nextRange)?.from ?? nextRange.from;
      decorationRanges.push(
        Decoration.widget({
          widget: new PendingInsertSpinnerWidget(),
          side: 1,
        }).range(widgetPos)
      );
    }

    return {
      range: nextRange,
      loading: nextLoading,
      decorations: decorationRanges.length > 0 ? Decoration.set(decorationRanges, true) : Decoration.none,
    };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '1rem',
  },
  '.cm-scroller': { height: '100%', padding: '1.5rem 2rem', overflowY: 'auto', overflowX: 'hidden', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'normal' },
  '.cm-content': { padding: 0, minHeight: '100%', caretColor: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: '1.625', letterSpacing: 'normal' },
  '&.cm-focused': { outline: 'none' },
  '.cm-line': { padding: 0, lineHeight: '1.625' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-selectionBackground': { backgroundColor: '#dbeafe' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#93c5fd' },
  '.cm-savedCursorLine': { backgroundColor: 'rgba(99, 102, 241, 0.08)' },
  '.cm-savedSelection': { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderRadius: '2px' },
  '.cm-pendingInsertLine': { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  '.cm-pendingInsertRange': { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderRadius: '2px' },
  '.cm-changedText': {
    backgroundColor: 'rgba(250, 0, 45, 0.08)',
    borderRadius: '2px',
  },
  '.cm-deletedText': {
    color: 'rgba(156, 163, 175, 0.7)',
    backgroundColor: 'rgba(250, 0, 45, 0.08)',
    textDecoration: 'line-through',
    borderRadius: '2px',
    fontSize: '0.9em',
  },
  '.cm-pendingInsertSpinner': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    verticalAlign: 'middle',
    marginLeft: '0.375rem',
    marginRight: '0.125rem',
    padding: '0.3125rem 0.625rem',
    borderRadius: '9999px',
    backgroundColor: '#e8ebf6',
    color: 'rgba(55, 65, 81, 0.9)',
    fontSize: '0.8125rem',
    lineHeight: '1',
    fontWeight: '500',
    boxShadow: '0 0 0 1px rgba(148, 163, 184, 0.16) inset',
  },
  '.cm-pendingInsertSpinnerIcon': {
    width: '0.8125rem',
    height: '0.8125rem',
    borderRadius: '9999px',
    border: '2px solid rgba(79, 70, 229, 0.2)',
    borderTopColor: '#6d28d9',
    animation: 'cm-spin 0.8s linear infinite',
    boxSizing: 'border-box',
    flexShrink: '0',
  },
  '.cm-pendingInsertSpinnerLabel': {
    whiteSpace: 'nowrap',
  },
  '.cm-placeholder': { color: '#9ca3af', fontStyle: 'normal' },
  '@keyframes cm-spin': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
});
