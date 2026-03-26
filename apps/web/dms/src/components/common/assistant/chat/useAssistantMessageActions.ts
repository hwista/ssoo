'use client';

import { useCallback } from 'react';
import { useAssistantSessionStore, type AssistantMessage } from '@/stores';
import { aiApi, getErrorMessage } from '@/lib/api';
import { resolveAssistantHelp } from '@/lib/assistant/assistantHelp';
import {
  createAssistantMessageId,
  streamAssistantAsk,
} from './assistantChatUtils';

export function useAssistantMessageActions() {
  const appendMessage = useAssistantSessionStore((state) => state.appendMessage);
  const updateTextMessage = useAssistantSessionStore((state) => state.updateTextMessage);

  const runSearch = useCallback(async (
    query: string,
    options?: { signal?: AbortSignal; shouldHandle?: () => boolean },
  ) => {
    const response = await aiApi.search(query, { signal: options?.signal });
    if (options?.shouldHandle && !options.shouldHandle()) return;
    if (!response.success || !response.data) {
      if (options?.signal?.aborted) return;
      appendMessage({
        id: createAssistantMessageId(),
        role: 'assistant',
        kind: 'text',
        text: `검색 중 오류가 발생했습니다. ${getErrorMessage(response)}`,
      });
      return;
    }

    const results = response.data.results ?? [];
    if (results.length === 0) {
      appendMessage({
        id: createAssistantMessageId(),
        role: 'assistant',
        kind: 'text',
        text: '검색 결과가 없습니다.',
      });
      return;
    }

    appendMessage({
      id: createAssistantMessageId(),
      role: 'assistant',
      kind: 'search-results',
      query,
      results,
    });
  }, [appendMessage]);

  const runAsk = useCallback(async (
    history: AssistantMessage[],
    options?: {
      attachmentOnly?: boolean;
      templates?: Array<{ name: string; content: string }>;
      signal?: AbortSignal;
      shouldHandle?: () => boolean;
    },
  ) => {
    await streamAssistantAsk({
      history,
      attachmentOnly: options?.attachmentOnly,
      templates: options?.templates,
      signal: options?.signal,
      onPendingMessage: (assistantId) => {
        if (options?.shouldHandle && !options.shouldHandle()) return;
        appendMessage({
          id: assistantId,
          role: 'assistant',
          kind: 'text',
          text: '',
          pending: true,
        });
      },
      onTextDelta: (assistantId, delta) => {
        if (options?.shouldHandle && !options.shouldHandle()) return;
        updateTextMessage(assistantId, (prev) => prev + delta, true);
      },
      onComplete: (assistantId, hasDelta, aborted) => {
        if (options?.shouldHandle && !options.shouldHandle()) return;
        if (aborted && !hasDelta) {
          updateTextMessage(assistantId, () => '사용자가 응답 수신을 중단했습니다.', false);
          return;
        }
        if (!hasDelta) {
          updateTextMessage(assistantId, () => '응답이 비어 있습니다.', false);
          return;
        }
        updateTextMessage(assistantId, (prev) => prev, false);
      },
      onError: (assistantId, message) => {
        if (options?.shouldHandle && !options.shouldHandle()) return;
        updateTextMessage(assistantId, () => message, false);
      },
    });
  }, [appendMessage, updateTextMessage]);

  const runHelp = useCallback(async (query: string) => {
    const help = resolveAssistantHelp(query);
    appendMessage({
      id: createAssistantMessageId(),
      role: 'assistant',
      kind: 'help-actions',
      summary: help.summary,
      actions: help.actions,
    });
  }, [appendMessage]);

  return {
    runSearch,
    runAsk,
    runHelp,
  };
}
