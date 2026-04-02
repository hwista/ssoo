'use client';

import { fileApi } from '@/lib/api';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TemplateReferenceDoc } from '@/types/template';

interface BuildComposeContextResult {
  composeSummaryFiles: InlineSummaryFileItem[];
  warnings: string[];
  resolvedRefPaths: string[];
}

export async function buildComposeContextFiles(params: {
  inlineSummaryFiles: InlineSummaryFileItem[];
  templateReferenceDocuments: TemplateReferenceDoc[];
  pendingDeletedFileIds: Set<string>;
  pendingDeletedRefPaths: Set<string>;
}): Promise<BuildComposeContextResult> {
  const {
    inlineSummaryFiles,
    templateReferenceDocuments,
    pendingDeletedFileIds,
    pendingDeletedRefPaths,
  } = params;

  const activeSummaryFiles = inlineSummaryFiles.filter((file) => !pendingDeletedFileIds.has(file.id));
  const inlineRefIds = new Set(
    templateReferenceDocuments.flatMap((ref) => ref.tempId ? [ref.tempId] : []),
  );
  const deduplicatedSummaryFiles = activeSummaryFiles.filter((file) => !inlineRefIds.has(file.id));

  const refFiles: InlineSummaryFileItem[] = [];
  const warnings: string[] = [];
  const resolvedRefPaths: string[] = [];

  for (const doc of templateReferenceDocuments) {
    if (pendingDeletedRefPaths.has(doc.path)) continue;

    if (doc.storage === 'inline' && doc.textContent) {
      refFiles.push({
        id: doc.tempId || `tpl-ref-${doc.path}`,
        name: doc.title || doc.path,
        type: doc.mimeType || 'text/plain',
        size: doc.textContent.length,
        textContent: doc.textContent,
      });
      resolvedRefPaths.push(doc.path);
      continue;
    }

    try {
      const result = await fileApi.read(doc.path);
      if (result.success && result.data) {
        refFiles.push({
          id: `tpl-ref-${doc.path}`,
          name: doc.title || doc.path.split('/').pop() || doc.path,
          type: doc.mimeType || 'text/markdown',
          size: result.data.length,
          textContent: result.data,
        });
        resolvedRefPaths.push(doc.path);
      } else {
        warnings.push(`참조를 읽지 못했습니다: ${doc.path}`);
      }
    } catch {
      warnings.push(`참조를 읽지 못했습니다: ${doc.path}`);
    }
  }

  return {
    composeSummaryFiles: [...deduplicatedSummaryFiles, ...refFiles],
    warnings,
    resolvedRefPaths,
  };
}
