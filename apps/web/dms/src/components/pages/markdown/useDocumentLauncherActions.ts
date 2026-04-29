import { useCallback } from 'react';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';

interface UseDocumentLauncherActionsOptions {
  tabId: string | null | undefined;
  canWriteDocuments: boolean;
  canManageTemplates: boolean;
  canUseAssistant: boolean;
  updateTab: (id: string, patch: { path?: string; title?: string }) => void;
  closeTab: (id: string) => void;
  setAiSummaryPending: (pending: { summaryFiles: InlineSummaryFileItem[] }) => void;
  setIsComposing: (v: boolean) => void;
}

export function useDocumentLauncherActions(opts: UseDocumentLauncherActionsOptions) {
  const {
    tabId,
    canWriteDocuments,
    canManageTemplates,
    canUseAssistant,
    updateTab,
    closeTab,
    setAiSummaryPending,
    setIsComposing,
  } = opts;

  const handleLauncherNewDoc = useCallback(() => {
    if (!canWriteDocuments || !tabId) return;
    updateTab(tabId, { path: '/doc/new-doc', title: '새 문서' });
  }, [canWriteDocuments, tabId, updateTab]);

  const handleLauncherTemplate = useCallback(() => {
    if (!canManageTemplates || !tabId) return;
    updateTab(tabId, { path: '/doc/new-template', title: '새 템플릿' });
  }, [canManageTemplates, tabId, updateTab]);

  const handleLauncherAiSummary = useCallback((files: InlineSummaryFileItem[]) => {
    if (!canWriteDocuments || !canUseAssistant || !tabId || files.length === 0) return;
    setAiSummaryPending({ summaryFiles: files });
    setIsComposing(true);
    updateTab(tabId, { path: '/doc/new-ai-summary', title: 'AI 요약' });
  }, [canUseAssistant, canWriteDocuments, tabId, updateTab, setAiSummaryPending, setIsComposing]);

  const handleLauncherClose = useCallback(() => {
    if (!tabId) return;
    closeTab(tabId);
  }, [tabId, closeTab]);

  return {
    handleLauncherNewDoc,
    handleLauncherTemplate,
    handleLauncherAiSummary,
    handleLauncherClose,
  };
}
