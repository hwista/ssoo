'use client';

import { useCallback } from 'react';
import { useOpenTabWithConfirm } from '@/hooks';
import { useAssistantStore, type AssistantMessage, type AssistantSearchResult } from '@/stores';
import { aiApi, fileApi, getErrorMessage } from '@/lib/utils/apiClient';
import { detectAssistantIntent } from '@/lib/utils/assistantIntent';
import { resolveAssistantHelp, type AssistantHelpAction } from '@/lib/utils/assistantHelp';

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function toChatPayload(messages: AssistantMessage[]) {
  return messages
    .filter((message): message is Extract<AssistantMessage, { kind: 'text' }> => message.kind === 'text')
    .map((message) => ({
      id: message.id,
      role: message.role,
      parts: [{ type: 'text', text: message.text }],
    }));
}

export function useAssistantChat() {
  const openTabWithConfirm = useOpenTabWithConfirm();
  const appendMessage = useAssistantStore((state) => state.appendMessage);
  const updateTextMessage = useAssistantStore((state) => state.updateTextMessage);
  const isProcessing = useAssistantStore((state) => state.isProcessing);
  const setInputDraft = useAssistantStore((state) => state.setInputDraft);
  const setIsProcessing = useAssistantStore((state) => state.setIsProcessing);
  const setSuggestionsCollapsed = useAssistantStore((state) => state.setSuggestionsCollapsed);
  const attachedReferences = useAssistantStore((state) => state.attachedReferences);

  const buildMessageWithReferences = useCallback(async (rawText: string): Promise<string> => {
    if (attachedReferences.length === 0) return rawText;

    const refs = attachedReferences.slice(0, 3);
    const sections = await Promise.all(
      refs.map(async (reference, index) => {
        try {
          const readResult = await fileApi.read(reference.path);
          if (!readResult.success || !readResult.data) {
            return `[첨부 파일 ${index + 1}: ${reference.title}]\n경로: ${reference.path}\n내용을 불러오지 못했습니다.`;
          }

          const payload = readResult.data as unknown as { content?: string } | string;
          const content = typeof payload === 'string' ? payload : payload?.content ?? '';
          const snippet = content.trim().slice(0, 3000);
          return `[첨부 파일 ${index + 1}: ${reference.title}]\n경로: ${reference.path}\n${snippet || '내용이 비어 있습니다.'}`;
        } catch {
          return `[첨부 파일 ${index + 1}: ${reference.title}]\n경로: ${reference.path}\n내용을 불러오지 못했습니다.`;
        }
      })
    );

    return `[첨부 파일 컨텍스트]\n${sections.join('\n\n---\n\n')}\n\n[사용자 질문]\n${rawText}`;
  }, [attachedReferences]);

  const handleOpenFile = useCallback(async (result: AssistantSearchResult) => {
    const normalizedPath = result.path.replace(/^\/+/, '');
    if (!normalizedPath) return;

    await openTabWithConfirm({
      id: `file-${normalizedPath.replace(/\//g, '-')}`,
      title: result.title || normalizedPath.split('/').pop() || '문서',
      path: `/doc/${encodeURIComponent(normalizedPath)}`,
      icon: 'FileText',
      closable: true,
      activate: true,
    });
  }, [openTabWithConfirm]);

  const handleOpenHelpAction = useCallback(async (action: AssistantHelpAction) => {
    const isHome = action.path === '/home';
    await openTabWithConfirm({
      id: isHome ? 'home' : `assistant-${action.id}`,
      title: action.title,
      path: action.path,
      icon: action.icon,
      closable: !isHome,
      activate: true,
    });
  }, [openTabWithConfirm]);

  const openExpandedAskPage = useCallback(async () => {
    await openTabWithConfirm({
      id: 'ai-ask',
      title: 'AI 어시스턴트',
      path: '/ai/ask',
      icon: 'Bot',
      closable: true,
      activate: true,
    });
  }, [openTabWithConfirm]);

  const runSearch = useCallback(async (query: string) => {
    const response = await aiApi.search(query);
    if (!response.success || !response.data) {
      appendMessage({
        id: createId(),
        role: 'assistant',
        kind: 'text',
        text: `검색 중 오류가 발생했습니다. ${getErrorMessage(response)}`,
      });
      return;
    }

    const results = response.data.results ?? [];
    if (results.length === 0) {
      appendMessage({
        id: createId(),
        role: 'assistant',
        kind: 'text',
        text: '검색 결과가 없습니다.',
      });
      return;
    }

    appendMessage({
      id: createId(),
      role: 'assistant',
      kind: 'search-results',
      query,
      results,
    });
  }, [appendMessage]);

  const runAsk = useCallback(async (history: AssistantMessage[], options?: { attachmentOnly?: boolean }) => {
    const assistantId = createId();
    appendMessage({
      id: assistantId,
      role: 'assistant',
      kind: 'text',
      text: '',
      pending: true,
    });

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: toChatPayload(history),
          contextMode: options?.attachmentOnly ? 'attachments-only' : 'default',
        }),
      });

      if (!response.ok || !response.body) {
        const fallback = await response.text();
        throw new Error(fallback || '질문 요청에 실패했습니다.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasDelta = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let splitIndex = buffer.indexOf('\n\n');

        while (splitIndex !== -1) {
          const rawEvent = buffer.slice(0, splitIndex);
          buffer = buffer.slice(splitIndex + 2);

          const dataLines = rawEvent
            .split('\n')
            .filter((line) => line.startsWith('data: '))
            .map((line) => line.slice(6).trim());

          for (const payload of dataLines) {
            if (!payload || payload === '[DONE]') continue;

            const parsed = JSON.parse(payload) as { type?: string; delta?: string; errorText?: string };
            if (parsed.type === 'text-delta' && parsed.delta) {
              hasDelta = true;
              updateTextMessage(assistantId, (prev) => prev + parsed.delta, true);
            }

            if (parsed.type === 'error') {
              throw new Error(parsed.errorText || '질문 처리 중 오류가 발생했습니다.');
            }
          }

          splitIndex = buffer.indexOf('\n\n');
        }
      }

      if (!hasDelta) {
        updateTextMessage(assistantId, () => '응답이 비어 있습니다.', false);
      } else {
        updateTextMessage(assistantId, (prev) => prev, false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '질문 처리 중 오류가 발생했습니다.';
      updateTextMessage(assistantId, () => message, false);
    }
  }, [appendMessage, updateTextMessage]);

  const runHelp = useCallback(async (query: string) => {
    const help = resolveAssistantHelp(query);
    appendMessage({
      id: createId(),
      role: 'assistant',
      kind: 'help-actions',
      summary: help.summary,
      actions: help.actions,
    });
  }, [appendMessage]);

  const submitUserMessage = useCallback(async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isProcessing) return;

    const messageText = await buildMessageWithReferences(trimmed);

    setInputDraft('');
    setSuggestionsCollapsed(true);
    setIsProcessing(true);

    const nextHistory = appendMessage({
      id: createId(),
      role: 'user',
      kind: 'text',
      text: trimmed,
    });

    try {
      const hasAttachments = attachedReferences.length > 0;
      const intent = hasAttachments ? 'ask' : detectAssistantIntent(trimmed);
      if (intent === 'search') {
        await runSearch(trimmed);
      } else if (intent === 'help') {
        await runHelp(messageText);
      } else {
        const nextHistoryWithRefs = [...nextHistory];
        const lastIndex = nextHistoryWithRefs.length - 1;
        const last = nextHistoryWithRefs[lastIndex];
        if (last && last.kind === 'text' && last.role === 'user') {
          nextHistoryWithRefs[lastIndex] = { ...last, text: messageText };
        }
        await runAsk(nextHistoryWithRefs, { attachmentOnly: hasAttachments });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [appendMessage, attachedReferences.length, buildMessageWithReferences, isProcessing, runAsk, runHelp, runSearch, setInputDraft, setIsProcessing, setSuggestionsCollapsed]);

  return {
    submitUserMessage,
    handleOpenFile,
    handleOpenHelpAction,
    openExpandedAskPage,
  };
}
