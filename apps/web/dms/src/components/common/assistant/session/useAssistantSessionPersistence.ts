'use client';

import { useCallback } from 'react';
import { getErrorMessage } from '@/lib/api/core';
import {
  useRemoveAssistantSessionMutation,
  useSaveAssistantSessionMutation,
} from '@/hooks/queries/useAssistantSessions';
import { useAssistantSessionStore } from '@/stores';

export function useAssistantSessionPersistence() {
  const clientId = useAssistantSessionStore((state) => state.clientId);
  const sessions = useAssistantSessionStore((state) => state.sessions);
  const setSessionPersisted = useAssistantSessionStore((state) => state.setSessionPersisted);
  const saveSessionMutation = useSaveAssistantSessionMutation(clientId);
  const removeSessionMutation = useRemoveAssistantSessionMutation(clientId);

  const saveSession = useCallback(async (sessionId: string) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) {
      return { success: false, error: '저장할 세션을 찾을 수 없습니다.' };
    }

    const response = await saveSessionMutation.mutateAsync({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.messages,
      persistedToDb: true,
    });

    if (!response.success) {
      return { success: false, error: getErrorMessage(response) };
    }

    setSessionPersisted(sessionId, true);
    return { success: true, error: '' };
  }, [saveSessionMutation, sessions, setSessionPersisted]);

  const removeSessionFromDb = useCallback(async (sessionId: string) => {
    const response = await removeSessionMutation.mutateAsync(sessionId);
    if (!response.success) {
      return { success: false, error: getErrorMessage(response) };
    }

    setSessionPersisted(sessionId, false);
    return { success: true, error: '' };
  }, [removeSessionMutation, setSessionPersisted]);

  return {
    saveSession,
    removeSessionFromDb,
  };
}
