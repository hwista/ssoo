'use client';

import { useCallback } from 'react';
import { useAssistantContextStore, useAssistantPanelStore, useAssistantSessionStore } from '@/stores';
import { toast } from '@/lib/toast';
import { detectAssistantIntent } from '@/lib/assistant/assistantIntent';
import { useRequestLifecycle } from '@/hooks/useRequestLifecycle';
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
  const selectedTemplates = useAssistantContextStore((state) => state.selectedTemplates);
  const setRelevanceWarnings = useAssistantContextStore((state) => state.setRelevanceWarnings);
  const { handleOpenFile, handleOpenHelpAction, openExpandedChatPage } = useAssistantNavigationActions();
  const { runSearch, runAsk, runHelp } = useAssistantMessageActions();
  const requestLifecycle = useRequestLifecycle();

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

    const { token, signal } = requestLifecycle.beginRequest();

    const nextHistory = appendMessage({
      id: createAssistantMessageId(),
      role: 'user',
      kind: 'text',
      text: trimmed,
    });

    try {
      const hasAttachments = attachedReferences.length > 0 || summaryFiles.length > 0;
      if (!hasAttachments) setRelevanceWarnings([]);
      const hasTemplates = selectedTemplates.length > 0;
      const templatePayload = hasTemplates
        ? selectedTemplates.map((t) => ({ name: t.name, content: t.content }))
        : undefined;
      const intent = hasAttachments ? 'ask' : detectAssistantIntent(trimmed);
      if (intent === 'search') {
        await runSearch(trimmed, {
          signal,
          shouldHandle: () => requestLifecycle.isRequestActive(token),
        });
      } else if (intent === 'help') {
        if (!requestLifecycle.isRequestActive(token)) return;
        await runHelp(messageText);
      } else {
        const nextHistoryWithRefs = [...nextHistory];
        const lastIndex = nextHistoryWithRefs.length - 1;
        const last = nextHistoryWithRefs[lastIndex];
        if (last && last.kind === 'text' && last.role === 'user') {
          nextHistoryWithRefs[lastIndex] = { ...last, text: messageText };
        }
        await runAsk(nextHistoryWithRefs, {
          attachmentOnly: hasAttachments,
          templates: templatePayload,
          signal,
          shouldHandle: () => requestLifecycle.isRequestActive(token),
        });
      }
    } catch {
      // Abort or network errors — silently handled
    } finally {
      const shouldFinalize = requestLifecycle.isRequestActive(token);
      requestLifecycle.finalizeRequest(token);
      if (shouldFinalize) {
        setIsProcessing(false);
      }
    }
  }, [appendMessage, attachedReferences.length, buildMessageWithAttachments, isProcessing, requestLifecycle, runAsk, runHelp, runSearch, selectedTemplates, setInputDraft, setIsProcessing, setRelevanceWarnings, setSuggestionsCollapsed, summaryFiles.length]);

  const abortChat = useCallback(() => {
    requestLifecycle.abortActiveRequest();
    setIsProcessing(false);
    toast.info('AI 응답 수신이 중단되었습니다.');
  }, [requestLifecycle, setIsProcessing]);

  return {
    submitUserMessage,
    abortChat,
    handleOpenFile,
    handleOpenHelpAction,
    openExpandedChatPage,
  };
}
