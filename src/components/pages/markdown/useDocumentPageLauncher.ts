'use client';

import { useCallback } from 'react';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';

interface UseDocumentPageLauncherParams {
  tabId: string | null;
  closeTab: (tabId: string) => void;
  setAiSummaryPending: (payload: { summaryFiles: InlineSummaryFileItem[] }) => void;
  setIsComposing: React.Dispatch<React.SetStateAction<boolean>>;
  updateTab: (tabId: string, updates: { path?: string; title?: string }) => void;
}

export function useDocumentPageLauncher({
  tabId,
  closeTab,
  setAiSummaryPending,
  setIsComposing,
  updateTab,
}: UseDocumentPageLauncherParams) {
  const handleLauncherNewDoc = useCallback(() => {
    if (!tabId) return;
    updateTab(tabId, { path: '/doc/new-doc', title: '새 문서' });
  }, [tabId, updateTab]);

  const handleLauncherTemplate = useCallback(() => {
    if (!tabId) return;
    updateTab(tabId, { path: '/doc/new-template', title: '새 템플릿' });
  }, [tabId, updateTab]);

  const handleLauncherAiSummary = useCallback((files: InlineSummaryFileItem[]) => {
    if (!tabId || files.length === 0) return;
    setAiSummaryPending({ summaryFiles: files });
    setIsComposing(true);
    updateTab(tabId, { path: '/doc/new-ai-summary', title: 'AI 요약' });
  }, [setAiSummaryPending, setIsComposing, tabId, updateTab]);

  const handleLauncherClose = useCallback(() => {
    if (!tabId) return;
    closeTab(tabId);
  }, [closeTab, tabId]);

  return {
    handleLauncherNewDoc,
    handleLauncherTemplate,
    handleLauncherAiSummary,
    handleLauncherClose,
  };
}
