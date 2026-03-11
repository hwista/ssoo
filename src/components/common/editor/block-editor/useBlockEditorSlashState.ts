'use client';

import * as React from 'react';
import type { EditorView } from '@codemirror/view';
import { EDITOR_COMMANDS } from '../Toolbar';

export interface SlashState {
  open: boolean;
  query: string;
  from: number;
  to: number;
  selected: number;
}

export const initialSlashState: SlashState = {
  open: false,
  query: '',
  from: 0,
  to: 0,
  selected: 0,
};

export function useBlockEditorSlashState(containerRef: React.RefObject<HTMLDivElement | null>) {
  const slashRef = React.useRef<SlashState>(initialSlashState);
  const slashItemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [slash, setSlash] = React.useState<SlashState>(initialSlashState);
  const [slashPos, setSlashPos] = React.useState<{ top: number; left: number } | null>(null);

  const slashItems = React.useMemo(() => {
    if (!slash.open) return [];
    return EDITOR_COMMANDS.filter((item) => item.title.toLowerCase().includes(slash.query));
  }, [slash.open, slash.query]);

  const closeSlashMenu = React.useCallback(() => {
    slashRef.current = { ...slashRef.current, open: false };
    setSlash(slashRef.current);
    setSlashPos(null);
  }, []);

  const resetSlashMenu = React.useCallback(() => {
    slashRef.current = initialSlashState;
    setSlash(initialSlashState);
    setSlashPos(null);
  }, []);

  const updateSlashFromView = React.useCallback((view: EditorView) => {
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    const lineTextToCursor = view.state.doc.sliceString(line.from, head);

    if (/^\/[\S]*$/.test(lineTextToCursor)) {
      const nextQuery = lineTextToCursor.slice(1).toLowerCase();
      const previous = slashRef.current;
      const next: SlashState = {
        open: true,
        query: nextQuery,
        from: line.from,
        to: head,
        selected: previous.open && previous.query === nextQuery ? previous.selected : 0,
      };

      slashRef.current = next;
      setSlash(next);

      const containerElement = containerRef.current;
      if (containerElement) {
        const coords = view.coordsAtPos(head);
        const rect = containerElement.getBoundingClientRect();
        if (coords) {
          setSlashPos({
            top: coords.bottom - rect.top + 4,
            left: Math.max(0, coords.left - rect.left),
          });
        }
      }

      return;
    }

    if (slashRef.current.open) {
      closeSlashMenu();
    }
  }, [closeSlashMenu, containerRef]);

  const moveSelection = React.useCallback((direction: 'up' | 'down') => {
    const current = slashRef.current;
    if (!current.open) return false;

    const count = EDITOR_COMMANDS.filter((command) => command.title.toLowerCase().includes(current.query)).length;
    const nextSelected = direction === 'down'
      ? Math.min(current.selected + 1, Math.max(0, count - 1))
      : Math.max(current.selected - 1, 0);

    const next = { ...current, selected: nextSelected };
    slashRef.current = next;
    setSlash(next);
    return true;
  }, []);

  const resolveSelectedCommand = React.useCallback(() => {
    const current = slashRef.current;
    if (!current.open) return null;
    const items = EDITOR_COMMANDS.filter((command) => command.title.toLowerCase().includes(current.query));
    return items[current.selected] ?? null;
  }, []);

  React.useEffect(() => {
    if (!slash.open || slashItems.length === 0) return;
    const target = slashItemRefs.current[slash.selected];
    if (!target) return;
    target.scrollIntoView({ block: 'nearest' });
  }, [slash.open, slash.selected, slashItems.length]);

  return {
    slash,
    slashRef,
    slashPos,
    slashItemRefs,
    slashItems,
    closeSlashMenu,
    resetSlashMenu,
    updateSlashFromView,
    moveSelection,
    resolveSelectedCommand,
  };
}
