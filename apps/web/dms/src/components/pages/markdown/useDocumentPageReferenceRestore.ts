'use client';

import { useCallback, useState } from 'react';
import { templateApi } from '@/lib/api';
import type { DocumentMetadata } from '@/types';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TemplateItem } from '@/types/template';
import type { FailedRestoreFile } from './documentPageTypes';

interface UseDocumentPageReferenceRestoreParams {
  setInlineSummaryFiles: React.Dispatch<React.SetStateAction<InlineSummaryFileItem[]>>;
  setInlineTemplate: React.Dispatch<React.SetStateAction<TemplateItem | null>>;
  setInlineRelevanceWarnings: React.Dispatch<React.SetStateAction<string[]>>;
  setUsedSummaryFileIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsTemplateUsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useDocumentPageReferenceRestore({
  setInlineSummaryFiles,
  setInlineTemplate,
  setInlineRelevanceWarnings,
  setUsedSummaryFileIds,
  setIsTemplateUsed,
}: UseDocumentPageReferenceRestoreParams) {
  const [isRestoringReferences, setIsRestoringReferences] = useState(false);
  const [failedRestoreFiles, setFailedRestoreFiles] = useState<FailedRestoreFile[]>([]);
  const [isRetryingRestore, setIsRetryingRestore] = useState(false);

  const handleRetryRestoreFiles = useCallback(async () => {
    if (failedRestoreFiles.length === 0) return;
    setIsRetryingRestore(true);
    const stillFailed: FailedRestoreFile[] = [];
    const fetched: Array<{ name: string; textContent: string }> = [];

    await Promise.all(
      failedRestoreFiles.map(async (file) => {
        if (!file.path || file.path.startsWith('__pending__')) {
          stillFailed.push(file);
          return;
        }
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(
            `/api/file/serve-attachment?path=${encodeURIComponent(file.path)}`,
            { signal: controller.signal },
          );
          clearTimeout(timeout);
          if (res.ok) {
            const text = await res.text();
            if (text.trim().length > 0) {
              fetched.push({ name: file.name, textContent: text.slice(0, 12000) });
              return;
            }
          }
          stillFailed.push(file);
        } catch {
          stillFailed.push(file);
        }
      }),
    );

    if (fetched.length > 0) {
      setInlineSummaryFiles((prev) =>
        prev.map((item) => {
          const match = fetched.find((candidate) => candidate.name === item.name);
          return match ? { ...item, textContent: match.textContent } : item;
        }),
      );
    }

    setFailedRestoreFiles(stillFailed);
    setInlineRelevanceWarnings((prev) => {
      const filtered = prev.filter((warning) => !warning.startsWith('참조 파일 복원 실패:'));
      if (stillFailed.length > 0) {
        filtered.push(
          `참조 파일 복원 실패: ${stillFailed.map((file) => file.name).join(', ')}. AI 작성 시 해당 파일 내용이 반영되지 않을 수 있습니다.`,
        );
      }
      return filtered;
    });
    setIsRetryingRestore(false);
  }, [failedRestoreFiles, setInlineRelevanceWarnings, setInlineSummaryFiles]);

