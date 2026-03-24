'use client';

import { useCallback, useEffect } from 'react';
import { fileApi } from '@/lib/api';
import { extractMarkdownLinks } from '@/lib/utils/extractMarkdownLinks';
import { buildDocumentSidecarDiffSnapshot } from './documentPageUtils';
import type { DocumentMetadata } from '@/types';
import type { EditorRef } from './_components/editor';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
}

interface UseDocumentPageActionsParams {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  closeTab: (tabId: string) => void;
  content: string;
  documentMetadata: DocumentMetadata | null;
  editorHandlers: {
    cancel?: () => void;
    save?: () => Promise<void>;
  } | null;
  editorRef: React.RefObject<EditorRef | null>;
  filePath: string | null;
  isCreateMode: boolean;
  isEditing: boolean;
  loadFile: (path: string) => void | Promise<void>;
  pendingFileMove: string | null;
  refreshFileMetadata: (path: string) => Promise<void>;
  refreshFileTree: () => Promise<void>;
  reset: () => void;
  resetDiff: () => void;
  resetReferences: () => void;
  restoreReferencesFromMetadata: (metadata: DocumentMetadata | null) => Promise<void>;
  setCurrentFilePath: (path: string) => void;
  setDiffTarget: (target: 'content' | 'metadata') => void;
  setIsEditing: (value: boolean) => void;
  setLocalDocumentMetadata: (update: Partial<DocumentMetadata>) => void;
  setMode: (mode: 'viewer' | 'editor' | 'create') => void;
  setOriginalMetaSnapshot: (snapshot: ReturnType<typeof buildDocumentSidecarDiffSnapshot> | null) => void;
  setPendingFileMove: (path: string | null) => void;
  setSurfaceMode: React.Dispatch<React.SetStateAction<'edit' | 'preview' | 'diff'>>;
  tabId: string | null;
  updateTab: (tabId: string, updates: { path?: string; title?: string }) => void;
  uploadPendingAttachments: () => Promise<void>;
  applyPendingReferenceMutationsBeforeSave: () => void;
}

export function useDocumentPageActions({
  confirm,
  closeTab,
  content,
  documentMetadata,
  editorHandlers,
  editorRef,
  filePath,
  isCreateMode,
  isEditing,
  loadFile,
  pendingFileMove,
  refreshFileMetadata,
  refreshFileTree,
  reset,
  resetDiff,
  resetReferences,
  restoreReferencesFromMetadata,
  setCurrentFilePath,
  setDiffTarget,
  setIsEditing,
  setLocalDocumentMetadata,
  setMode,
  setOriginalMetaSnapshot,
  setPendingFileMove,
  setSurfaceMode,
  tabId,
  updateTab,
  uploadPendingAttachments,
  applyPendingReferenceMutationsBeforeSave,
}: UseDocumentPageActionsParams) {
  const handleEdit = useCallback(() => {
    setOriginalMetaSnapshot(buildDocumentSidecarDiffSnapshot(documentMetadata));
    setMode('editor');
    setIsEditing(true);
    setSurfaceMode('edit');
    setDiffTarget('content');
    void restoreReferencesFromMetadata(documentMetadata);
  }, [documentMetadata, restoreReferencesFromMetadata, setDiffTarget, setIsEditing, setMode, setOriginalMetaSnapshot, setSurfaceMode]);

  const handleDelete = useCallback(async () => {
    if (!filePath || !tabId) return;

    const confirmed = await confirm({
      title: '문서 삭제',
      description: `'${filePath}'를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
    });

    if (!confirmed) return;

    try {
      const result = await fileApi.delete(filePath);
      if (result.success) {
        reset();
        closeTab(tabId);
        await refreshFileTree();
      }
    } catch (err) {
      console.error('파일 삭제 실패:', err);
    }
  }, [closeTab, confirm, filePath, refreshFileTree, reset, tabId]);

  const handleSave = useCallback(async () => {
    applyPendingReferenceMutationsBeforeSave();
    const currentBodyLinks = extractMarkdownLinks(editorRef.current?.getMarkdown?.() ?? content);
    setLocalDocumentMetadata({ bodyLinks: currentBodyLinks });
    await uploadPendingAttachments();
    await editorHandlers?.save?.();

    if (isCreateMode) {
      setOriginalMetaSnapshot(null);
    } else {
      setOriginalMetaSnapshot(buildDocumentSidecarDiffSnapshot(documentMetadata));
    }

    if (pendingFileMove && filePath && tabId && pendingFileMove !== filePath) {
      try {
        const result = await fileApi.rename(filePath, pendingFileMove, true);
        if (result.success) {
          const actualPath = result.data?.finalPath ?? pendingFileMove;
          const encodedPath = `/doc/${encodeURIComponent(actualPath)}`;
          const title = actualPath.split('/').pop() || actualPath;
          updateTab(tabId, { path: encodedPath, title });
          setCurrentFilePath(actualPath);
          await refreshFileMetadata(actualPath);
          setPendingFileMove(null);
          await refreshFileTree();
        } else {
          console.error('파일 이동 실패:', result);
        }
      } catch (err) {
        console.error('파일 이동 실패:', err);
      }
      return;
    }

    await refreshFileTree();
  }, [
    applyPendingReferenceMutationsBeforeSave,
    content,
    documentMetadata,
    editorHandlers,
    editorRef,
    filePath,
    isCreateMode,
    pendingFileMove,
    refreshFileMetadata,
    refreshFileTree,
    setCurrentFilePath,
    setLocalDocumentMetadata,
    setOriginalMetaSnapshot,
    setPendingFileMove,
    tabId,
    updateTab,
    uploadPendingAttachments,
  ]);

  useEffect(() => {
    if (!isEditing) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        event.stopImmediatePropagation();
        void handleSave();
      }
    };
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, [handleSave, isEditing]);

  const handleCancel = useCallback(() => {
    editorRef.current?.clearPendingImages();
    resetReferences();
    setPendingFileMove(null);
    if (editorHandlers?.cancel) {
      editorHandlers.cancel();
    } else {
      setMode('viewer');
      setIsEditing(false);
    }
    setSurfaceMode('edit');
    resetDiff();
  }, [editorHandlers, editorRef, resetDiff, resetReferences, setIsEditing, setMode, setPendingFileMove, setSurfaceMode]);

  const handleRetry = useCallback(() => {
    if (filePath) void loadFile(filePath);
  }, [filePath, loadFile]);

  return {
    handleEdit,
    handleDelete,
    handleSave,
    handleCancel,
    handleRetry,
  };
}
