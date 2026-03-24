'use client';

import { useCallback, useState } from 'react';
import { docAssistApi } from '@/lib/api';
import type { DocumentMetadata } from '@/types';
import type { MetadataRecommendationResult } from './documentPageTypes';

interface UseDocumentPageAIParams {
  documentMetadata: DocumentMetadata | null;
  setLocalDocumentMetadata: (update: Partial<DocumentMetadata>) => void;
}

export function useDocumentPageAI({
  documentMetadata,
  setLocalDocumentMetadata,
}: UseDocumentPageAIParams) {
  const [pendingSuggestedTags, setPendingSuggestedTags] = useState<string[] | undefined>(undefined);
  const [pendingAiSuggestion, setPendingAiSuggestion] = useState<string | null | undefined>(undefined);
  const [isAutoSuggestingTags, setIsAutoSuggestingTags] = useState(false);
  const [isAutoSuggestingSummary, setIsAutoSuggestingSummary] = useState(false);

  const clearPendingSuggestedTags = useCallback(() => setPendingSuggestedTags(undefined), []);
  const clearPendingAiSuggestion = useCallback(() => setPendingAiSuggestion(undefined), []);

  const autoRecommendMetadata = useCallback(async (
    editorContent: string,
    options?: { signal?: AbortSignal; isRequestActive?: () => boolean },
  ): Promise<MetadataRecommendationResult | null> => {
    if (!editorContent.trim()) return null;

    setIsAutoSuggestingTags(true);
    setIsAutoSuggestingSummary(true);

    const tagPromise = docAssistApi.compose({
      instruction: '다음 문서를 대표하는 핵심 태그를 5개 이내로 추출하세요. 태그만 쉼표로 구분하여 반환하세요. 다른 설명 없이 태그만 출력하세요.',
      currentContent: editorContent,
    }, { signal: options?.signal }).finally(() => {
      setIsAutoSuggestingTags(false);
    });

    const summaryPromise = docAssistApi.compose({
      instruction: '다음 문서의 핵심 내용을 2~3문장으로 요약하세요. 요약문만 출력하세요.',
      currentContent: editorContent,
    }, { signal: options?.signal }).finally(() => {
      setIsAutoSuggestingSummary(false);
    });

    const [tagRes, summaryRes] = await Promise.allSettled([tagPromise, summaryPromise]);
    if (options?.signal?.aborted || (options?.isRequestActive && !options.isRequestActive())) return null;

    let suggestedTags: string[] = [];
    if (tagRes.status === 'fulfilled' && tagRes.value.data?.text) {
      suggestedTags = tagRes.value.data.text
        .split(/[,،、\n]+/)
        .map((t: string) => t.replace(/^[#\-*\s]+/, '').trim())
        .filter((t: string) => t.length > 0);
    }

    let summaryText: string | null = null;
    if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.text) {
      summaryText = summaryRes.value.data.text.trim();
    }

    return { suggestedTags, summaryText };
  }, []);

  const applyMetadataRecommendation = useCallback((
    recommendation: MetadataRecommendationResult | null,
    mode: 'suggest' | 'auto',
  ) => {
    if (!recommendation) return;

    if (mode === 'auto') {
      const currentTags = documentMetadata?.tags ?? [];
      const newTags = recommendation.suggestedTags.filter((tag) => !currentTags.includes(tag));
      const update: Partial<DocumentMetadata> = {};
      if (newTags.length > 0) {
        update.tags = [...currentTags, ...newTags];
      }
      if (recommendation.summaryText) {
        update.summary = recommendation.summaryText;
      }
      if (Object.keys(update).length > 0) {
        setLocalDocumentMetadata(update);
      }
      return;
    }

    if (recommendation.suggestedTags.length > 0) {
      setPendingSuggestedTags(recommendation.suggestedTags);
    }
    if (recommendation.summaryText) {
      setPendingAiSuggestion(recommendation.summaryText);
    }
  }, [documentMetadata?.tags, setLocalDocumentMetadata]);

  return {
    pendingSuggestedTags,
    pendingAiSuggestion,
    isAutoSuggestingTags,
    isAutoSuggestingSummary,
    clearPendingSuggestedTags,
    clearPendingAiSuggestion,
    autoRecommendMetadata,
    applyMetadataRecommendation,
  };
}
