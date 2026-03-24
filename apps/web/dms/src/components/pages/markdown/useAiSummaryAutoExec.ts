'use client';

import { useEffect, useRef } from 'react';
import { docAssistApi } from '@/lib/api';
import { resolveTitlePathRecommendation } from '@/lib/utils/titlePathRecommendation';
import { buildDocumentSidecarDiffSnapshot } from './documentPageUtils';
import type { CreateEntryType, MetadataRecommendationResult } from './documentPageTypes';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';

interface UseAiSummaryAutoExecParams {
  autoRecommendMetadata: (
    content: string,
    options?: { signal?: AbortSignal; isRequestActive?: () => boolean },
  ) => Promise<MetadataRecommendationResult | null>;
  applyMetadataRecommendation: (recommendation: MetadataRecommendationResult | null, mode: 'suggest' | 'auto') => void;
  consumeAiSummaryPending: () => { summaryFiles: InlineSummaryFileItem[] } | null;
  consumeTitlePathRecommendation: (
    resolved: ReturnType<typeof resolveTitlePathRecommendation>,
    mode: 'suggest' | 'auto',
    helpers?: { setDisplaySuggestedTitle?: (title: string) => void; setDisplayCreatePath?: (path: string) => void },
  ) => void;
  createEntryType: CreateEntryType;
  isComposing: boolean;
  reset: () => void;
  resetDiff: () => void;
  resetSuggestionState: () => void;
  setContent: (content: string) => void;
  setCreatePath: (path: string) => void;
  setDiffTarget: (target: 'content' | 'metadata') => void;
  setDisplayCreatePath: (path: string) => void;
  setDisplaySuggestedTitle: (title: string) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setInlineRelevanceWarnings: React.Dispatch<React.SetStateAction<string[]>>;
  setInlineSummaryFiles: React.Dispatch<React.SetStateAction<InlineSummaryFileItem[]>>;
  setIsComposing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditing: (value: boolean) => void;
  setMode: (mode: 'viewer' | 'editor' | 'create') => void;
  setOriginalMetaSnapshot: (snapshot: ReturnType<typeof buildDocumentSidecarDiffSnapshot> | null) => void;
  setPathRecommendationStatus: (status: 'idle' | 'loading' | 'resolved' | 'error') => void;
  setSaveAsTemplateOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setSurfaceMode: React.Dispatch<React.SetStateAction<'edit' | 'preview' | 'diff'>>;
  setTitleRecommendationStatus: (status: 'idle' | 'loading' | 'resolved' | 'error') => void;
}

