'use client';

import { useEffect } from 'react';
import { useAssistantSessionsQuery } from '@/hooks/queries/useAssistantSessions';
import { useAssistantSessionStore } from '@/stores';
import { toAssistantMessages } from './assistantSessionUtils';

export function AssistantSessionSync() {
  const clientId = useAssistantSessionStore((state) => state.clientId);
  const sessionsLoaded = useAssistantSessionStore((state) => state.sessionsLoaded);
  const mergeSessions = useAssistantSessionStore((state) => state.mergeSessions);
  const markSessionsLoaded = useAssistantSessionStore((state) => state.markSessionsLoaded);
  const persistedSessionsQuery = useAssistantSessionsQuery(clientId, 100);

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

  return null;
}
