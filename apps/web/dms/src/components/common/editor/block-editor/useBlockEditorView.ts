'use client';

import * as React from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';
import type { ToolbarCommandId } from '../Toolbar';
import {
  editorTheme,
  ExternalChange,
  markdownHighlight,
  pendingInsertField,
  savedSelectionField,
  type SelectionRange,
  setPendingInsertEffect,
  setSavedSelectionEffect,
} from './blockEditorExtensions';

interface BlockEditorViewParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  content: string;
  editable: boolean;
  placeholder: string;
  isPendingInsertLoading: boolean;
  prevContentRef: React.MutableRefObject<string>;
  onChangeRef: React.MutableRefObject<(content: string) => void>;
  onSaveRef: React.MutableRefObject<(() => void) | undefined>;
  savedSelectionRef: React.MutableRefObject<SelectionRange>;
  applyCommandRef: React.MutableRefObject<(id: ToolbarCommandId, fromSlash?: boolean) => void>;
  openHrefRef: React.MutableRefObject<(href: string) => void>;
  updateSlashFromView: (view: EditorView) => void;
  moveSelection: (direction: 'up' | 'down') => boolean;
  resolveSelectedCommand: () => { id: ToolbarCommandId } | null;
  closeSlashMenu: () => void;
  slashIsOpen: () => boolean;
}

export function useBlockEditorView({
  containerRef,
  content,
  editable,
  placeholder,
  isPendingInsertLoading,
  prevContentRef,
  onChangeRef,
  onSaveRef,
  savedSelectionRef,
  applyCommandRef,
  openHrefRef,
  updateSlashFromView,
  moveSelection,
  resolveSelectedCommand,
  closeSlashMenu,
  slashIsOpen,
}: BlockEditorViewParams) {
  const viewRef = React.useRef<EditorView | null>(null);
  const editableCompartmentRef = React.useRef(new Compartment());
  const persistSelection = React.useCallback((view: EditorView) => {
    const selection = view.state.selection.main;
    savedSelectionRef.current = {
      from: Math.min(selection.from, selection.to),
      to: Math.max(selection.from, selection.to),
    };
  }, [savedSelectionRef]);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const editableCompartment = editableCompartmentRef.current;

    const updateListenerExt = EditorView.updateListener.of((update) => {
      if (update.docChanged && !update.transactions.some((transaction) => transaction.annotation(ExternalChange))) {
        const next = update.state.doc.toString();
        prevContentRef.current = next;
        onChangeRef.current(next);
      }

      if (update.docChanged || update.selectionSet) {
        persistSelection(update.view);
        updateSlashFromView(update.view);
      }
    });

    const linkClickExt = EditorView.domEventHandlers({
      click: (event, view) => {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest('a') as HTMLAnchorElement | null;
        if (!anchor) return false;
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          const href = anchor.getAttribute('href');
          if (href) openHrefRef.current(href);
          return true;
        }
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null) {
          view.dispatch({ selection: { anchor: pos } });
          view.focus();
        }
        return true;
      },
      mousedown: (event) => {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest('a') as HTMLAnchorElement | null;
        if (!anchor) return false;
        event.preventDefault();
        return true;
      },
      mouseup: (_, view) => {
        persistSelection(view);
        return false;
      },
      keyup: (_, view) => {
        persistSelection(view);
        return false;
      },
      blur: (_, view) => {
        persistSelection(view);
        view.dispatch({ effects: setSavedSelectionEffect.of(savedSelectionRef.current) });
        return false;
      },
      focus: (_, view) => {
        persistSelection(view);
        view.dispatch({ effects: setSavedSelectionEffect.of(null) });
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
            { key: 'ArrowDown', run: () => moveSelection('down') },
            { key: 'ArrowUp', run: () => moveSelection('up') },
            {
              key: 'Enter',
              run: () => {
                const item = resolveSelectedCommand();
                if (!item) return false;
                applyCommandRef.current(item.id, true);
                return true;
              },
            },
            {
              key: 'Escape',
              run: () => {
                if (!slashIsOpen()) return false;
                closeSlashMenu();
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
    // CodeMirror 인스턴스는 mount 시 1회 생성하고, 이후 doc/editable/loading 동기화는 아래 개별 effect가 담당한다.
    // 이 effect를 content/render 주기로 재실행하면 selection/cursor 상태가 깨진다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const view = viewRef.current;
    if (!view || content === prevContentRef.current) return;
    const currentDoc = view.state.doc.toString();
    if (content === currentDoc) {
      prevContentRef.current = content;
      return;
    }

    prevContentRef.current = content;
    view.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: content },
      annotations: [ExternalChange.of(true)],
    });
  }, [content, prevContentRef]);

  React.useEffect(() => {
    viewRef.current?.dispatch({
      effects: editableCompartmentRef.current.reconfigure(EditorView.editable.of(editable)),
    });
  }, [editable]);

  React.useEffect(() => {
    viewRef.current?.dispatch({
      effects: setPendingInsertEffect.of({ loading: isPendingInsertLoading }),
    });
  }, [isPendingInsertLoading]);

  return {
    viewRef,
  };
}
