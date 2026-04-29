'use client';

import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TemplateItem, TemplateReferenceDoc } from '@/types/template';
import type { ConfirmOptions } from '@/stores/confirm.store';
import { fetchWithSharedAuth } from '@/lib/api/sharedAuth';

interface FailedRestoreFile {
  id: string;
  name: string;
  path: string;
}

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

  setInlineRelevanceWarnings: Dispatch<SetStateAction<string[]>>;

  failedRestoreFiles: FailedRestoreFile[];
  setFailedRestoreFiles: Dispatch<SetStateAction<FailedRestoreFile[]>>;
  setIsRetryingRestore: Dispatch<SetStateAction<boolean>>;

  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export interface UseDocumentReferenceLifecycleResult {
  handleRemoveSummaryFile: (id: string) => Promise<void>;
  handleRestoreSummaryFile: (id: string) => void;
  handleRemoveTemplate: () => Promise<void>;
  handleRestoreTemplate: () => void;
  handleRemoveTemplateReference: (path: string) => Promise<void>;
  handleRestoreTemplateReference: (path: string) => void;
  handleClearAll: () => Promise<void>;
  handleRetryRestoreFiles: () => Promise<void>;
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
    setInlineRelevanceWarnings,
    failedRestoreFiles,
    setFailedRestoreFiles,
    setIsRetryingRestore,
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

  const handleClearAll = useCallback(async () => {
    const hasUsed = usedSummaryFileIds.size > 0 || isTemplateUsed || usedTemplateRefPaths.size > 0;
    if (hasUsed) {
      const confirmed = await confirm({
        title: '전체 컨텍스트 해제',
        description: '사용된 참조 파일/템플릿이 포함되어 있습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?',
        confirmText: '전체 해제',
        cancelText: '취소',
      });
      if (!confirmed) return;
    }

    const usedRefPaths = templateReferenceDocuments
      .filter((ref) => usedTemplateRefPaths.has(ref.path))
      .map((ref) => ref.path);
    const usedFileIds = inlineSummaryFiles
      .filter((f) => usedSummaryFileIds.has(f.id))
      .map((f) => f.id);
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
    if (usedRefPaths.length > 0) {
      setPendingDeletedRefPaths((prev) => {
        const next = new Set(prev);
        for (const path of usedRefPaths) next.add(path);
        return next;
      });
    }

    const unusedInlineRefIds = new Set(
      templateReferenceDocuments
        .filter((ref) => !usedTemplateRefPaths.has(ref.path) && ref.storage === 'inline' && ref.tempId)
        .flatMap((ref) => ref.tempId ? [ref.tempId] : []),
    );
    setInlineSummaryFiles((prev) => prev.filter((f) => usedSummaryFileIds.has(f.id) && !unusedInlineRefIds.has(f.id)));
    if (!isTemplateUsed) {
      setInlineTemplate(null);
    }
    for (const ref of templateReferenceDocuments) {
      if (!usedTemplateRefPaths.has(ref.path)) {
        removeTemplateReference(ref.path);
      }
    }
    setInlineRelevanceWarnings([]);
  }, [
    confirm,
    inlineSummaryFiles,
    inlineTemplate,
    isTemplateUsed,
    removeTemplateReference,
    templateReferenceDocuments,
    usedSummaryFileIds,
    usedTemplateRefPaths,
    setPendingDeletedFileIds,
    setPendingDeletedRefPaths,
    setInlineSummaryFiles,
    setInlineTemplate,
    setIsTemplatePendingDelete,
    setInlineRelevanceWarnings,
  ]);

  const handleRetryRestoreFiles = useCallback(async () => {
    if (failedRestoreFiles.length === 0) return;
    setIsRetryingRestore(true);
    const stillFailed: FailedRestoreFile[] = [];
    const fetched: Array<{ name: string; textContent: string }> = [];

    await Promise.all(
      failedRestoreFiles.map(async (f) => {
        if (!f.path || f.path.startsWith('__pending__')) {
          stillFailed.push(f);
          return;
        }
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetchWithSharedAuth(
            `/api/file/serve-attachment?path=${encodeURIComponent(f.path)}`,
            { signal: controller.signal },
          );
          clearTimeout(timeout);
          if (res.ok) {
            const text = await res.text();
            if (text.trim().length > 0) {
              fetched.push({ name: f.name, textContent: text.slice(0, 12000) });
              return;
            }
          }
          stillFailed.push(f);
        } catch {
          stillFailed.push(f);
        }
      }),
    );

    if (fetched.length > 0) {
      setInlineSummaryFiles((prev) =>
        prev.map((item) => {
          const match = fetched.find((c) => c.name === item.name);
          return match ? { ...item, textContent: match.textContent } : item;
        }),
      );
    }

    setFailedRestoreFiles(stillFailed);
    setInlineRelevanceWarnings((prev) => {
      const filtered = prev.filter((w) => !w.startsWith('참조 파일 복원 실패:'));
      if (stillFailed.length > 0) {
        filtered.push(
          `참조 파일 복원 실패: ${stillFailed.map((f) => f.name).join(', ')}. AI 작성 시 해당 파일 내용이 반영되지 않을 수 있습니다.`,
        );
      }
      return filtered;
    });
    setIsRetryingRestore(false);
  }, [failedRestoreFiles, setIsRetryingRestore, setInlineSummaryFiles, setFailedRestoreFiles, setInlineRelevanceWarnings]);

  return {
    handleRemoveSummaryFile,
    handleRestoreSummaryFile,
    handleRemoveTemplate,
    handleRestoreTemplate,
    handleRemoveTemplateReference,
    handleRestoreTemplateReference,
    handleClearAll,
    handleRetryRestoreFiles,
  };
}
