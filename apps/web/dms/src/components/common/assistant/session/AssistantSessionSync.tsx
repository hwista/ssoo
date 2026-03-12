'use client';

import { useEffect } from 'react';
import { useAssistantSessionStore } from '@/stores';
import { useAssistantSessionPersistence } from './useAssistantSessionPersistence';

export function AssistantSessionSync() {
  const sessionsLoaded = useAssistantSessionStore((state) => state.sessionsLoaded);
  const { loadPersistedSessions } = useAssistantSessionPersistence();

  useEffect(() => {
    if (sessionsLoaded) return;
    void loadPersistedSessions();
  }, [loadPersistedSessions, sessionsLoaded]);

  return null;
}
