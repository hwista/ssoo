'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { EDITOR_COMMANDS, EditorToolbar, type ToolbarCommandId } from './Toolbar';
import { useTabStore } from '@/stores';
import { markdownToHtmlSync } from '@/lib/markdownConverter';
import { Annotation, Compartment, EditorState, StateEffect, StateField, type StateEffectType } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface SlashState {
  open: boolean;
  query: string;
  from: number;
  to: number;
  selected: number;
}

export interface BlockEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
  currentFilePath?: string | null;
  isPreview?: boolean;
  showToolbar?: boolean;
  isPendingInsertLoading?: boolean;
}

export interface BlockEditorRef {
  getEditor: () => null;
  getMarkdown: () => string;
  setContent: (content: string) => void;
  focus: () => void;
  applyCommand: (id: ToolbarCommandId) => void;
  getSelection: () => { from: number; to: number };
  insertAt: (from: number, to: number, text: string) => void;
  setPendingInsert: (range: { from: number; to: number } | null) => void;
}

const markdownHighlight = HighlightStyle.define([
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

const ExternalChange = Annotation.define<boolean>();
const initialSlash: SlashState = { open: false, query: '', from: 0, to: 0, selected: 0 };
type SelectionRange = { from: number; to: number };
const setSavedSelectionEffect = StateEffect.define<SelectionRange | null>();
const setPendingInsertEffect = StateEffect.define<{
  range?: SelectionRange | null;
  loading?: boolean;
}>();

function resolveRelativePath(basePath: string, relativePath: string): string {
  const baseParts = basePath.split('/').filter(Boolean);
  baseParts.pop();
  const relParts = relativePath.split('/').filter(Boolean);
  for (const part of relParts) {
    if (part === '.') continue;
    if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join('/');
}

function resolveWikiDocPath(href: string, currentFilePath?: string | null): string | null {
  const rawHref = href.trim();
  if (!rawHref) return null;
  if (/^(https?:|mailto:|tel:|#)/i.test(rawHref)) return null;
  const noQuery = rawHref.split('#')[0]?.split('?')[0] ?? rawHref;
  if (!noQuery) return null;
  if (noQuery.startsWith('/doc/')) {
    try { return decodeURIComponent(noQuery.slice('/doc/'.length)); }
    catch { return noQuery.slice('/doc/'.length); }
  }
  if (noQuery.startsWith('/')) return noQuery.slice(1);
  if ((noQuery.startsWith('./') || noQuery.startsWith('../')) && currentFilePath) {
    return resolveRelativePath(currentFilePath, noQuery);
  }
  return noQuery;
}

function stripLinePrefix(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/^- \[(?: |x)\]\s+/, '')
    .replace(/^>\s+/, '');
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
    return [
      Decoration.line({ class: lineClass }).range(line.from),
    ];
  }

  return [
    Decoration.mark({ class: markClass }).range(normalized.from, normalized.to),
  ];
}

function createSelectionDecorationField(
  effect: StateEffectType<SelectionRange | null>,
  lineClass: string,
  markClass: string
) {
  return StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(decorations, tr) {
      let next = decorations.map(tr.changes);
      for (const ef of tr.effects) {
        if (ef.is(effect)) {
          const ranges = createDecorationsForRange(tr.state, ef.value, lineClass, markClass);
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

const savedSelectionField = createSelectionDecorationField(
  setSavedSelectionEffect,
  'cm-savedCursorLine',
  'cm-savedSelection'
);

const pendingInsertField = StateField.define<{
  range: SelectionRange | null;
  loading: boolean;
  decorations: DecorationSet;
}>({
  create: () => ({
    range: null,
    loading: false,
    decorations: Decoration.none,
  }),
  update(value, tr) {
    let nextRange = value.range;
    let nextLoading = value.loading;

    if (nextRange) {
      nextRange = {
        from: tr.changes.mapPos(nextRange.from, -1),
        to: tr.changes.mapPos(nextRange.to, 1),
      };
    }

    for (const ef of tr.effects) {
      if (ef.is(setPendingInsertEffect)) {
        if (Object.prototype.hasOwnProperty.call(ef.value, 'range')) {
          nextRange = ef.value.range ?? null;
        }
        if (typeof ef.value.loading === 'boolean') {
          nextLoading = ef.value.loading;
        }
      }
    }

    const decorationRanges = createDecorationsForRange(
      tr.state,
      nextRange,
      'cm-pendingInsertLine',
      'cm-pendingInsertRange'
    );

    if (nextLoading && nextRange) {
      const widgetPos = normalizeRange(tr.state.doc.length, nextRange)?.from ?? nextRange.from;
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

const editorTheme = EditorView.theme({
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

const BlockEditor = forwardRef<BlockEditorRef, BlockEditorProps>(({
  content,
  onChange,
  onSave,
  editable = true,
  placeholder = '/를 입력하여 블록 추가',
  className = '',
  currentFilePath,
  isPreview = false,
  showToolbar = true,
  isPendingInsertLoading = false,
}, ref) => {
  const { openTab } = useTabStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const prevContentRef = useRef<string>(content);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const savedSelectionRef = useRef<SelectionRange>({ from: 0, to: 0 });

  const slashRef = useRef<SlashState>(initialSlash);
  const slashItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [slash, setSlash] = useState<SlashState>(initialSlash);
  const [slashPos, setSlashPos] = useState<{ top: number; left: number } | null>(null);
  const [previewMarkdown, setPreviewMarkdown] = useState(content);

  const applyCommandRef = useRef<(id: ToolbarCommandId, fromSlash?: boolean) => void>(() => {});
  const openHrefRef = useRef<(href: string) => void>(() => {});

  const editableCompartmentRef = useRef(new Compartment());

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  useEffect(() => {
    if (!containerRef.current) return;

    const editableCompartment = editableCompartmentRef.current;

    const updateListenerExt = EditorView.updateListener.of((update) => {
      if (update.docChanged && !update.transactions.some((tr) => tr.annotation(ExternalChange))) {
        const next = update.state.doc.toString();
        prevContentRef.current = next;
        onChangeRef.current(next);
      }

      if (update.docChanged || update.selectionSet) {
        const selection = update.state.selection.main;
        savedSelectionRef.current = {
          from: Math.min(selection.from, selection.to),
          to: Math.max(selection.from, selection.to),
        };

        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        const lineTextToCursor = update.state.doc.sliceString(line.from, head);
        if (/^\/[\S]*$/.test(lineTextToCursor)) {
          const nextQuery = lineTextToCursor.slice(1).toLowerCase();
          const prev = slashRef.current;
          const next: SlashState = {
            open: true,
            query: nextQuery,
            from: line.from,
            to: head,
            selected: prev.open && prev.query === nextQuery ? prev.selected : 0,
          };
          slashRef.current = next;
          setSlash(next);
          const containerEl = containerRef.current;
          if (containerEl) {
            const coords = update.view.coordsAtPos(head);
            const rect = containerEl.getBoundingClientRect();
            if (coords) {
              setSlashPos({
                top: coords.bottom - rect.top + 4,
                left: Math.max(0, coords.left - rect.left),
              });
            }
          }
        } else if (slashRef.current.open) {
          const next = { ...slashRef.current, open: false };
          slashRef.current = next;
          setSlash(next);
          setSlashPos(null);
        }
      }
    });

    const linkClickExt = EditorView.domEventHandlers({
      click: (e, view) => {
        const target = e.target as HTMLElement | null;
        const anchor = target?.closest('a') as HTMLAnchorElement | null;
        if (!anchor) return false;
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          const href = anchor.getAttribute('href');
          if (href) openHrefRef.current(href);
          return true;
        }
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos !== null) {
          view.dispatch({ selection: { anchor: pos } });
          view.focus();
        }
        return true;
      },
      mousedown: (e) => {
        const target = e.target as HTMLElement | null;
        const anchor = target?.closest('a') as HTMLAnchorElement | null;
        if (!anchor) return false;
        e.preventDefault();
        return true;
      },
      blur: (_, view) => {
        view.dispatch({
          effects: setSavedSelectionEffect.of(savedSelectionRef.current),
        });
        return false;
      },
      focus: (_, view) => {
        view.dispatch({
          effects: setSavedSelectionEffect.of(null),
        });
        return false;
      },
    });

    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions: [
          history(),
          keymap.of([
            { key: 'Mod-b', run: () => { applyCommandRef.current('bold'); return true; } },
            { key: 'Mod-i', run: () => { applyCommandRef.current('italic'); return true; } },
            { key: 'Mod-Shift-x', run: () => { applyCommandRef.current('strike'); return true; } },
            {
              key: 'ArrowDown',
              run: () => {
                const s = slashRef.current;
                if (!s.open) return false;
                const count = EDITOR_COMMANDS.filter((c) => c.title.toLowerCase().includes(s.query)).length;
                const next = { ...s, selected: Math.min(s.selected + 1, Math.max(0, count - 1)) };
                slashRef.current = next;
                setSlash(next);
                return true;
              },
            },
            {
              key: 'ArrowUp',
              run: () => {
                const s = slashRef.current;
                if (!s.open) return false;
                const next = { ...s, selected: Math.max(s.selected - 1, 0) };
                slashRef.current = next;
                setSlash(next);
                return true;
              },
            },
            {
              key: 'Enter',
              run: () => {
                const s = slashRef.current;
                if (!s.open) return false;
                const items = EDITOR_COMMANDS.filter((c) => c.title.toLowerCase().includes(s.query));
                const item = items[s.selected];
                if (item) {
                  applyCommandRef.current(item.id, true);
                  return true;
                }
                return false;
              },
            },
            {
              key: 'Escape',
              run: () => {
                const s = slashRef.current;
                if (!s.open) return false;
                const next = { ...s, open: false };
                slashRef.current = next;
                setSlash(next);
                setSlashPos(null);
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
            { key: 'Mod-Enter', run: () => { onSaveRef.current?.(); return true; } },
          ]),
          markdown(),
          syntaxHighlighting(markdownHighlight),
          EditorView.lineWrapping,
          cmPlaceholder(placeholder),
          editableCompartment.of(EditorView.editable.of(editable)),
          editorTheme,
          savedSelectionField,
          pendingInsertField,
          updateListenerExt,
          linkClickExt,
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    prevContentRef.current = content;

    if (editable) {
      requestAnimationFrame(() => {
        const mountedView = viewRef.current;
        if (!mountedView) return;
        mountedView.requestMeasure();
        mountedView.focus();
      });
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const view = viewRef.current;
    if (!view || content === prevContentRef.current) return;
    const currentDoc = view.state.doc.toString();
    if (content === currentDoc) { prevContentRef.current = content; return; }
    prevContentRef.current = content;
    view.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: content },
      annotations: [ExternalChange.of(true)],
    });
  }, [content]);

  // [미리보기 유지 중 외부 변경 동기화] AI 작성 등 부모 content가 바뀔 때 preview에 반영.
  // ※ 아래 useEffect([isPreview])와 상호 보완 — 함께 제거하지 말 것.
  useEffect(() => {
    if (isPreview) {
      setPreviewMarkdown(content);
    }
  }, [content, isPreview]);

  // [미리보기 진입] viewRef에서 스냅샷 → 부모 content prop 타이밍과 무관하게 최신값 확보.
  // [편집 복귀] display:none 해제 후 CM6 레이아웃 재계산 + 포커스.
  // ※ 위 useEffect([content, isPreview])와 상호 보완 — 함께 제거하지 말 것.
  useEffect(() => {
    if (isPreview) {
      setPreviewMarkdown(viewRef.current?.state.doc.toString() ?? content);
      slashRef.current = initialSlash;
      setSlash(initialSlash);
      setSlashPos(null);
      return;
    }
    viewRef.current?.requestMeasure();
    viewRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: editableCompartmentRef.current.reconfigure(EditorView.editable.of(editable)),
    });
  }, [editable]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: setPendingInsertEffect.of({ loading: isPendingInsertLoading }),
    });
  }, [isPendingInsertLoading]);

  const slashItems = useMemo(() => {
    if (!slash.open) return [];
    return EDITOR_COMMANDS.filter((item) => item.title.toLowerCase().includes(slash.query));
  }, [slash.open, slash.query]);

  useEffect(() => {
    if (!slash.open || slashItems.length === 0) return;
    const target = slashItemRefs.current[slash.selected];
    if (!target) return;
    target.scrollIntoView({ block: 'nearest' });
  }, [slash.open, slash.selected, slashItems.length]);

  const openHrefInEditorMode = useCallback((href: string) => {
    const docPath = resolveWikiDocPath(href, currentFilePath);
    if (docPath) {
      const title = docPath.split('/').pop() || docPath;
      openTab({ title, path: `/doc/${encodeURIComponent(docPath)}`, activate: true });
      return;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  }, [currentFilePath, openTab]);

  useEffect(() => { openHrefRef.current = openHrefInEditorMode; }, [openHrefInEditorMode]);

  const applyCommand = useCallback((id: ToolbarCommandId, fromSlash = false) => {
    const view = viewRef.current;
    if (!view) return;

    const state = view.state;
    const { from: selFrom, to: selTo } = state.selection.main;

    let insertFrom = selFrom;
    let insertTo = selTo;
    let slashLine = null as ReturnType<typeof state.doc.lineAt> | null;

    if (fromSlash && slashRef.current.open) {
      slashLine = state.doc.lineAt(slashRef.current.from);
      insertFrom = slashLine.from;
      insertTo = slashLine.to;
      const next = { ...slashRef.current, open: false };
      slashRef.current = next;
      setSlash(next);
      setSlashPos(null);
    }

    if (id === 'bold') {
      const sel = state.doc.sliceString(insertFrom, insertTo);
      view.dispatch({
        changes: { from: insertFrom, to: insertTo, insert: `**${sel}**` },
        selection: { anchor: insertFrom + 2, head: insertFrom + 2 + sel.length },
      });
    } else if (id === 'italic') {
      const sel = state.doc.sliceString(insertFrom, insertTo);
      view.dispatch({
        changes: { from: insertFrom, to: insertTo, insert: `*${sel}*` },
        selection: { anchor: insertFrom + 1, head: insertFrom + 1 + sel.length },
      });
    } else if (id === 'strike') {
      const sel = state.doc.sliceString(insertFrom, insertTo);
      view.dispatch({
        changes: { from: insertFrom, to: insertTo, insert: `~~${sel}~~` },
        selection: { anchor: insertFrom + 2, head: insertFrom + 2 + sel.length },
      });
    } else if (id === 'inlineCode') {
      const sel = state.doc.sliceString(insertFrom, insertTo);
      view.dispatch({
        changes: { from: insertFrom, to: insertTo, insert: `\`${sel}\`` },
        selection: { anchor: insertFrom + 1, head: insertFrom + 1 + sel.length },
      });
    } else if (id === 'highlight') {
      const sel = state.doc.sliceString(insertFrom, insertTo);
      view.dispatch({
        changes: { from: insertFrom, to: insertTo, insert: `==${sel}==` },
        selection: { anchor: insertFrom + 2, head: insertFrom + 2 + sel.length },
      });
    } else if (id === 'h1' || id === 'h2' || id === 'h3'
               || id === 'ul' || id === 'ol' || id === 'task' || id === 'quote') {
      const prefix: Record<string, string> = {
        h1: '# ', h2: '## ', h3: '### ',
        ul: '- ', ol: '1. ', task: '- [ ] ', quote: '> ',
      };
      const pre = prefix[id] ?? '';
      if (slashLine) {
        // slash line은 /query만 포함 — 보존할 실제 내용 없음.
        view.dispatch({
          changes: { from: slashLine.from, to: slashLine.to, insert: pre },
          selection: { anchor: slashLine.from + pre.length },
        });
      } else {
        const firstLine = state.doc.lineAt(selFrom);
        const lastLine = state.doc.lineAt(selTo === selFrom ? selFrom : selTo - 1);
        const changes: { from: number; to: number; insert: string }[] = [];
        for (let n = firstLine.number; n <= lastLine.number; n += 1) {
          const ln = state.doc.line(n);
          const stripped = stripLinePrefix(ln.text);
          changes.push({ from: ln.from, to: ln.to, insert: `${pre}${stripped}` });
        }
        view.dispatch({ changes });
      }
    } else if (id === 'hr') {
      const line = slashLine ?? state.doc.lineAt(selFrom);
      const from = slashLine ? line.from : selFrom;
      const to = slashLine ? line.to : selFrom;
      view.dispatch({
        changes: { from, to, insert: '---\n' },
        selection: { anchor: from + 4 },
      });
    } else if (id === 'code') {
      const line = slashLine ?? state.doc.lineAt(selFrom);
      const inner = slashLine ? '' : state.doc.sliceString(line.from, line.to);
      const block = `\`\`\`\n${inner}\n\`\`\``;
      view.dispatch({
        changes: { from: line.from, to: slashLine ? line.to : line.from, insert: block },
        selection: { anchor: line.from + 4, head: line.from + 4 + inner.length },
      });
    } else if (id === 'table') {
      const table = '| 헤더1 | 헤더2 | 헤더3 |\n| --- | --- | --- |\n| 값1 | 값2 | 값3 |';
      const from = slashLine ? slashLine.from : insertFrom;
      const to = slashLine ? slashLine.to : insertTo;
      view.dispatch({
        changes: { from, to, insert: table },
        selection: { anchor: from + table.length },
      });
    } else if (id === 'image') {
      const url = window.prompt('이미지 URL을 입력하세요:');
      if (!url) { view.focus(); return; }
      const md = `![image](${url})`;
      const from = slashLine ? slashLine.from : insertFrom;
      const to = slashLine ? slashLine.to : insertTo;
      view.dispatch({
        changes: { from, to, insert: md },
        selection: { anchor: from + md.length },
      });
    } else if (id === 'link') {
      const url = window.prompt('링크 URL을 입력하세요:');
      if (!url) { view.focus(); return; }
      const from = slashLine ? slashLine.from : insertFrom;
      const to = slashLine ? slashLine.to : insertTo;
      const selText = slashLine ? '' : state.doc.sliceString(from, to);
      const label = selText || '링크';
      const md = `[${label}](${url})`;
      view.dispatch({
        changes: { from, to, insert: md },
        selection: { anchor: from + 1, head: from + 1 + label.length },
      });
    }

    view.focus();
  }, []);

  useEffect(() => { applyCommandRef.current = applyCommand; }, [applyCommand]);

  useImperativeHandle(ref, () => ({
    getEditor: () => null,
    getMarkdown: () => viewRef.current?.state.doc.toString() ?? content,
    setContent: (nextContent: string) => {
      const view = viewRef.current;
      if (view) {
        const currentDoc = view.state.doc.toString();
        prevContentRef.current = nextContent;
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: nextContent },
          annotations: [ExternalChange.of(true)],
        });
      }
      onChange(nextContent);
    },
    focus: () => {
      viewRef.current?.focus();
    },
    applyCommand: (id: ToolbarCommandId) => {
      applyCommandRef.current(id);
    },
    getSelection: () => savedSelectionRef.current,
    insertAt: (from: number, to: number, text: string) => {
      const view = viewRef.current;
      if (!view) return;
      const max = view.state.doc.length;
      const safeFrom = Math.max(0, Math.min(max, from));
      const safeTo = Math.max(0, Math.min(max, to));
      const start = Math.min(safeFrom, safeTo);
      const end = Math.max(safeFrom, safeTo);

      view.dispatch({
        changes: { from: start, to: end, insert: text },
        selection: { anchor: start + text.length },
      });
      const nextContent = view.state.doc.toString();
      prevContentRef.current = nextContent;
      onChangeRef.current(nextContent);
    },
    setPendingInsert: (range: SelectionRange | null) => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: setPendingInsertEffect.of({ range }),
      });
    },
  }), [content, onChange]);

  return (
    <div className={`block-editor flex h-full min-h-0 flex-col ${className}`}>
      {editable && showToolbar && (
        <div className="editor-toolbar border-b border-ssoo-content-border">
          <EditorToolbar disabled={isPreview} onCommand={(id) => applyCommand(id)} />
        </div>
      )}

      <div className="relative flex-1 min-h-0 overflow-hidden bg-white">
        <div
          ref={containerRef}
          className="h-full"
          style={isPreview ? { display: 'none' } : undefined}
        />

        {isPreview && (
          <div
            className="h-full overflow-auto px-8 py-6"
            onClick={(e) => {
              const anchor = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
              if (!anchor) return;
              e.preventDefault();
              if (e.ctrlKey || e.metaKey) {
                const href = anchor.getAttribute('href');
                if (href) openHrefRef.current(href);
              }
            }}
          >
            <div
              className={cn(
                'prose prose-base max-w-none font-sans',
                'prose-headings:scroll-mt-4',
                'prose-p:my-2 prose-p:leading-relaxed prose-li:leading-relaxed',
                'prose-pre:bg-ssoo-content-bg prose-pre:text-ssoo-primary prose-pre:border-0 prose-pre:font-mono',
                'prose-code:text-ssoo-primary prose-code:bg-ssoo-content-bg prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border-0 prose-code:font-mono'
              )}
              dangerouslySetInnerHTML={{ __html: markdownToHtmlSync(previewMarkdown) }}
            />
          </div>
        )}

        {editable && !isPreview && slash.open && slashItems.length > 0 && (
          <div
            className="absolute z-50 w-[320px] max-h-72 overflow-y-auto rounded-lg border border-ssoo-content-border bg-white shadow-lg"
            style={slashPos ? { top: slashPos.top, left: slashPos.left } : { top: 48, left: 32 }}
          >
            {slashItems.map((item, i) => (
              <button
                key={item.id}
                ref={(el) => { slashItemRefs.current[i] = el; }}
                type="button"
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                  i === slash.selected
                    ? 'bg-ssoo-content-border text-ssoo-primary'
                    : 'text-ssoo-primary hover:bg-ssoo-sitemap-bg'
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyCommand(item.id, true)}
              >
                <span className="flex w-8 items-center justify-center text-ssoo-primary/80">
                  <item.icon className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-ssoo-primary/60">{item.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

BlockEditor.displayName = 'BlockEditor';

export { BlockEditor };
