'use client';

import * as React from 'react';
import type { EditorView } from '@codemirror/view';
import { EDITOR_COMMANDS } from '../Toolbar';
import {
  SLASH_MENU_ITEM_HEIGHT,
  SLASH_MENU_MAX_HEIGHT,
  SLASH_MENU_OFFSET,
  SLASH_MENU_WIDTH,
} from './BlockEditorPanels';

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

function getSlashItems(query: string) {
  return EDITOR_COMMANDS.filter((item) => item.title.toLowerCase().includes(query));
}

function resolveSlashPosition(
  containerRect: DOMRect,
  coords: { top: number; bottom: number; left: number },
  itemCount: number
) {
  const estimatedMenuHeight = Math.min(
    SLASH_MENU_MAX_HEIGHT,
    Math.max(1, itemCount) * SLASH_MENU_ITEM_HEIGHT
  );
  const maxLeft = Math.max(0, containerRect.width - SLASH_MENU_WIDTH);
  const left = Math.min(Math.max(0, coords.left - containerRect.left), maxLeft);
  const spaceBelow = containerRect.bottom - coords.bottom;
  const spaceAbove = coords.top - containerRect.top;

  if (spaceBelow >= estimatedMenuHeight || spaceBelow >= spaceAbove) {
    const maxTop = Math.max(0, containerRect.height - estimatedMenuHeight);
    return {
      top: Math.min(coords.bottom - containerRect.top + SLASH_MENU_OFFSET, maxTop),
      left,
    };
  }

  return {
    top: Math.max(0, coords.top - containerRect.top - estimatedMenuHeight - SLASH_MENU_OFFSET),
    left,
  };
}

export function useBlockEditorSlashState(containerRef: React.RefObject<HTMLDivElement | null>) {
  const slashRef = React.useRef<SlashState>(initialSlashState);
  const slashItemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [slash, setSlash] = React.useState<SlashState>(initialSlashState);
  const [slashPos, setSlashPos] = React.useState<{ top: number; left: number } | null>(null);

  const slashItems = React.useMemo(() => {
    if (!slash.open) return [];
    return getSlashItems(slash.query);
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
      const nextItems = getSlashItems(nextQuery);
      const next: SlashState = {
        open: true,
        query: nextQuery,
        from: line.from,
        to: head,
        selected: previous.open && previous.query === nextQuery
          ? Math.min(previous.selected, Math.max(0, nextItems.length - 1))
          : 0,
      };

      slashRef.current = next;
      setSlash(next);

      const containerElement = containerRef.current;
      if (containerElement) {
        const coords = view.coordsAtPos(head);
        const rect = containerElement.getBoundingClientRect();
        if (coords) {
          setSlashPos(resolveSlashPosition(rect, coords, nextItems.length));
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

    const count = getSlashItems(current.query).length;
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
    const items = getSlashItems(current.query);
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
