'use client';

import { useCallback } from 'react';
import type { DocumentMetadata } from '@/types';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TemplateItem } from '@/types/template';

interface UseDocumentPagePendingAttachmentsParams {
  documentMetadata: DocumentMetadata | null;
  inlineSummaryFiles: InlineSummaryFileItem[];
  inlineTemplate: TemplateItem | null;
  isTemplatePendingDelete: boolean;
  pendingDeletedFileIds: Set<string>;
  pendingAttachmentsRef: React.RefObject<Map<string, File>>;
  removeReferenceFromSidecar: (name: string) => void;
  setInlineSummaryFiles: React.Dispatch<React.SetStateAction<InlineSummaryFileItem[]>>;
  setInlineTemplate: React.Dispatch<React.SetStateAction<TemplateItem | null>>;
  setIsTemplateUsed: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingDeletedFileIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsTemplatePendingDelete: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalDocumentMetadata: (update: Partial<DocumentMetadata>) => void;
  setUsedSummaryFileIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useDocumentPagePendingAttachments({
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
}: UseDocumentPagePendingAttachmentsParams) {
  const applyPendingReferenceMutationsBeforeSave = useCallback(() => {
    if (pendingDeletedFileIds.size > 0) {
      const deletedNames = inlineSummaryFiles
        .filter((file) => pendingDeletedFileIds.has(file.id))
        .map((file) => file.name);
      setInlineSummaryFiles((prev) => prev.filter((file) => !pendingDeletedFileIds.has(file.id)));
      setUsedSummaryFileIds((prev) => {
        const next = new Set(prev);
        for (const id of pendingDeletedFileIds) next.delete(id);
        return next;
      });
      const currentFiles = documentMetadata?.sourceFiles ?? [];
      const deletedNameSet = new Set(deletedNames);
      setLocalDocumentMetadata({
        sourceFiles: currentFiles.filter((file) => !deletedNameSet.has(file.name)),
      });
      setPendingDeletedFileIds(new Set());
    }

    if (isTemplatePendingDelete && inlineTemplate) {
      removeReferenceFromSidecar(inlineTemplate.name);
      setInlineTemplate(null);
      setIsTemplateUsed(false);
      setIsTemplatePendingDelete(false);
    }
  }, [
    documentMetadata?.sourceFiles,
    inlineSummaryFiles,
    inlineTemplate,
    isTemplatePendingDelete,
    pendingDeletedFileIds,
    removeReferenceFromSidecar,
    setInlineSummaryFiles,
    setInlineTemplate,
    setIsTemplatePendingDelete,
    setIsTemplateUsed,
    setLocalDocumentMetadata,
    setPendingDeletedFileIds,
    setUsedSummaryFileIds,
  ]);

  const uploadPendingAttachments = useCallback(async () => {
    const pending = pendingAttachmentsRef.current;
    if (pending.size === 0) return;

    const currentFiles = documentMetadata?.sourceFiles ?? [];
    const updatedFiles = [...currentFiles];

    for (const [tempPath, file] of pending.entries()) {
      const uploadUrl = tempPath.startsWith('__pending__/ref-')
        ? '/api/file/upload-reference'
        : '/api/file/upload-attachment';
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(uploadUrl, { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.success) {
          const index = updatedFiles.findIndex((item) => item.path === tempPath);
          if (index >= 0) {
            updatedFiles[index] = { ...updatedFiles[index], path: data.path, status: 'published' };
          }
        }
      } catch {
        // keep pending state on failure
      }
      pending.delete(tempPath);
    }

    setLocalDocumentMetadata({ sourceFiles: updatedFiles });
  }, [documentMetadata?.sourceFiles, pendingAttachmentsRef, setLocalDocumentMetadata]);

  return {
    pendingAttachmentsRef,
    applyPendingReferenceMutationsBeforeSave,
    uploadPendingAttachments,
  };
}
