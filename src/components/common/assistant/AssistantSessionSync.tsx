'use client';

import { useEffect } from 'react';
import { useAssistantStore } from '@/stores';
import { useAssistantSessionPersistence } from './useAssistantSessionPersistence';

export function AssistantSessionSync() {
  const sessionsLoaded = useAssistantStore((state) => state.sessionsLoaded);
  const { loadPersistedSessions } = useAssistantSessionPersistence();

  useEffect(() => {
    if (sessionsLoaded) return;
    void loadPersistedSessions();
  }, [loadPersistedSessions, sessionsLoaded]);

  return null;
}
