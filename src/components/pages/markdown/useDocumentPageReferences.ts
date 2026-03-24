'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { DocumentMetadata } from '@/types';
import { useDocumentPageReferenceSelection } from './useDocumentPageReferenceSelection';
import { useDocumentPageReferenceRestore } from './useDocumentPageReferenceRestore';
import { useDocumentPagePendingAttachments } from './useDocumentPagePendingAttachments';

interface ConfirmOptions { title: string; description: string; confirmText: string; cancelText: string; }
interface UseDocumentPageReferencesParams { confirm: (options: ConfirmOptions) => Promise<boolean>; documentMetadata: DocumentMetadata | null; setLocalDocumentMetadata: (update: Partial<DocumentMetadata>) => void; setHasUnsavedChanges: (value: boolean) => void; }

export function useDocumentPageReferences({
  confirm,
  documentMetadata,
  setLocalDocumentMetadata,
  setHasUnsavedChanges,
}: UseDocumentPageReferencesParams) {
  const pendingAttachmentsRef = useRef(new Map<string, File>());
  const { state: { inlineTemplate, setInlineTemplate, inlineSummaryFiles, setInlineSummaryFiles, inlineRelevanceWarnings, setInlineRelevanceWarnings, usedSummaryFileIds, setUsedSummaryFileIds, isTemplateUsed, setIsTemplateUsed, pendingDeletedFileIds, setPendingDeletedFileIds, isTemplatePendingDelete, setIsTemplatePendingDelete }, removeReferenceFromSidecar, handleRemoveSummaryFile, handleRestoreSummaryFile, handleRemoveTemplate, handleRestoreTemplate, handleClearAll, handleSyncReferencesToSidecar } = useDocumentPageReferenceSelection({
    confirm, documentMetadata, pendingAttachmentsRef, setHasUnsavedChanges, setLocalDocumentMetadata,
  });
  const { isRestoringReferences, failedRestoreFiles, isRetryingRestore, setFailedRestoreFiles, handleRetryRestoreFiles, restoreReferencesFromMetadata } = useDocumentPageReferenceRestore({
    setInlineSummaryFiles,
    setInlineTemplate,
    setInlineRelevanceWarnings,
    setUsedSummaryFileIds,
    setIsTemplateUsed,
  });
  const { applyPendingReferenceMutationsBeforeSave, uploadPendingAttachments } = useDocumentPagePendingAttachments({
    documentMetadata,
    inlineSummaryFiles,
    inlineTemplate,
    isTemplatePendingDelete,
    pendingDeletedFileIds,
    pendingAttachmentsRef,
    removeReferenceFromSidecar,
    setInlineSummaryFiles,
    setInlineTemplate,
    setIsTemplateUsed,
    setPendingDeletedFileIds,
    setIsTemplatePendingDelete,
    setLocalDocumentMetadata,
    setUsedSummaryFileIds,
  });

  const resetReferences = useCallback(() => {
    pendingAttachmentsRef.current.clear();
    setUsedSummaryFileIds(new Set());
    setIsTemplateUsed(false);
    setInlineSummaryFiles([]);
    setInlineTemplate(null);
    setInlineRelevanceWarnings([]);
    setPendingDeletedFileIds(new Set());
    setIsTemplatePendingDelete(false);
    setFailedRestoreFiles([]);
  }, [pendingAttachmentsRef, setFailedRestoreFiles, setInlineRelevanceWarnings, setInlineSummaryFiles, setInlineTemplate, setIsTemplatePendingDelete, setIsTemplateUsed, setPendingDeletedFileIds, setUsedSummaryFileIds]);

  const deletedReferenceKeys = useMemo(() => {
    if (pendingDeletedFileIds.size === 0 && !isTemplatePendingDelete) return undefined;
    const sourceFiles = documentMetadata?.sourceFiles ?? [];
    const keys = new Set<string>();

    for (const sourceFile of sourceFiles) {
      if (sourceFile.origin === 'reference') {
        const matched = inlineSummaryFiles.find((file) => file.name === sourceFile.name);
        if (matched && pendingDeletedFileIds.has(matched.id)) keys.add(sourceFile.path || sourceFile.name);
      }
      if (sourceFile.origin === 'template' && isTemplatePendingDelete) {
        keys.add(sourceFile.path || sourceFile.name);
      }
    }
    return keys.size > 0 ? keys : undefined;
  }, [documentMetadata?.sourceFiles, inlineSummaryFiles, isTemplatePendingDelete, pendingDeletedFileIds]);

  return {
    inlineTemplate, setInlineTemplate, inlineSummaryFiles, setInlineSummaryFiles, inlineRelevanceWarnings,
    setInlineRelevanceWarnings, usedSummaryFileIds, setUsedSummaryFileIds, isTemplateUsed, setIsTemplateUsed,
    isRestoringReferences, pendingDeletedFileIds, setPendingDeletedFileIds, isTemplatePendingDelete,
    failedRestoreFiles, isRetryingRestore, pendingAttachmentsRef, removeReferenceFromSidecar,
    handleRemoveSummaryFile, handleRestoreSummaryFile, handleRemoveTemplate, handleRestoreTemplate,
    handleRetryRestoreFiles, handleClearAll, handleSyncReferencesToSidecar, restoreReferencesFromMetadata,
    applyPendingReferenceMutationsBeforeSave, uploadPendingAttachments, resetReferences, deletedReferenceKeys,
  };
}
