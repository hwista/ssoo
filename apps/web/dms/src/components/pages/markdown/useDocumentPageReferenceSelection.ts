'use client';

import { useCallback, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { DocumentMetadata, SourceFileMeta } from '@/types';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TemplateItem } from '@/types/template';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
}

interface UseDocumentPageReferenceSelectionParams {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  documentMetadata: DocumentMetadata | null;
  pendingAttachmentsRef: RefObject<Map<string, File>>;
  setHasUnsavedChanges: (value: boolean) => void;
  setLocalDocumentMetadata: (update: Partial<DocumentMetadata>) => void;
}

export interface DocumentPageReferenceSelectionState {
  inlineTemplate: TemplateItem | null;
  setInlineTemplate: Dispatch<SetStateAction<TemplateItem | null>>;
  inlineSummaryFiles: InlineSummaryFileItem[];
  setInlineSummaryFiles: Dispatch<SetStateAction<InlineSummaryFileItem[]>>;
  inlineRelevanceWarnings: string[];
  setInlineRelevanceWarnings: Dispatch<SetStateAction<string[]>>;
  usedSummaryFileIds: Set<string>;
  setUsedSummaryFileIds: Dispatch<SetStateAction<Set<string>>>;
  isTemplateUsed: boolean;
  setIsTemplateUsed: Dispatch<SetStateAction<boolean>>;
  pendingDeletedFileIds: Set<string>;
  setPendingDeletedFileIds: Dispatch<SetStateAction<Set<string>>>;
  isTemplatePendingDelete: boolean;
  setIsTemplatePendingDelete: Dispatch<SetStateAction<boolean>>;
}

export function useDocumentPageReferenceSelection({
  confirm,
  documentMetadata,
  pendingAttachmentsRef,
  setHasUnsavedChanges,
  setLocalDocumentMetadata,
}: UseDocumentPageReferenceSelectionParams) {
  const [inlineTemplate, setInlineTemplate] = useState<TemplateItem | null>(null);
  const [inlineSummaryFiles, setInlineSummaryFiles] = useState<InlineSummaryFileItem[]>([]);
  const [inlineRelevanceWarnings, setInlineRelevanceWarnings] = useState<string[]>([]);
  const [usedSummaryFileIds, setUsedSummaryFileIds] = useState<Set<string>>(new Set());
  const [isTemplateUsed, setIsTemplateUsed] = useState(false);
  const [pendingDeletedFileIds, setPendingDeletedFileIds] = useState<Set<string>>(new Set());
  const [isTemplatePendingDelete, setIsTemplatePendingDelete] = useState(false);

  const removeReferenceFromSidecar = useCallback((name: string) => {
    const currentFiles = documentMetadata?.sourceFiles ?? [];
    setLocalDocumentMetadata({
      sourceFiles: currentFiles.filter((file) => file.name !== name),
    });
  }, [documentMetadata?.sourceFiles, setLocalDocumentMetadata]);

  const handleRemoveSummaryFile = useCallback(async (id: string) => {
    const file = inlineSummaryFiles.find((item) => item.id === id);
    if (!file) return;

    if (usedSummaryFileIds.has(id)) {
      const confirmed = await confirm({
        title: '참조 파일 해제',
        description: `'${file.name}' 파일은 문서 작성에 사용되었습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?`,
        confirmText: '해제',
        cancelText: '취소',
      });
      if (!confirmed) return;
      setPendingDeletedFileIds((prev) => new Set(prev).add(id));
      return;
    }

    setInlineSummaryFiles((prev) => prev.filter((item) => item.id !== id));
  }, [confirm, inlineSummaryFiles, usedSummaryFileIds]);

  const handleRestoreSummaryFile = useCallback((id: string) => {
    setPendingDeletedFileIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleRemoveTemplate = useCallback(async () => {
    if (isTemplateUsed && inlineTemplate) {
      const confirmed = await confirm({
        title: '템플릿 해제',
        description: `'${inlineTemplate.name}' 템플릿은 문서 작성에 사용되었습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?`,
        confirmText: '해제',
        cancelText: '취소',
      });
      if (!confirmed) return;
      setIsTemplatePendingDelete(true);
      return;
    }

    setInlineTemplate(null);
  }, [confirm, inlineTemplate, isTemplateUsed]);

  const handleRestoreTemplate = useCallback(() => {
    setIsTemplatePendingDelete(false);
  }, []);

  const handleClearAll = useCallback(async () => {
    const hasUsed = usedSummaryFileIds.size > 0 || isTemplateUsed;
    if (hasUsed) {
      const confirmed = await confirm({
        title: '전체 컨텍스트 해제',
        description: '사용된 참조 파일/템플릿이 포함되어 있습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?',
        confirmText: '전체 해제',
        cancelText: '취소',
      });
      if (!confirmed) return;
    }

    const usedFileIds = inlineSummaryFiles
      .filter((file) => usedSummaryFileIds.has(file.id))
      .map((file) => file.id);
    if (usedFileIds.length > 0) {
      setPendingDeletedFileIds((prev) => {
        const next = new Set(prev);
        for (const id of usedFileIds) next.add(id);
        return next;
      });
    }
    if (isTemplateUsed && inlineTemplate) {
      setIsTemplatePendingDelete(true);
    }

    setInlineSummaryFiles((prev) => prev.filter((file) => usedSummaryFileIds.has(file.id)));
    if (!isTemplateUsed) {
      setInlineTemplate(null);
    }
    setInlineRelevanceWarnings([]);
  }, [confirm, inlineSummaryFiles, inlineTemplate, isTemplateUsed, usedSummaryFileIds]);

  const handleSyncReferencesToSidecar = useCallback((
    files: SourceFileMeta[],
    rawFiles?: Map<string, File>,
  ) => {
    const currentFiles = documentMetadata?.sourceFiles ?? [];
    const existingKeys = new Set(currentFiles.map((file) => file.name));
    const newFiles = files.filter((file) => !existingKeys.has(file.name));
    if (newFiles.length === 0) return;

    setLocalDocumentMetadata({ sourceFiles: [...currentFiles, ...newFiles] });
    setHasUnsavedChanges(true);

    for (const file of files) {
      if (file.origin === 'reference') {
        const matched = inlineSummaryFiles.find((summaryFile) => summaryFile.name === file.name);
        if (matched) {
          setUsedSummaryFileIds((prev) => new Set(prev).add(matched.id));
        }
      } else if (file.origin === 'template') {
        setIsTemplateUsed(true);
      }
    }

    if (rawFiles) {
      for (const [tempPath, file] of rawFiles.entries()) {
        pendingAttachmentsRef.current.set(tempPath, file);
      }
    }
  }, [documentMetadata?.sourceFiles, inlineSummaryFiles, pendingAttachmentsRef, setHasUnsavedChanges, setLocalDocumentMetadata]);

  return {
    state: {
      inlineTemplate,
      setInlineTemplate,
      inlineSummaryFiles,
      setInlineSummaryFiles,
      inlineRelevanceWarnings,
      setInlineRelevanceWarnings,
      usedSummaryFileIds,
      setUsedSummaryFileIds,
      isTemplateUsed,
      setIsTemplateUsed,
      pendingDeletedFileIds,
      setPendingDeletedFileIds,
      isTemplatePendingDelete,
      setIsTemplatePendingDelete,
    },
    removeReferenceFromSidecar,
    handleRemoveSummaryFile,
    handleRestoreSummaryFile,
    handleRemoveTemplate,
    handleRestoreTemplate,
    handleClearAll,
    handleSyncReferencesToSidecar,
  };
}
