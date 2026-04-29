import { useCallback, useState } from 'react';
import { docAssistApi } from '@/lib/api/endpoints/ai';
import { toast } from '@/lib/toast';
import { resolveTitlePathRecommendation, type RecommendationStatus } from '@/lib/utils/titlePathRecommendation';
import type { DocumentMetadata } from '@/types';

interface UseDocumentInfoRecommendationOptions {
  canUseAssistant: boolean;
  isCreateMode: boolean;
  isGeneratedTemplateMode: boolean;
  filePath: string | null | undefined;
  getCurrentDraftContent: () => string;
  setLocalDocumentMetadata: (m: Partial<DocumentMetadata>) => void;
  setCreatePath: (p: string) => void;
  setHasUnsavedChanges: (v: boolean) => void;
  setPendingFileMove: (p: string | null) => void;
}

type ConsumeMode = 'suggest' | 'auto';

export function useDocumentInfoRecommendation(opts: UseDocumentInfoRecommendationOptions) {
  const {
    canUseAssistant,
    isCreateMode,
    isGeneratedTemplateMode,
    filePath,
    getCurrentDraftContent,
    setLocalDocumentMetadata,
    setCreatePath,
    setHasUnsavedChanges,
    setPendingFileMove,
  } = opts;

  const [displayCreatePath, setDisplayCreatePath] = useState('');
  const [displaySuggestedTitle, setDisplaySuggestedTitle] = useState('');
  const [pendingSuggestedInfoTitle, setPendingSuggestedInfoTitle] = useState<string | null>(null);
  const [pendingSuggestedInfoPath, setPendingSuggestedInfoPath] = useState<string | null>(null);
  const [pendingInfoPathValidationMessage, setPendingInfoPathValidationMessage] = useState('');
  const [titleRecommendationStatus, setTitleRecommendationStatus] = useState<RecommendationStatus>('idle');
  const [pathRecommendationStatus, setPathRecommendationStatus] = useState<RecommendationStatus>('idle');
  const [pathValidationMessage, setPathValidationMessage] = useState('');

  const resetInfoRecommendation = useCallback(() => {
    setDisplayCreatePath('');
    setDisplaySuggestedTitle('');
    setPendingSuggestedInfoTitle(null);
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');
    setTitleRecommendationStatus('idle');
    setPathRecommendationStatus('idle');
    setPathValidationMessage('');
  }, []);

  const markRecommendationLoading = useCallback(() => {
    setTitleRecommendationStatus('loading');
    setPathRecommendationStatus('loading');
  }, []);

  const markRecommendationError = useCallback(() => {
    setDisplaySuggestedTitle('');
    setDisplayCreatePath('');
    setPendingSuggestedInfoTitle(null);
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');
    setPathValidationMessage('');
    setTitleRecommendationStatus('error');
    setPathRecommendationStatus('error');
  }, []);

  const applySuggestedInfoTitle = useCallback((title: string) => {
    setDisplaySuggestedTitle(title);
    setLocalDocumentMetadata({ title });
  }, [setLocalDocumentMetadata]);

  const applySuggestedInfoPath = useCallback((path: string) => {
    setDisplayCreatePath(path);
    setCreatePath(path);
  }, [setCreatePath]);

  const consumeTitlePathRecommendation = useCallback((
    resolved: ReturnType<typeof resolveTitlePathRecommendation>,
    mode: ConsumeMode,
  ) => {
    setTitleRecommendationStatus(resolved.titleStatus);
    setPathRecommendationStatus(resolved.pathStatus);

    if (mode === 'auto') {
      setPendingSuggestedInfoTitle(null);
      setPendingSuggestedInfoPath(null);
      setPendingInfoPathValidationMessage('');
      setPathValidationMessage(resolved.pathValidationMessage ?? '');
      if (resolved.title) {
        applySuggestedInfoTitle(resolved.title);
      }
      if (resolved.path) {
        applySuggestedInfoPath(resolved.path);
      }
      return;
    }

    setPathValidationMessage('');
    setPendingSuggestedInfoTitle(resolved.title || null);
    setPendingSuggestedInfoPath(resolved.path || null);
    setPendingInfoPathValidationMessage(resolved.path ? '' : (resolved.pathValidationMessage ?? ''));
  }, [applySuggestedInfoPath, applySuggestedInfoTitle]);

  const requestInfoRecommendation = useCallback(async () => {
    if (!canUseAssistant) {
      toast.error('AI 추천을 사용할 권한이 없습니다.');
      return;
    }

    const draftContent = getCurrentDraftContent();
    if (!draftContent.trim()) return;

    setTitleRecommendationStatus('loading');
    setPathRecommendationStatus('loading');
    setPendingSuggestedInfoTitle(null);
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');

    try {
      const res = await docAssistApi.recommendTitleAndPath({
        currentContent: draftContent,
        contentType: isGeneratedTemplateMode ? 'template' : 'document',
      });
      if (res.success && res.data) {
        const resolved = resolveTitlePathRecommendation(res.data, {
          fallbackContent: draftContent,
        });
        consumeTitlePathRecommendation(resolved, 'suggest');
      } else {
        setTitleRecommendationStatus('error');
        setPathRecommendationStatus('error');
      }
    } catch {
      setTitleRecommendationStatus('error');
      setPathRecommendationStatus('error');
    }
  }, [canUseAssistant, consumeTitlePathRecommendation, getCurrentDraftContent, isGeneratedTemplateMode]);

  const handleAcceptSuggestedInfoTitle = useCallback(() => {
    if (!pendingSuggestedInfoTitle) return;
    applySuggestedInfoTitle(pendingSuggestedInfoTitle);
    setPendingSuggestedInfoTitle(null);
  }, [applySuggestedInfoTitle, pendingSuggestedInfoTitle]);

  const handleDismissSuggestedInfoTitle = useCallback(() => {
    setPendingSuggestedInfoTitle(null);
  }, []);

  const handleAcceptSuggestedInfoPath = useCallback(() => {
    if (!pendingSuggestedInfoPath) return;
    if (isCreateMode) {
      applySuggestedInfoPath(pendingSuggestedInfoPath);
    } else {
      if (filePath && pendingSuggestedInfoPath !== filePath) {
        setPendingFileMove(pendingSuggestedInfoPath);
        setHasUnsavedChanges(true);
      }
    }
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');
  }, [applySuggestedInfoPath, filePath, isCreateMode, pendingSuggestedInfoPath, setHasUnsavedChanges, setPendingFileMove]);

  const handleDismissSuggestedInfoPath = useCallback(() => {
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');
  }, []);

  return {
    // state values
    displayCreatePath,
    displaySuggestedTitle,
    pendingSuggestedInfoTitle,
    pendingSuggestedInfoPath,
    pendingInfoPathValidationMessage,
    titleRecommendationStatus,
    pathRecommendationStatus,
    pathValidationMessage,

    // raw setters (temporary bridge for external effects)
    setDisplayCreatePath,
    setDisplaySuggestedTitle,
    setPendingSuggestedInfoTitle,
    setPendingSuggestedInfoPath,
    setPendingInfoPathValidationMessage,
    setTitleRecommendationStatus,
    setPathRecommendationStatus,
    setPathValidationMessage,

    // named helpers
    resetInfoRecommendation,
    markRecommendationLoading,
    markRecommendationError,

    // primary actions
    applySuggestedInfoTitle,
    applySuggestedInfoPath,
    consumeTitlePathRecommendation,
    requestInfoRecommendation,
    handleAcceptSuggestedInfoTitle,
    handleDismissSuggestedInfoTitle,
    handleAcceptSuggestedInfoPath,
    handleDismissSuggestedInfoPath,
  };
}
