'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SendHorizontal, Bot, User } from 'lucide-react';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useTabStore } from '@/stores';
import { useCurrentTabId } from '@/contexts/TabInstanceContext';
import { AiPageTemplate } from '@/components/templates';
import { getQueryFromTabPath } from '@/lib/utils';

/**
 * UIMessage의 parts에서 텍스트 추출
 */
function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
}

const askTransport = new DefaultChatTransport({ api: '/api/ask' });

export function AiAskPage() {
  const tabId = useCurrentTabId();
  const { tabs } = useTabStore();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabs, tabId]);
  const initialQuery = useMemo(() => getQueryFromTabPath(activeTab?.path), [activeTab?.path]);
  const autoQueryRef = useRef('');
  const [inputValue, setInputValue] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: askTransport,
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!inputValue.trim() || isLoading) return;
      sendMessage({ text: inputValue });
      setInputValue('');
    },
    [inputValue, isLoading, sendMessage]
  );

  useEffect(() => {
    if (initialQuery && autoQueryRef.current !== initialQuery) {
      autoQueryRef.current = initialQuery;
      sendMessage({ text: initialQuery });
    }
  }, [initialQuery, sendMessage]);

  return (
    <AiPageTemplate
      variant="ask"
      description="문서 기반으로 질문을 입력하세요."
      footer={(
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="질문을 입력하세요..."
            className="h-control-h flex-1 rounded-lg border border-ssoo-content-border px-3 text-sm focus:border-ssoo-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="flex h-control-h items-center gap-2 rounded-lg bg-ssoo-primary px-4 text-sm font-medium text-white transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SendHorizontal className="h-4 w-4" />
            전송
          </button>
        </form>
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
                {getMessageText(message)}
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
    </AiPageTemplate>
  );
}