  const restoreReferencesFromMetadata = useCallback(async (metadata: DocumentMetadata | null) => {
    const sourceFiles = metadata?.sourceFiles ?? [];
    const referenceFiles = sourceFiles.filter((file) => file.origin === 'reference');
    const templateFile = sourceFiles.find((file) => file.origin === 'template');

    if (referenceFiles.length === 0 && !templateFile) return;

    setIsRestoringReferences(true);
    const restorePromises: Promise<void>[] = [];

    if (referenceFiles.length > 0) {
      const restored: InlineSummaryFileItem[] = referenceFiles.map((file) => ({
        id: `${file.name}-restored-${file.size}`,
        name: file.name,
        type: file.type,
        size: file.size,
        textContent: '',
      }));
      setInlineSummaryFiles((prev) => {
        const map = new Map(prev.map((item) => [item.name, item]));
        for (const item of restored) {
          if (!map.has(item.name)) map.set(item.name, item);
        }
        return Array.from(map.values());
      });
      setUsedSummaryFileIds(new Set(restored.map((item) => item.id)));

      restorePromises.push((async () => {
        const failed: FailedRestoreFile[] = [];
        const results = await Promise.all(
          referenceFiles.map(async (file) => {
            const itemId = `${file.name}-restored-${file.size}`;
            if (!file.path || file.path.startsWith('__pending__')) {
              failed.push({ id: itemId, name: file.name, path: file.path || '' });
              return null;
            }
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);
              const res = await fetch(
                `/api/file/serve-attachment?path=${encodeURIComponent(file.path)}`,
                { signal: controller.signal },
              );
              clearTimeout(timeout);
              if (res.ok) {
                const text = await res.text();
                if (text.trim().length > 0) {
                  return { name: file.name, textContent: text.slice(0, 12000) };
                }
              }
              failed.push({ id: itemId, name: file.name, path: file.path });
            } catch {
              failed.push({ id: itemId, name: file.name, path: file.path || '' });
            }
            return null;
          }),
        );

        const fetched = results.filter(Boolean) as Array<{ name: string; textContent: string }>;
        if (fetched.length > 0) {
          setInlineSummaryFiles((prev) =>
            prev.map((item) => {
              const match = fetched.find((candidate) => candidate.name === item.name);
              return match ? { ...item, textContent: match.textContent } : item;
            }),
          );
        }
        if (failed.length > 0) {
          setFailedRestoreFiles(failed);
          setInlineRelevanceWarnings((prev) => [
            ...prev,
            `참조 파일 복원 실패: ${failed.map((file) => file.name).join(', ')}. AI 작성 시 해당 파일 내용이 반영되지 않을 수 있습니다.`,
          ]);
        }
      })());
    }

    if (templateFile) {
      const templateItem: TemplateItem = {
        id: templateFile.path || templateFile.name,
        name: templateFile.name,
        kind: 'document',
        scope: 'personal',
        content: '',
        updatedAt: new Date().toISOString(),
        sourcePath: templateFile.path,
        status: 'active',
        sourceType: 'markdown-file',
        visibility: 'personal',
      };
      setInlineTemplate(templateItem);
      setIsTemplateUsed(true);

      restorePromises.push((async () => {
        try {
          const sourcePath = templateFile.path || '';
          const scope: 'global' | 'personal' = sourcePath.startsWith('global/') ? 'global' : 'personal';
          const baseName = sourcePath.split('/').pop()?.replace(/\.md$/, '') || '';
          const templateId = baseName || templateItem.id;

          const res = await templateApi.get(templateId, scope);
          if (res.success && res.data?.content) {
            setInlineTemplate((prev) => prev ? { ...prev, content: res.data!.content, scope } : prev);
            return;
          }

          const listRes = await templateApi.list();
          if (listRes.success && listRes.data) {
            const all = [...(listRes.data.global ?? []), ...(listRes.data.personal ?? [])];
            const match = all.find((template) => template.name === templateFile.name || template.id === templateId);
            if (match?.content) {
              setInlineTemplate((prev) => prev ? { ...prev, content: match.content, scope: match.scope } : prev);
            }
          }
        } catch {
          // ignore restore failure
        }
      })());
    }

    await Promise.allSettled(restorePromises);
    setIsRestoringReferences(false);
  }, [setInlineRelevanceWarnings, setInlineSummaryFiles, setInlineTemplate, setIsTemplateUsed, setUsedSummaryFileIds]);

  return {
    isRestoringReferences,
    failedRestoreFiles,
    isRetryingRestore,
    setFailedRestoreFiles,
    setIsRestoringReferences,
    handleRetryRestoreFiles,
    restoreReferencesFromMetadata,
  };
}
