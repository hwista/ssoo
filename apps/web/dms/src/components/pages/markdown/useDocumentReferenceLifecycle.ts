'use client';

import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TemplateItem, TemplateReferenceDoc } from '@/types/template';
import type { ConfirmOptions } from '@/stores/confirm.store';

interface UseDocumentReferenceLifecycleOptions {
  inlineSummaryFiles: InlineSummaryFileItem[];
  setInlineSummaryFiles: Dispatch<SetStateAction<InlineSummaryFileItem[]>>;
  usedSummaryFileIds: Set<string>;
  setPendingDeletedFileIds: Dispatch<SetStateAction<Set<string>>>;

  inlineTemplate: TemplateItem | null;
  setInlineTemplate: Dispatch<SetStateAction<TemplateItem | null>>;
  isTemplateUsed: boolean;
  isTemplatePendingDelete: boolean;
  setIsTemplatePendingDelete: Dispatch<SetStateAction<boolean>>;

  templateReferenceDocuments: TemplateReferenceDoc[];
  usedTemplateRefPaths: Set<string>;
  setPendingDeletedRefPaths: Dispatch<SetStateAction<Set<string>>>;
  removeTemplateReference: (path: string) => void;

  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export interface UseDocumentReferenceLifecycleResult {
  handleRemoveSummaryFile: (id: string) => Promise<void>;
  handleRestoreSummaryFile: (id: string) => void;
  handleRemoveTemplate: () => Promise<void>;
  handleRestoreTemplate: () => void;
  handleRemoveTemplateReference: (path: string) => Promise<void>;
  handleRestoreTemplateReference: (path: string) => void;
}

/**
 * 참조 파일/템플릿/참조 문서의 소프트 삭제 + 복원 핸들러 묶음.
 * - 사용된 항목 → confirm → pendingDeleted 셋에 추가 (저장 시 실삭제)
 * - 미사용 항목 → 즉시 제거
 */
export function useDocumentReferenceLifecycle(
  opts: UseDocumentReferenceLifecycleOptions,
): UseDocumentReferenceLifecycleResult {
  const {
    inlineSummaryFiles,
    setInlineSummaryFiles,
    usedSummaryFileIds,
    setPendingDeletedFileIds,
    inlineTemplate,
    setInlineTemplate,
    isTemplateUsed,
    setIsTemplatePendingDelete,
    templateReferenceDocuments,
    usedTemplateRefPaths,
    setPendingDeletedRefPaths,
    removeTemplateReference,
    confirm,
  } = opts;

  const handleRemoveSummaryFile = useCallback(async (id: string) => {
    const file = inlineSummaryFiles.find((f) => f.id === id);
    if (!file) return;

    const isUsed = usedSummaryFileIds.has(id);
    if (isUsed) {
      const confirmed = await confirm({
        title: '참조 파일 해제',
        description: `'${file.name}' 파일은 문서 작성에 사용되었습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?`,
        confirmText: '해제',
        cancelText: '취소',
      });
      if (!confirmed) return;
      setPendingDeletedFileIds((prev) => new Set(prev).add(id));
    } else {
      setInlineSummaryFiles((prev) => prev.filter((item) => item.id !== id));
    }
  }, [inlineSummaryFiles, usedSummaryFileIds, confirm, setPendingDeletedFileIds, setInlineSummaryFiles]);

  const handleRestoreSummaryFile = useCallback((id: string) => {
    setPendingDeletedFileIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [setPendingDeletedFileIds]);

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
    } else {
      setInlineTemplate(null);
    }
  }, [isTemplateUsed, inlineTemplate, confirm, setIsTemplatePendingDelete, setInlineTemplate]);

  const handleRestoreTemplate = useCallback(() => {
    setIsTemplatePendingDelete(false);
  }, [setIsTemplatePendingDelete]);

  const handleRemoveTemplateReference = useCallback(async (path: string) => {
    const ref = templateReferenceDocuments.find((item) => item.path === path);
    if (!ref) return;

    if (usedTemplateRefPaths.has(path)) {
      const refName = ref.title || ref.path.split('/').pop() || ref.path;
      const confirmed = await confirm({
        title: '참조 문서 해제',
        description: `'${refName}' 문서는 AI 작성에 사용되었습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?`,
        confirmText: '해제',
        cancelText: '취소',
      });
      if (!confirmed) return;
      setPendingDeletedRefPaths((prev) => new Set(prev).add(path));
      return;
    }

    removeTemplateReference(path);
    if (ref.storage === 'inline' && ref.tempId) {
      setInlineSummaryFiles((prev) => prev.filter((item) => item.id !== ref.tempId));
    }
  }, [
    confirm,
    removeTemplateReference,
    templateReferenceDocuments,
    usedTemplateRefPaths,
    setPendingDeletedRefPaths,
    setInlineSummaryFiles,
  ]);

  const handleRestoreTemplateReference = useCallback((path: string) => {
    setPendingDeletedRefPaths((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, [setPendingDeletedRefPaths]);

  return {
    handleRemoveSummaryFile,
    handleRestoreSummaryFile,
    handleRemoveTemplate,
    handleRestoreTemplate,
    handleRemoveTemplateReference,
    handleRestoreTemplateReference,
  };
}
