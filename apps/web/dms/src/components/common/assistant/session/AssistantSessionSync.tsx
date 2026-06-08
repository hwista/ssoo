'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAssistantSessionsQuery, useSaveAssistantSessionMutation } from '@/hooks/queries/useAssistantSessions';
import { useAssistantSessionStore } from '@/stores';
import { toAssistantMessages } from './assistantSessionUtils';

const AUTO_SAVE_DELAY_MS = 800;

export function AssistantSessionSync() {
  const clientId = useAssistantSessionStore((state) => state.clientId);
  const messages = useAssistantSessionStore((state) => state.messages);
  const sessions = useAssistantSessionStore((state) => state.sessions);
  const activeSessionId = useAssistantSessionStore((state) => state.activeSessionId);
  const sessionsLoaded = useAssistantSessionStore((state) => state.sessionsLoaded);
  const mergeSessions = useAssistantSessionStore((state) => state.mergeSessions);
  const markSessionsLoaded = useAssistantSessionStore((state) => state.markSessionsLoaded);
  const setSessionPersisted = useAssistantSessionStore((state) => state.setSessionPersisted);
  const persistedSessionsQuery = useAssistantSessionsQuery(clientId, 100);
  const saveSessionMutation = useSaveAssistantSessionMutation(clientId);
  const lastSavedSignatureRef = useRef<string | null>(null);

  const activeSession = useMemo(() => {
    if (!activeSessionId) return null;
    return sessions.find((session) => session.id === activeSessionId) ?? null;
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (persistedSessionsQuery.data?.success && persistedSessionsQuery.data.data) {
      mergeSessions(
        persistedSessionsQuery.data.data.map((session) => ({
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messages: toAssistantMessages(session.messages),
          persistedToDb: true,
        })),
      );
    }

    if (!sessionsLoaded && persistedSessionsQuery.isFetched) {
      markSessionsLoaded();
    }
  }, [
    mergeSessions,
    markSessionsLoaded,
    persistedSessionsQuery.data,
    persistedSessionsQuery.isFetched,
    sessionsLoaded,
  ]);

  useEffect(() => {
    if (!sessionsLoaded || !activeSession || messages.length === 0) {
      return;
    }

    const hasPendingMessage = activeSession.messages.some(
      (message) => message.kind === 'text' && message.pending,
    );
    if (hasPendingMessage) {
      return;
    }

    const signature = JSON.stringify({
      id: activeSession.id,
      title: activeSession.title,
      updatedAt: activeSession.updatedAt,
      messages: activeSession.messages,
    });
    if (signature === lastSavedSignatureRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveSessionMutation.mutateAsync({
        id: activeSession.id,
        title: activeSession.title,
        createdAt: activeSession.createdAt,
        updatedAt: activeSession.updatedAt,
        messages: activeSession.messages,
        persistedToDb: true,
      }).then((response) => {
        if (!response.success) {
          console.warn('DMS assistant session auto-save failed', response);
          return;
        }
        lastSavedSignatureRef.current = signature;
        setSessionPersisted(activeSession.id, true);
      }).catch((error) => {
        console.warn('DMS assistant session auto-save failed', error);
      });
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [activeSession, messages.length, saveSessionMutation, sessionsLoaded, setSessionPersisted]);

  return null;
}
