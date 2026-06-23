'use client';

import { fileApi } from '@/lib/api/endpoints/files';
import { hasUsableSummaryContent, isSummaryFileExtracting } from '@/lib/summaryFileStatus';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TemplateReferenceDoc } from '@/types/template';

interface BuildComposeContextResult {
  composeSummaryFiles: InlineSummaryFileItem[];
  warnings: string[];
  resolvedRefPaths: string[];
  hasSelectedSummaryFiles: boolean;
  hasExtractingSummaryFiles: boolean;
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
  const activeSummaryFileById = new Map(activeSummaryFiles.map((file) => [file.id, file]));
  const activeInlineReferenceDocs = templateReferenceDocuments.filter(
    (ref) => !pendingDeletedRefPaths.has(ref.path) && ref.storage === 'inline' && ref.tempId,
  );
  const inlineRefIds = new Set(
    activeInlineReferenceDocs.flatMap((ref) => ref.tempId ? [ref.tempId] : []),
  );
  const deduplicatedSummaryFiles = activeSummaryFiles.filter((file) => !inlineRefIds.has(file.id));
  const selectedSummaryFiles: InlineSummaryFileItem[] = [];
  const selectedSummaryFileIds = new Set<string>();
  const refFiles: InlineSummaryFileItem[] = [];
  const warnings: string[] = [];
  const resolvedRefPaths: string[] = [];

  const registerSelectedSummaryFile = (file: InlineSummaryFileItem) => {
    if (selectedSummaryFileIds.has(file.id)) return;
    selectedSummaryFileIds.add(file.id);
    selectedSummaryFiles.push(file);
  };

  for (const file of deduplicatedSummaryFiles) {
    registerSelectedSummaryFile(file);
  }

  for (const doc of templateReferenceDocuments) {
    if (pendingDeletedRefPaths.has(doc.path)) continue;

    if (doc.storage === 'inline') {
      const inlineSource = doc.tempId ? activeSummaryFileById.get(doc.tempId) : undefined;
      if (inlineSource) {
        registerSelectedSummaryFile(inlineSource);
        if (hasUsableSummaryContent(inlineSource)) {
          refFiles.push(inlineSource);
          resolvedRefPaths.push(doc.path);
        }
        continue;
      }
      if (doc.textContent) {
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
      warnings.push(`참조 파일 복원 실패: ${doc.title || doc.path}. AI 작성 시 해당 파일 내용이 반영되지 않을 수 있습니다.`);
      continue;
    }

    try {
      const result = await fileApi.read(doc.path);
      if (result.success && result.data) {
        const content = result.data.content;
        refFiles.push({
          id: `tpl-ref-${doc.path}`,
          name: doc.title || doc.path.split('/').pop() || doc.path,
          type: doc.mimeType || 'text/markdown',
          size: content.length,
          textContent: content,
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
    hasSelectedSummaryFiles: selectedSummaryFiles.length > 0,
    hasExtractingSummaryFiles: selectedSummaryFiles.some((file) => isSummaryFileExtracting(file)),
  };
}
