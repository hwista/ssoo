'use client';

import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { DocumentMetadata, SourceFileMeta } from '@/types';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';

interface UseSyncReferencesToMetadataOptions {
  documentMetadata: DocumentMetadata | null;
  inlineSummaryFiles: InlineSummaryFileItem[];
  setLocalDocumentMetadata: (patch: Partial<DocumentMetadata>) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setUsedSummaryFileIds: Dispatch<SetStateAction<Set<string>>>;
  setIsTemplateUsed: Dispatch<SetStateAction<boolean>>;
  setUsedTemplateRefPaths: Dispatch<SetStateAction<Set<string>>>;
  pendingAttachmentsRef: MutableRefObject<Map<string, File>>;
}

export type SyncReferencesToMetadataFn = (
  files: SourceFileMeta[],
  rawFiles?: Map<string, File>,
  resolvedRefPaths?: string[],
) => void;

/**
 * AI 작성 후 사용된 참조 파일/템플릿을 metadata sourceFiles 및 사용 추적 상태에
 * 동기화한다. raw File 객체는 저장 시 업로드를 위해 pendingAttachmentsRef에 등록한다.
 */
export function useSyncReferencesToMetadata(
  opts: UseSyncReferencesToMetadataOptions,
): SyncReferencesToMetadataFn {
  const {
    documentMetadata,
    inlineSummaryFiles,
    setLocalDocumentMetadata,
    setHasUnsavedChanges,
    setUsedSummaryFileIds,
    setIsTemplateUsed,
    setUsedTemplateRefPaths,
    pendingAttachmentsRef,
  } = opts;

  return useCallback<SyncReferencesToMetadataFn>(
    (files, rawFiles, resolvedRefPaths) => {
      const currentFiles = documentMetadata?.sourceFiles ?? [];
      const existingKeys = new Set(currentFiles.map((f) => f.name));

      const newFiles = files.filter((f) => !existingKeys.has(f.name));
      if (newFiles.length > 0) {
        setLocalDocumentMetadata({ sourceFiles: [...currentFiles, ...newFiles] });
        setHasUnsavedChanges(true);
      }

      for (const f of files) {
        if (f.origin === 'reference') {
          const matched = inlineSummaryFiles.find((sf) => sf.name === f.name);
          if (matched) {
            setUsedSummaryFileIds((prev) => new Set(prev).add(matched.id));
          }
        } else if (f.origin === 'template') {
          setIsTemplateUsed(true);
        }
      }

      if (resolvedRefPaths && resolvedRefPaths.length > 0) {
        setUsedTemplateRefPaths((prev) => {
          const next = new Set(prev);
          for (const path of resolvedRefPaths) next.add(path);
          return next;
        });
      }

      if (rawFiles) {
        for (const [tempPath, file] of rawFiles.entries()) {
          pendingAttachmentsRef.current.set(tempPath, file);
        }
      }
    },
    [
      documentMetadata,
      inlineSummaryFiles,
      setLocalDocumentMetadata,
      setHasUnsavedChanges,
      setUsedSummaryFileIds,
      setIsTemplateUsed,
      setUsedTemplateRefPaths,
      pendingAttachmentsRef,
    ],
  );
}
