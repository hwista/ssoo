'use client';

import type { DmsDocumentAccessRequestState } from '@ssoo/types/dms';
import type { AssistantMessage } from '@/stores';

function toReadRequestState(value: unknown): DmsDocumentAccessRequestState | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.requestId !== 'string'
    || typeof candidate.requestedAt !== 'string'
    || (candidate.status !== 'pending' && candidate.status !== 'approved' && candidate.status !== 'rejected')
  ) {
    return undefined;
  }

  return {
    requestId: candidate.requestId,
    status: candidate.status,
    requestedAt: candidate.requestedAt,
    requestMessage: typeof candidate.requestMessage === 'string' ? candidate.requestMessage : undefined,
    requestedExpiresAt: typeof candidate.requestedExpiresAt === 'string' ? candidate.requestedExpiresAt : undefined,
    respondedAt: typeof candidate.respondedAt === 'string' ? candidate.respondedAt : undefined,
    responseMessage: typeof candidate.responseMessage === 'string' ? candidate.responseMessage : undefined,
  };
}

export function toAssistantMessages(value: unknown): AssistantMessage[] {
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
          owner?: string;
          visibilityScope?: 'public' | 'organization' | 'self' | 'legacy';
          isReadable?: boolean;
          canRequestRead?: boolean;
          readRequest?: DmsDocumentAccessRequestState;
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
          owner: typeof result.owner === 'string' ? result.owner : undefined,
          visibilityScope: result.visibilityScope === 'public'
            || result.visibilityScope === 'organization'
            || result.visibilityScope === 'self'
            || result.visibilityScope === 'legacy'
            ? result.visibilityScope
            : undefined,
          isReadable: result.isReadable ?? false,
          canRequestRead: result.canRequestRead ?? false,
          readRequest: toReadRequestState(result.readRequest),
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
