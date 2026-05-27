'use client';

import { fileApi } from '@/lib/api/endpoints/files';
import { streamSSE } from '@/lib/api/streaming';
import type { AssistantMessage } from '@/stores';
import type { SearchBlockedSourceSummary } from '@ssoo/types/dms';

interface AssistantReference {
  path: string;
  title: string;
}

interface AssistantSummaryFile {
  id: string;
  name: string;
  type?: string;
  textContent: string;
}

export function createAssistantMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatBlockedSourcesNotice(summary: SearchBlockedSourceSummary) {
  const reasonText = summary.reasons
    .map((reason) => `${reason.label} ${reason.count}개`)
    .join(', ');

  return [
    `참고: 권한 때문에 답변 근거에서 제외된 문서가 ${summary.totalCount}개 있습니다.`,
    reasonText ? `사유: ${reasonText}` : undefined,
  ].filter(Boolean).join('\n') + '\n\n';
}

function isBlockedSourceSummary(value: unknown): value is SearchBlockedSourceSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<SearchBlockedSourceSummary>;
  return typeof candidate.totalCount === 'number' && Array.isArray(candidate.reasons);
}

export function toChatPayload(messages: AssistantMessage[]) {
  return messages
    .filter((message): message is Extract<AssistantMessage, { kind: 'text' }> => message.kind === 'text')
    .map((message) => ({
      id: message.id,
      role: message.role,
      parts: [{ type: 'text', text: message.text }],
    }));
}

export async function buildMessageWithReferences(params: {
  rawText: string;
  attachedReferences: AssistantReference[];
  summaryFiles: AssistantSummaryFile[];
}) {
  const { rawText, attachedReferences, summaryFiles } = params;
  if (attachedReferences.length === 0 && summaryFiles.length === 0) {
    return rawText;
  }

  const referenceSections = await Promise.all(
    attachedReferences.slice(0, 3).map(async (reference, index) => {
      try {
        const readResult = await fileApi.read(reference.path);
        if (!readResult.success || !readResult.data) {
          return `[첨부 파일 ${index + 1}: ${reference.title}]\n경로: ${reference.path}\n내용을 불러오지 못했습니다.`;
        }

        const payload = readResult.data as { content?: string } | string;
        const content = typeof payload === 'string' ? payload : payload?.content ?? '';
        const snippet = content.trim().slice(0, 3000);
        return `[첨부 파일 ${index + 1}: ${reference.title}]\n경로: ${reference.path}\n${snippet || '내용이 비어 있습니다.'}`;
      } catch {
        return `[첨부 파일 ${index + 1}: ${reference.title}]\n경로: ${reference.path}\n내용을 불러오지 못했습니다.`;
      }
    })
  );

  const summarySections = summaryFiles.slice(0, 4).map((file, index) => (
    `[요약 첨부 ${index + 1}: ${file.name}]\n${file.textContent.slice(0, 3000) || '텍스트를 추출하지 못했습니다.'}`
  ));

  return `[첨부 파일 컨텍스트]\n${[...referenceSections, ...summarySections].join('\n\n---\n\n')}\n\n[사용자 질문]\n${rawText}`;
}

export async function streamAssistantAsk(params: {
  history: AssistantMessage[];
  attachmentOnly?: boolean;
  templates?: Array<{ name: string; content: string }>;
  signal?: AbortSignal;
  onPendingMessage: (assistantId: string) => void;
  onTextDelta: (assistantId: string, delta: string) => void;
  onBlockedSources?: (assistantId: string, summary: SearchBlockedSourceSummary) => void;
  onComplete: (assistantId: string, hasDelta: boolean, aborted?: boolean) => void;
  onError: (assistantId: string, message: string) => void;
}) {
  const {
    history,
    attachmentOnly,
    templates,
    signal,
    onPendingMessage,
    onTextDelta,
    onBlockedSources,
    onComplete,
    onError,
  } = params;
  const assistantId = createAssistantMessageId();
  onPendingMessage(assistantId);

  let hasDelta = false;
  let hasBlockedSources = false;

  const completed = await streamSSE({
    url: '/api/ask',
    body: {
      messages: toChatPayload(history),
      contextMode: attachmentOnly ? 'attachments-only' : 'doc',
      ...(templates && templates.length > 0 ? { templates } : {}),
    },
    signal,
    onEvent: (event) => {
      if (
        event.type === 'data-blocked-sources'
        && !hasBlockedSources
        && isBlockedSourceSummary(event.data)
      ) {
        hasBlockedSources = true;
        hasDelta = true;
        onBlockedSources?.(assistantId, event.data);
        return;
      }

      if (event.type === 'text-delta' && typeof event.delta === 'string') {
        hasDelta = true;
        onTextDelta(assistantId, event.delta);
      }
    },
    onError: (error) => {
      onError(assistantId, error.message);
    },
  });

  if (completed) {
    onComplete(assistantId, hasDelta);
  } else {
    onComplete(assistantId, hasDelta, true);
  }
}
