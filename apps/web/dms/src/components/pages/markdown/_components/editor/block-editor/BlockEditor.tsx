'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { EditorToolbar, type ToolbarCommandId } from '../Toolbar';
import { BlockEditorPreview, SlashCommandMenu } from './BlockEditorPanels';
import { applyEditorCommand, resolveWikiDocPath } from './blockEditorCommands';
import {
  ExternalChange,
  SelectionRange,
  setPendingInsertEffect,
} from './blockEditorExtensions';
import { useBlockEditorSlashState } from './useBlockEditorSlashState';
import { useBlockEditorView } from './useBlockEditorView';
import { useTabStore } from '@/stores';

export interface BlockEditorProps {
  content: string;
  originalContent?: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
  currentFilePath?: string | null;
  isPreview?: boolean;
  showToolbar?: boolean;
  isPendingInsertLoading?: boolean;
  requestImageUrl?: () => Promise<string | null>;
  requestLinkUrl?: () => Promise<string | null>;
  openExternalHref?: (href: string) => void;
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

const BlockEditor = forwardRef<BlockEditorRef, BlockEditorProps>(({
  content,
  originalContent = '',
  onChange,
  onSave,
  editable = true,
  placeholder = '/를 입력하여 블록 추가',
  className = '',
  currentFilePath,
  isPreview = false,
  showToolbar = true,
  isPendingInsertLoading = false,
  requestImageUrl,
  requestLinkUrl,
  openExternalHref,
}, ref) => {
  const { openTab } = useTabStore();

  const containerRef = useRef<HTMLDivElement>(null);

  const prevContentRef = useRef<string>(content);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const savedSelectionRef = useRef<SelectionRange>({ from: 0, to: 0 });

  const {
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
  } = useBlockEditorSlashState(containerRef);
  const [previewMarkdown, setPreviewMarkdown] = useState(content);

  const applyCommandRef = useRef<(id: ToolbarCommandId, fromSlash?: boolean) => void>(() => {});
  const openHrefRef = useRef<(href: string) => void>(() => {});

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  const { viewRef } = useBlockEditorView({
    containerRef,
    content,
    originalContent,
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
    slashIsOpen: () => slashRef.current.open,
  });

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
      resetSlashMenu();
      return;
    }
    viewRef.current?.requestMeasure();
    viewRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);

  const openHrefInEditorMode = useCallback((href: string) => {
    const docPath = resolveWikiDocPath(href, currentFilePath);
    if (docPath) {
      const title = docPath.split('/').pop() || docPath;
      openTab({ title, path: `/doc/${encodeURIComponent(docPath)}`, activate: true });
      return;
    }
    openExternalHref?.(href);
  }, [currentFilePath, openExternalHref, openTab]);

  useEffect(() => { openHrefRef.current = openHrefInEditorMode; }, [openHrefInEditorMode]);

  const applyCommand = useCallback(async (id: ToolbarCommandId, fromSlash = false) => {
    const view = viewRef.current;
    if (!view) return;

    const state = view.state;
    const { from: selFrom, to: selTo } = state.selection.main;

    let slashLine = null as ReturnType<typeof state.doc.lineAt> | null;

    if (fromSlash && slashRef.current.open) {
      slashLine = state.doc.lineAt(slashRef.current.from);
      closeSlashMenu();
    }

    const applied = await applyEditorCommand({
      view,
      id,
      selection: { from: selFrom, to: selTo },
      slashLine,
      requestImageUrl: async () => requestImageUrl?.() ?? null,
      requestLinkUrl: async () => requestLinkUrl?.() ?? null,
    });

    if (applied) {
      view.focus();
    }
  }, [closeSlashMenu, requestImageUrl, requestLinkUrl, slashRef, viewRef]);

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
      void applyCommandRef.current(id);
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
      savedSelectionRef.current = {
        from: start + text.length,
        to: start + text.length,
      };
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
  }), [content, onChange, viewRef]);

  return (
    <div className={`block-editor flex h-full min-h-0 flex-col ${className}`}>
      {editable && showToolbar && (
        <div className="editor-toolbar border-b border-ssoo-content-border">
          <EditorToolbar disabled={isPreview} onCommand={(id) => { void applyCommand(id); }} />
        </div>
      )}

      <div className="relative flex-1 min-h-0 overflow-hidden bg-white">
        <div
          ref={containerRef}
          className="h-full"
          style={isPreview ? { display: 'none' } : undefined}
        />

        {isPreview && (
          <BlockEditorPreview
            markdown={previewMarkdown}
            onModifiedClick={(event) => {
              const anchor = (event.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
              if (!anchor) return;
              event.preventDefault();
              if (event.ctrlKey || event.metaKey) {
                const href = anchor.getAttribute('href');
                if (href) openHrefRef.current(href);
              }
            }}
          />
        )}

        <SlashCommandMenu
          open={editable && !isPreview && slash.open}
          items={slashItems}
          selectedIndex={slash.selected}
          position={slashPos}
          itemRefs={slashItemRefs}
          onSelect={(id) => applyCommand(id, true)}
        />
      </div>
    </div>
  );
});

BlockEditor.displayName = 'BlockEditor';

export { BlockEditor };