export function useAiSummaryAutoExec({
  autoRecommendMetadata,
  applyMetadataRecommendation,
  consumeAiSummaryPending,
  consumeTitlePathRecommendation,
  createEntryType,
  isComposing,
  reset,
  resetDiff,
  resetSuggestionState,
  setContent,
  setCreatePath,
  setDiffTarget,
  setDisplayCreatePath,
  setDisplaySuggestedTitle,
  setHasUnsavedChanges,
  setInlineRelevanceWarnings,
  setInlineSummaryFiles,
  setIsComposing,
  setIsEditing,
  setMode,
  setOriginalMetaSnapshot,
  setPathRecommendationStatus,
  setSaveAsTemplateOnly,
  setSurfaceMode,
  setTitleRecommendationStatus,
}: UseAiSummaryAutoExecParams) {
  const aiSummaryConsumedRef = useRef(false);
  const aiSummaryCompletedRef = useRef(false);

  useEffect(() => {
    if (!createEntryType || createEntryType === 'launcher') return;

    reset();
    setContent('');
    setMode('create');
    setIsEditing(true);
    setCreatePath('drafts/new-doc.md');
    setDisplayCreatePath('');
    setDisplaySuggestedTitle('');
    resetSuggestionState();
    setOriginalMetaSnapshot(buildDocumentSidecarDiffSnapshot(null));
    setSurfaceMode('edit');
    setDiffTarget('content');
    resetDiff();
    setSaveAsTemplateOnly(createEntryType === 'template');

    aiSummaryConsumedRef.current = false;
    aiSummaryCompletedRef.current = false;
  }, [
    createEntryType,
    reset,
    resetDiff,
    resetSuggestionState,
    setContent,
    setCreatePath,
    setDiffTarget,
    setDisplayCreatePath,
    setDisplaySuggestedTitle,
    setIsEditing,
    setMode,
    setOriginalMetaSnapshot,
    setSaveAsTemplateOnly,
    setSurfaceMode,
  ]);

  useEffect(() => {
    if (createEntryType !== 'ai-summary' || aiSummaryConsumedRef.current) return;
    aiSummaryConsumedRef.current = true;

    const runAiSummary = async () => {
      const pending = consumeAiSummaryPending();
      if (!pending || pending.summaryFiles.length === 0) {
        setIsComposing(false);
        return;
      }

      setInlineSummaryFiles(pending.summaryFiles);

      try {
        const fileNames = pending.summaryFiles.map((file) => file.name).join(', ');
        const instruction = `다음 파일의 본문 내용을 면밀히 파악한 뒤, 본문 내용에 맞게 문단을 구성하고 요약해주세요: ${fileNames}`;
        const summaryFilesPayload = pending.summaryFiles.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          textContent: item.textContent,
        }));

        const response = await docAssistApi.compose({
          instruction,
          currentContent: '',
          templates: [],
          summaryFiles: summaryFilesPayload,
        });

        if (response.success && response.data) {
          const generated = typeof response.data.text === 'string' ? response.data.text.trim() : '';
          if (generated) {
            setTitleRecommendationStatus('loading');
            setPathRecommendationStatus('loading');
            const [metadataResult, titlePathResult] = await Promise.allSettled([
              autoRecommendMetadata(generated),
              docAssistApi.recommendTitleAndPath({ currentContent: generated }),
            ]);

            if (metadataResult.status === 'fulfilled') {
              applyMetadataRecommendation(metadataResult.value, 'auto');
            }

            if (titlePathResult.status === 'fulfilled' && titlePathResult.value.success && titlePathResult.value.data) {
              const resolved = resolveTitlePathRecommendation(titlePathResult.value.data, {
                fallbackContent: generated,
              });
              consumeTitlePathRecommendation(resolved, 'auto', {
                setDisplaySuggestedTitle,
                setDisplayCreatePath,
              });
              if (!resolved.path) {
                if (titlePathResult.value.data.suggestedFileName) {
                  setCreatePath(`drafts/${titlePathResult.value.data.suggestedFileName}`);
                } else if (response.data.suggestedPath) {
                  setCreatePath(response.data.suggestedPath);
                }
              }
            } else if (response.data.suggestedPath) {
              setCreatePath(response.data.suggestedPath);
              setDisplaySuggestedTitle('');
              setDisplayCreatePath('');
              setTitleRecommendationStatus('error');
              setPathRecommendationStatus('error');
            } else {
              setDisplaySuggestedTitle('');
              setDisplayCreatePath('');
              setTitleRecommendationStatus('error');
              setPathRecommendationStatus('error');
            }

            setContent(generated);
            aiSummaryCompletedRef.current = true;
          }
          setInlineRelevanceWarnings([]);
        }
      } finally {
        setIsComposing(false);
      }
    };

    void runAiSummary();
  }, [
    applyMetadataRecommendation,
    autoRecommendMetadata,
    consumeAiSummaryPending,
    consumeTitlePathRecommendation,
    createEntryType,
    setContent,
    setCreatePath,
    setDisplayCreatePath,
    setDisplaySuggestedTitle,
    setInlineRelevanceWarnings,
    setInlineSummaryFiles,
    setIsComposing,
    setPathRecommendationStatus,
    setTitleRecommendationStatus,
  ]);

  useEffect(() => {
    if (!aiSummaryCompletedRef.current || isComposing) return;
    aiSummaryCompletedRef.current = false;

    const frameId = requestAnimationFrame(() => {
      setHasUnsavedChanges(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [isComposing, setHasUnsavedChanges]);
}
