'use client';

import { useCallback } from 'react';
import { useOpenDocumentTab, useOpenTabWithConfirm } from '@/hooks';
import { toast } from '@/lib/toast';
import { useSettingsShellStore, useSettingsStore } from '@/stores';
import type { AssistantSearchResult } from '@/stores';
import type { AssistantHelpAction } from '@/lib/assistant/assistantHelp';
import { useDocumentAccessRequestStore } from '@/stores/document-access-request.store';

export function useAssistantNavigationActions() {
  const openTabWithConfirm = useOpenTabWithConfirm();
  const openDocumentTab = useOpenDocumentTab();
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const applyWorkspacePreferences = useSettingsShellStore((state) => state.applyWorkspacePreferences);
  const enterSettings = useSettingsShellStore((state) => state.enterSettings);
  const openAccessRequestDialog = useDocumentAccessRequestStore((state) => state.open);

  const handleOpenFile = useCallback(async (result: AssistantSearchResult) => {
    if (!result.isReadable) {
      if (result.canRequestRead) {
        openAccessRequestDialog({
          title: result.title,
          path: result.path,
          owner: result.owner,
          readRequest: result.readRequest,
        });
      } else {
        toast.error('문서를 열 수 없습니다.');
      }
      return;
    }

    await openDocumentTab({
      path: result.path,
      title: result.title,
      activate: true,
    });
  }, [openAccessRequestDialog, openDocumentTab]);

  const handleOpenHelpAction = useCallback(async (action: AssistantHelpAction) => {
    if (action.path === '/settings') {
      await loadSettings();
      const settings = useSettingsStore.getState().config;
      if (settings?.personal.workspace) {
        applyWorkspacePreferences(settings.personal.workspace);
      }
      enterSettings();
      return;
    }

    const isHome = action.path === '/home';
    await openTabWithConfirm({
      id: isHome ? 'home' : `assistant-${action.id}`,
      title: action.title,
      path: action.path,
      icon: action.icon,
      closable: !isHome,
      activate: true,
    });
  }, [applyWorkspacePreferences, enterSettings, loadSettings, openTabWithConfirm]);

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
