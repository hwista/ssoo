'use client';

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  buildDocumentSidecarDiffSnapshot,
  stringifyDocumentSidecarDiffSnapshot,
  type DocumentSidecarDiffSnapshot,
} from './documentPageUtils';
import type { DiffTarget, EditorSurfaceMode } from './documentPageTypes';
import type { DocumentMetadata } from '@/types';

interface UseDocumentPageDiffParams {
  surfaceMode: EditorSurfaceMode;
  setSurfaceMode: Dispatch<SetStateAction<EditorSurfaceMode>>;
  getCurrentDraftContent: () => string;
  documentMetadata: DocumentMetadata | null;
}

export function useDocumentPageDiff({
  surfaceMode,
  setSurfaceMode,
  getCurrentDraftContent,
  documentMetadata,
}: UseDocumentPageDiffParams) {
  const [diffTarget, setDiffTarget] = useState<DiffTarget>('content');
  const [diffDraftContent, setDiffDraftContent] = useState<string | null>(null);
  const [diffMetadataSnapshotText, setDiffMetadataSnapshotText] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const currentMetadataSnapshot = useMemo(
    () => buildDocumentSidecarDiffSnapshot(documentMetadata),
    [documentMetadata],
  );

  const metadataDiffCurrentText = useMemo(
    () => stringifyDocumentSidecarDiffSnapshot(currentMetadataSnapshot),
    [currentMetadataSnapshot],
  );

  const metadataDiffOriginalText = useCallback(
    (originalMetaSnapshot: DocumentSidecarDiffSnapshot | null) =>
      stringifyDocumentSidecarDiffSnapshot(
        originalMetaSnapshot ?? buildDocumentSidecarDiffSnapshot(null),
      ),
    [],
  );

  const handleHistoryChange = useCallback((nextCanUndo: boolean, nextCanRedo: boolean) => {
    setCanUndo(nextCanUndo);
    setCanRedo(nextCanRedo);
  }, []);

  const handleDiffToggle = useCallback(() => {
    if (surfaceMode === 'diff') {
      setSurfaceMode('edit');
      setDiffTarget('content');
      return;
    }

    const draftContent = getCurrentDraftContent();
    setDiffDraftContent(draftContent);
    setDiffMetadataSnapshotText(metadataDiffCurrentText);
    setSurfaceMode('diff');
    setDiffTarget('content');
  }, [getCurrentDraftContent, metadataDiffCurrentText, setSurfaceMode, surfaceMode]);

  const resetDiff = useCallback(() => {
    setDiffTarget('content');
    setDiffDraftContent(null);
    setDiffMetadataSnapshotText(null);
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return {
    diffTarget,
    setDiffTarget,
    diffDraftContent,
    diffMetadataSnapshotText,
    canUndo,
    canRedo,
    currentMetadataSnapshot,
    metadataDiffCurrentText,
    metadataDiffOriginalText,
    handleHistoryChange,
    handleDiffToggle,
    resetDiff,
  };
}
