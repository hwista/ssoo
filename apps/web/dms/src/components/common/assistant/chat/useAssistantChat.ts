'use client';

import { useCallback } from 'react';
import { useAssistantContextStore, useAssistantPanelStore, useAssistantSessionStore } from '@/stores';
import { detectAssistantIntent } from '@/lib/assistant/assistantIntent';
import {
  buildMessageWithReferences,
  createAssistantMessageId,
} from './assistantChatUtils';
import { useAssistantNavigationActions } from './useAssistantNavigationActions';
import { useAssistantMessageActions } from './useAssistantMessageActions';

export function useAssistantChat() {
  const appendMessage = useAssistantSessionStore((state) => state.appendMessage);
  const isProcessing = useAssistantPanelStore((state) => state.isProcessing);
  const setInputDraft = useAssistantPanelStore((state) => state.setInputDraft);
  const setIsProcessing = useAssistantPanelStore((state) => state.setIsProcessing);
  const setSuggestionsCollapsed = useAssistantPanelStore((state) => state.setSuggestionsCollapsed);
  const attachedReferences = useAssistantContextStore((state) => state.attachedReferences);
  const summaryFiles = useAssistantContextStore((state) => state.summaryFiles);
  const setRelevanceWarnings = useAssistantContextStore((state) => state.setRelevanceWarnings);
  const { handleOpenFile, handleOpenHelpAction, openExpandedAskPage } = useAssistantNavigationActions();
  const { runSearch, runAsk, runHelp } = useAssistantMessageActions();

  const buildMessageWithAttachments = useCallback((rawText: string) => {
    return buildMessageWithReferences({
      rawText,
      attachedReferences,
      summaryFiles,
    });
  }, [attachedReferences, summaryFiles]);

  const submitUserMessage = useCallback(async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isProcessing) return;

    const messageText = await buildMessageWithAttachments(trimmed);

    setInputDraft('');
    setSuggestionsCollapsed(true);
    setIsProcessing(true);

    const nextHistory = appendMessage({
      id: createAssistantMessageId(),
      role: 'user',
      kind: 'text',
      text: trimmed,
    });

    try {
      const hasAttachments = attachedReferences.length > 0 || summaryFiles.length > 0;
      if (!hasAttachments) setRelevanceWarnings([]);
      const intent = hasAttachments ? 'ask' : detectAssistantIntent(trimmed);
      if (intent === 'search') {
        await runSearch(trimmed);
      } else if (intent === 'help') {
        await runHelp(messageText);
      } else {
        const nextHistoryWithRefs = [...nextHistory];
        const lastIndex = nextHistoryWithRefs.length - 1;
        const last = nextHistoryWithRefs[lastIndex];
        if (last && last.kind === 'text' && last.role === 'user') {
          nextHistoryWithRefs[lastIndex] = { ...last, text: messageText };
        }
        await runAsk(nextHistoryWithRefs, { attachmentOnly: hasAttachments });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [appendMessage, attachedReferences.length, buildMessageWithAttachments, isProcessing, runAsk, runHelp, runSearch, setInputDraft, setIsProcessing, setRelevanceWarnings, setSuggestionsCollapsed, summaryFiles.length]);

  return {
    submitUserMessage,
    handleOpenFile,
    handleOpenHelpAction,
    openExpandedAskPage,
  };
}
