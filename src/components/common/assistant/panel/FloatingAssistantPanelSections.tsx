'use client';

import type { RefObject } from 'react';
import { Bot, ExternalLink, History, Maximize2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { AssistantComposer } from '../Composer';
import { AssistantSessionHistoryList } from '../session/SessionHistoryList';
import type { AssistantSession } from '@/stores';

interface FloatingAssistantHeaderProps {
  onExpand: () => void | Promise<void>;
}

export function FloatingAssistantHeader({ onExpand }: FloatingAssistantHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-ssoo-content-border px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ssoo-content-bg">
          <Bot className="h-4 w-4 text-ssoo-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ssoo-primary">AI 대화</p>
          <p className="text-xs text-ssoo-primary/60">질문, 문서 검색, 기능 안내를 한 번에 처리합니다.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          void onExpand();
        }}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-ssoo-content-border px-2 text-xs text-ssoo-primary transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg"
        title="크게보기"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </header>
  );
}

interface FloatingAssistantHistoryProps {
  historyRef: RefObject<HTMLDivElement | null>;
  historyOpen: boolean;
  isOpen: boolean;
  sessions: AssistantSession[];
  activeSessionId: string | null;
  onStartNewSession: () => void;
  onToggleHistory: () => void;
  onSelectSession: (id: string) => void;
  onTogglePersist: (item: AssistantSession) => void;
}

export function FloatingAssistantHistory({
  historyRef,
  historyOpen,
  isOpen,
  sessions,
  activeSessionId,
  onStartNewSession,
  onToggleHistory,
  onSelectSession,
  onTogglePersist,
}: FloatingAssistantHistoryProps) {
  return (
    <div ref={historyRef} className="absolute top-14 -left-12 z-20">
      <div className={`${isOpen ? 'pointer-events-auto' : 'pointer-events-none'} w-fit space-y-2`}>
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={onStartNewSession}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ssoo-content-border bg-ssoo-content-bg text-ssoo-primary/75 shadow-sm transition-all hover:border-ssoo-primary/40 hover:bg-ssoo-content-border hover:text-ssoo-primary"
            title="새 채팅 세션"
            aria-label="새 채팅 세션"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleHistory}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ssoo-content-border bg-ssoo-content-bg text-ssoo-primary/75 shadow-sm transition-all hover:border-ssoo-primary/40 hover:bg-ssoo-content-border hover:text-ssoo-primary"
            title="채팅 세션 히스토리"
            aria-label="채팅 세션 히스토리"
          >
            <History className="h-4 w-4" />
          </button>
        </div>
        {historyOpen && (
          <div className="max-h-48 w-64 overflow-y-auto rounded-lg border border-ssoo-content-border bg-white p-2 shadow-sm">
            <AssistantSessionHistoryList
              items={sessions.slice(0, 20)}
              isActive={(item) => item.id === activeSessionId}
              onSelect={(item) => onSelectSession(item.id)}
              onTogglePersist={(item) => {
                try {
                  onTogglePersist(item as AssistantSession);
                } catch {
                  toast.error('세션 저장 상태를 변경하지 못했습니다.');
                }
              }}
              variant="panel"
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface FloatingAssistantFooterProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  inputDraft: string;
  isProcessing: boolean;
  setInputDraft: (value: string) => void;
  submitUserMessage: (text: string) => Promise<void>;
  onAbort?: () => void;
  suggestions: string[];
  suggestionsCollapsed: boolean;
  onToggleSuggestions: () => void;
}

export function FloatingAssistantFooter({
  inputRef,
  inputDraft,
  isProcessing,
  setInputDraft,
  submitUserMessage,
  onAbort,
  suggestions,
  suggestionsCollapsed,
  onToggleSuggestions,
}: FloatingAssistantFooterProps) {
  return (
    <div className="border-t border-ssoo-content-border p-3">
      <AssistantComposer
        inputRef={inputRef}
        inputDraft={inputDraft}
        isProcessing={isProcessing}
        setInputDraft={setInputDraft}
        submitUserMessage={submitUserMessage}
        placeholder="질문하거나, 파일을 찾아달라고 요청하세요."
        submitVariant="icon"
        onAbort={onAbort}
        suggestions={suggestions}
        suggestionsCollapsed={suggestionsCollapsed}
        onToggleSuggestions={onToggleSuggestions}
      />
    </div>
  );
}
