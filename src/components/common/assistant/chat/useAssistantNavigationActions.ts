'use client';

import { useCallback } from 'react';
import { useOpenDocumentTab, useOpenTabWithConfirm } from '@/hooks';
import type { AssistantSearchResult } from '@/stores';
import type { AssistantHelpAction } from '@/lib/assistant/assistantHelp';

export function useAssistantNavigationActions() {
  const openTabWithConfirm = useOpenTabWithConfirm();
  const openDocumentTab = useOpenDocumentTab();

  const handleOpenFile = useCallback(async (result: AssistantSearchResult) => {
    await openDocumentTab({
      path: result.path,
      title: result.title,
      activate: true,
    });
  }, [openDocumentTab]);

  const handleOpenHelpAction = useCallback(async (action: AssistantHelpAction) => {
    const isHome = action.path === '/home';
    await openTabWithConfirm({
      id: isHome ? 'home' : `assistant-${action.id}`,
      title: action.title,
      path: action.path,
      icon: action.icon,
      closable: !isHome,
      activate: true,
    });
  }, [openTabWithConfirm]);

  const openExpandedChatPage = useCallback(async () => {
    await openTabWithConfirm({
      id: 'ai-chat',
      title: 'AI 대화',
      path: '/ai/chat',
      icon: 'Bot',
      closable: true,
      activate: true,
    });
  }, [openTabWithConfirm]);

  return {
    handleOpenFile,
    handleOpenHelpAction,
    openExpandedChatPage,
  };
}
