'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SendHorizontal, Bot, User } from 'lucide-react';
import { useTabStore } from '@/stores';
import { DocPageTemplate } from '@/components/templates';
import { AiPageShell, AiSidecar } from '@/components/common/ai';
import { aiApi, getErrorMessage } from '@/lib/utils/apiClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function getQueryFromTabPath(path?: string): string {
  if (!path) return '';
  const [, queryString = ''] = path.split('?');
  const params = new URLSearchParams(queryString);
  return params.get('q')?.trim() ?? '';
}

export function AiAskPage() {
  const { activeTabId, tabs } = useTabStore();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [tabs, activeTabId]);
  const initialQuery = useMemo(() => getQueryFromTabPath(activeTab?.path), [activeTab?.path]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const autoQueryRef = useRef('');

  const handleSend = useCallback(async (overrideInput?: string) => {
    const trimmed = (overrideInput ?? input).trim();
    if (!trimmed || isSending) return;

    const responseId = `${Date.now()}-assistant`;
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-user`, role: 'user', content: trimmed },
      { id: responseId, role: 'assistant', content: '답변을 생성하는 중입니다...' },
    ]);
    setInput('');
    setIsSending(true);

    const response = await aiApi.ask(trimmed);
    const responseText = response.success
      ? response.data?.answer || '응답을 생성하지 못했습니다.'
      : getErrorMessage(response);

    setMessages((prev) =>
      prev.map((message) =>
        message.id === responseId ? { ...message, content: responseText } : message
      )
    );
    setIsSending(false);
  }, [input, isSending]);

  useEffect(() => {
    if (initialQuery && autoQueryRef.current !== initialQuery) {
      autoQueryRef.current = initialQuery;
      setInput(initialQuery);
      handleSend(initialQuery);
    }
  }, [initialQuery, handleSend]);

  return (
    <main className="flex-1 overflow-hidden bg-ssoo-content-bg/30">
      <DocPageTemplate filePath="ai/ask" mode="viewer" contentOrientation="portrait" description="문서 기반으로 질문을 입력하세요." sidecarContent={<AiSidecar variant="ask" />}>
        <AiPageShell
          footer={(
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="질문을 입력하세요..."
                className="h-control-h flex-1 rounded-lg border border-ssoo-content-border px-3 text-sm focus:border-ssoo-primary focus:outline-none"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={isSending}
                className="flex h-control-h items-center gap-2 rounded-lg bg-ssoo-primary px-4 text-sm font-medium text-white transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SendHorizontal className="h-4 w-4" />
                전송
              </button>
            </div>
          )}
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-ssoo-primary/60">
              첫 질문을 입력해 대화를 시작하세요.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-control-h w-control-h shrink-0 items-center justify-center rounded-full bg-ssoo-content-bg">
                      <Bot className="h-5 w-5 text-ssoo-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-ssoo-primary text-white'
                        : 'bg-ssoo-content-bg text-ssoo-primary'
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-control-h w-control-h shrink-0 items-center justify-center rounded-full bg-ssoo-primary">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AiPageShell>
      </DocPageTemplate>
    </main>
  );
}
