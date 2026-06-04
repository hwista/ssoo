'use client';

import { Annotation, EditorState, RangeSetBuilder, StateEffect, StateField, type StateEffectType } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export type SelectionRange = { from: number; to: number };

export const ExternalChange = Annotation.define<boolean>();
export const setSavedSelectionEffect = StateEffect.define<SelectionRange | null>();
export const setPendingInsertEffect = StateEffect.define<{
  range?: SelectionRange | null;
  loading?: boolean;
}>();

const HIGHLIGHT_PATTERN = /==(?![=\s])([\s\S]*?\S)==(?![=])/g;
const CODE_FENCE_PATTERN = /^\s*(`{3,}|~{3,})/;

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

function toggleCodeFence(currentFence: string | null, lineText: string): string | null {
  const match = CODE_FENCE_PATTERN.exec(lineText);
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

function findClosingBacktickRun(text: string, from: number, tickCount: number): number {
  for (let index = from; index < text.length; index += 1) {
    if (text[index] !== '`') {
      continue;
    }

    let length = 1;
    while (text[index + length] === '`') {
      length += 1;
    }

    if (length === tickCount) {
      return index;
    }

    index += length - 1;
  }

  return -1;
}

function getInlineCodeRanges(text: string): SelectionRange[] {
  const ranges: SelectionRange[] = [];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '`') {
      continue;
    }

    let tickCount = 1;
    while (text[index + tickCount] === '`') {
      tickCount += 1;
    }

    const closingIndex = findClosingBacktickRun(text, index + tickCount, tickCount);
    if (closingIndex === -1) {
      index += tickCount - 1;
      continue;
    }

    ranges.push({
      from: index,
      to: closingIndex + tickCount,
    });
    index = closingIndex + tickCount - 1;
  }

  return ranges;
}

function overlapsRange(from: number, to: number, ranges: SelectionRange[]): boolean {
  return ranges.some((range) => from < range.to && to > range.from);
}

function buildMarkdownHighlightDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  let activeFence: string | null = null;

  for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
    const line = state.doc.line(lineNumber);
    const nextFence = toggleCodeFence(activeFence, line.text);

    if (activeFence) {
      activeFence = nextFence;
      continue;
    }

    if (nextFence) {
      activeFence = nextFence;
      continue;
    }

    const inlineCodeRanges = getInlineCodeRanges(line.text);
    HIGHLIGHT_PATTERN.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = HIGHLIGHT_PATTERN.exec(line.text)) !== null) {
      const from = match.index;
      const to = from + match[0].length;
      if (overlapsRange(from, to, inlineCodeRanges)) {
        continue;
      }

      builder.add(
        line.from + from,
        line.from + to,
        Decoration.mark({ class: 'cm-mdHighlight' }),
      );
    }
  }

  return builder.finish();
}

export const markdownHighlightDecorations = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = buildMarkdownHighlightDecorations(view.state);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = buildMarkdownHighlightDecorations(update.state);
    }
  }
}, {
  decorations: (value) => value.decorations,
});

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
  { tag: tags.monospace, fontFamily: 'var(--font-mono)', fontSize: '0.875em' },
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
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--doc-content-font-size)',
  },
  '.cm-scroller': { height: '100%', padding: '1.5rem 2rem', overflowY: 'auto', overflowX: 'hidden', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'normal' },
  '.cm-content': { padding: 0, minHeight: '100%', caretColor: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'var(--doc-content-line-height)', letterSpacing: 'normal' },
  '&.cm-focused': { outline: 'none' },
  '.cm-line': { padding: 0, lineHeight: 'var(--doc-content-line-height)' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-selectionBackground': { backgroundColor: '#dbeafe' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#93c5fd' },
  '.cm-mdHighlight': {
    backgroundColor: 'rgba(250, 204, 21, 0.35)',
    borderRadius: '2px',
  },
  '.cm-savedCursorLine': { backgroundColor: 'rgba(99, 102, 241, 0.08)' },
  '.cm-savedSelection': { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderRadius: '2px' },
  '.cm-pendingInsertLine': { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  '.cm-pendingInsertRange': { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderRadius: '2px' },
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
    font: '400 0.8125rem/1.5 var(--font-mono)',
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
