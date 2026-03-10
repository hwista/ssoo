'use client';

import { useCallback } from 'react';
import { assistantSessionApi, getErrorMessage } from '@/lib/api';
import { useAssistantStore } from '@/stores';
import type { AssistantMessage } from '@/stores';

function toAssistantMessages(value: unknown): AssistantMessage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): AssistantMessage[] => {
    if (!item || typeof item !== 'object') return [];
    const message = item as Record<string, unknown>;
    const id = typeof message.id === 'string' ? message.id : '';
    const role = message.role;
    const kind = message.kind;

    if (!id || (role !== 'user' && role !== 'assistant') || typeof kind !== 'string') return [];

    if (kind === 'text' && typeof message.text === 'string') {
      return [{
        id,
        role,
        kind: 'text',
        text: message.text,
        pending: typeof message.pending === 'boolean' ? message.pending : undefined,
      }];
    }

    if (kind === 'search-results' && role === 'assistant' && typeof message.query === 'string' && Array.isArray(message.results)) {
      const results = message.results
        .filter((result): result is {
          id: string;
          title: string;
          excerpt: string;
          path: string;
          summary?: string;
          snippets?: string[];
          totalSnippetCount?: number;
        } => (
          Boolean(result) &&
          typeof result === 'object' &&
          typeof (result as Record<string, unknown>).id === 'string' &&
          typeof (result as Record<string, unknown>).title === 'string' &&
          typeof (result as Record<string, unknown>).excerpt === 'string' &&
          typeof (result as Record<string, unknown>).path === 'string'
        ))
        .map((result) => ({
          id: result.id,
          title: result.title,
          excerpt: result.excerpt,
          path: result.path,
          summary: typeof result.summary === 'string' ? result.summary : undefined,
          snippets: Array.isArray(result.snippets)
            ? result.snippets.filter((snippet): snippet is string => typeof snippet === 'string')
            : undefined,
          totalSnippetCount: typeof result.totalSnippetCount === 'number' ? result.totalSnippetCount : undefined,
        }));

      return [{ id, role: 'assistant', kind: 'search-results', query: message.query, results }];
    }

    if (kind === 'help-actions' && role === 'assistant' && typeof message.summary === 'string' && Array.isArray(message.actions)) {
      const actions = message.actions
        .filter((action): action is {
          id: string;
          title: string;
          description: string;
          path: string;
          icon: 'Bot' | 'FileText' | 'Settings' | 'BookOpen';
        } => (
          Boolean(action) &&
          typeof action === 'object' &&
          typeof (action as Record<string, unknown>).id === 'string' &&
          typeof (action as Record<string, unknown>).title === 'string' &&
          typeof (action as Record<string, unknown>).description === 'string' &&
          typeof (action as Record<string, unknown>).path === 'string' &&
          ((action as Record<string, unknown>).icon === 'Bot' ||
            (action as Record<string, unknown>).icon === 'FileText' ||
            (action as Record<string, unknown>).icon === 'Settings' ||
            (action as Record<string, unknown>).icon === 'BookOpen')
        ))
        .map((action) => ({
          id: action.id,
          title: action.title,
          description: action.description,
          path: action.path,
          icon: action.icon,
        }));

      return [{ id, role: 'assistant', kind: 'help-actions', summary: message.summary, actions }];
    }

    return [];
  });
}

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
