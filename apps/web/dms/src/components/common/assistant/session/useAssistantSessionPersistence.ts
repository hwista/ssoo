'use client';

import { useCallback } from 'react';
import { assistantSessionApi, getErrorMessage } from '@/lib/api';
import { useAssistantStore } from '@/stores';
import { toAssistantMessages } from './assistantSessionUtils';

export function useAssistantSessionPersistence() {
  const clientId = useAssistantStore((state) => state.clientId);
  const sessions = useAssistantStore((state) => state.sessions);
  const mergeSessions = useAssistantStore((state) => state.mergeSessions);
  const markSessionsLoaded = useAssistantStore((state) => state.markSessionsLoaded);
  const setSessionPersisted = useAssistantStore((state) => state.setSessionPersisted);

  const loadPersistedSessions = useCallback(async () => {
    const response = await assistantSessionApi.list(clientId, 100);
    if (response.success && response.data) {
      const dbSessions = response.data.map((session) => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: toAssistantMessages(session.messages),
        persistedToDb: true,
      }));
      mergeSessions(dbSessions);
    }
    markSessionsLoaded();
  }, [clientId, markSessionsLoaded, mergeSessions]);

  const saveSession = useCallback(async (sessionId: string) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) {
      return { success: false, error: '저장할 세션을 찾을 수 없습니다.' };
    }

    const response = await assistantSessionApi.save(clientId, {
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
  }, [clientId, sessions, setSessionPersisted]);

  const removeSessionFromDb = useCallback(async (sessionId: string) => {
    const response = await assistantSessionApi.remove(clientId, sessionId);
    if (!response.success) {
      return { success: false, error: getErrorMessage(response) };
    }

    setSessionPersisted(sessionId, false);
    return { success: true, error: '' };
  }, [clientId, setSessionPersisted]);

  return {
    loadPersistedSessions,
    saveSession,
    removeSessionFromDb,
  };
}
