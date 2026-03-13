'use client';

import * as React from 'react';
import type { BlockEditorRef } from './block-editor/BlockEditor';

interface EditorHandlerShape {
  save: () => Promise<void>;
  cancel: () => void;
  getMarkdown: () => string;
  getSelection: () => { from: number; to: number };
  insertAt: (from: number, to: number, text: string) => void;
  setPendingInsert: (range: { from: number; to: number } | null) => void;
}

export function useEditorRuntimeEffects({
  content,
  hasUnsavedChanges,
  isSaving,
  resetContent,
  lastResetContentRef,
  blockEditorRef,
  handleSave,
  handleCancel,
  setStoreHasUnsavedChanges,
  setStoreIsSaving,
  setEditorHandlers,
  clearEditorHandlers,
}: {
  content: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  resetContent: (content: string) => void;
  lastResetContentRef: React.MutableRefObject<string | null>;
  blockEditorRef: React.RefObject<BlockEditorRef | null>;
  handleSave: () => Promise<void>;
  handleCancel: () => Promise<void>;
  setStoreHasUnsavedChanges: (hasChanges: boolean) => void;
  setStoreIsSaving: (saving: boolean) => void;
  setEditorHandlers: (handlers: EditorHandlerShape) => void;
  clearEditorHandlers: () => void;
}) {
  React.useEffect(() => {
    setStoreHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setStoreHasUnsavedChanges]);

  React.useEffect(() => {
    setStoreIsSaving(isSaving);
  }, [isSaving, setStoreIsSaving]);

  React.useEffect(() => {
    if (lastResetContentRef.current === content) {
      return;
    }
    lastResetContentRef.current = content;
    resetContent(content);
  }, [content, lastResetContentRef, resetContent]);

  const handlersRef = React.useRef<EditorHandlerShape>({
    save: handleSave,
    cancel: () => {
      void handleCancel();
    },
    getMarkdown: () => blockEditorRef.current?.getMarkdown() ?? content,
    getSelection: () => blockEditorRef.current?.getSelection() ?? { from: 0, to: 0 },
    insertAt: (from: number, to: number, text: string) => blockEditorRef.current?.insertAt(from, to, text),
    setPendingInsert: (range: { from: number; to: number } | null) => blockEditorRef.current?.setPendingInsert(range),
  });

  React.useEffect(() => {
    handlersRef.current = {
      save: handleSave,
      cancel: () => {
        void handleCancel();
      },
      getMarkdown: () => blockEditorRef.current?.getMarkdown() ?? content,
      getSelection: () => blockEditorRef.current?.getSelection() ?? { from: 0, to: 0 },
      insertAt: (from: number, to: number, text: string) => blockEditorRef.current?.insertAt(from, to, text),
      setPendingInsert: (range: { from: number; to: number } | null) => blockEditorRef.current?.setPendingInsert(range),
    };
  }, [blockEditorRef, content, handleCancel, handleSave]);

  React.useEffect(() => {
    setEditorHandlers({
      save: () => handlersRef.current.save(),
      cancel: () => handlersRef.current.cancel(),
      getMarkdown: () => handlersRef.current.getMarkdown(),
      getSelection: () => handlersRef.current.getSelection(),
      insertAt: (from, to, text) => handlersRef.current.insertAt(from, to, text),
      setPendingInsert: (range) => handlersRef.current.setPendingInsert(range),
    });

    return () => {
      clearEditorHandlers();
    };
  }, [clearEditorHandlers, setEditorHandlers]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (hasUnsavedChanges) {
          void handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, hasUnsavedChanges]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '저장하지 않은 변경사항이 있습니다.';
        return '저장하지 않은 변경사항이 있습니다.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
