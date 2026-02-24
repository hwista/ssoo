'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ExternalLink, History, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAssistantStore } from '@/stores';
import { useAssistantChat } from './useAssistantChat';
import { useAssistantSessionPersistence } from './useAssistantSessionPersistence';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import { AssistantMessageList } from './MessageList';
import { AssistantComposer } from './Composer';
import { AssistantSessionHistoryList } from './SessionHistoryList';

interface FloatingAssistantPanelProps {
  isOpen: boolean;
}

export function FloatingAssistantPanel({ isOpen }: FloatingAssistantPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const hasMessagesRef = useRef(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const messages = useAssistantStore((state) => state.messages);
  const sessions = useAssistantStore((state) => state.sessions);
  const activeSessionId = useAssistantStore((state) => state.activeSessionId);
  const inputDraft = useAssistantStore((state) => state.inputDraft);
  const isProcessing = useAssistantStore((state) => state.isProcessing);
  const suggestions = useAssistantStore((state) => state.suggestions);
  const suggestionsCollapsed = useAssistantStore((state) => state.suggestionsCollapsed);

  const setInputDraft = useAssistantStore((state) => state.setInputDraft);
  const regenerateSuggestions = useAssistantStore((state) => state.regenerateSuggestions);
  const setSuggestionsCollapsed = useAssistantStore((state) => state.setSuggestionsCollapsed);
  const startNewSession = useAssistantStore((state) => state.startNewSession);
  const selectSession = useAssistantStore((state) => state.selectSession);
  const closePanel = useAssistantStore((state) => state.closePanel);

  const { submitUserMessage, handleOpenFile, handleOpenHelpAction, openExpandedAskPage } = useAssistantChat();
  const { saveSession, removeSessionFromDb } = useAssistantSessionPersistence();

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    const container = scrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    if (justOpened) {
      regenerateSuggestions(6);
      if (messages.length === 0) {
        setSuggestionsCollapsed(false);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, messages.length, regenerateSuggestions, setSuggestionsCollapsed]);

  useEffect(() => {
    const justStartedConversation = hasMessages && !hasMessagesRef.current;
    if (justStartedConversation) {
      setSuggestionsCollapsed(true);
    }
    hasMessagesRef.current = hasMessages;
  }, [hasMessages, setSuggestionsCollapsed]);

  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInputDraft('');
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isOpen, setInputDraft]);

  useEffect(() => {
    if (!historyOpen) return;
    const handleOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!historyRef.current?.contains(target)) {
        setHistoryOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHistoryOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [historyOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      const value = inputRef.current?.value ?? '';
      inputRef.current?.setSelectionRange(value.length, value.length);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const handleFocusInput = () => {
      window.setTimeout(() => {
        inputRef.current?.focus();
        const value = inputRef.current?.value ?? '';
        inputRef.current?.setSelectionRange(value.length, value.length);
      }, 0);
    };
    window.addEventListener(ASSISTANT_FOCUS_INPUT_EVENT, handleFocusInput);
    return () => window.removeEventListener(ASSISTANT_FOCUS_INPUT_EVENT, handleFocusInput);
  }, []);

  const onExpand = useCallback(async () => {
    await openExpandedAskPage();
    closePanel();
  }, [closePanel, openExpandedAskPage]);

  const panelClassName = useMemo(() => (
    [
      'fixed right-6 top-[calc(3.75rem+53px+0.75rem)] bottom-24 z-40',
      'w-[min(504px,calc(100vw-2rem))] rounded-xl border border-ssoo-content-border bg-white shadow-2xl',
      'flex flex-col',
      'transition-all duration-200',
      isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
    ].join(' ')
  ), [isOpen]);

  return (
    <section className={panelClassName} aria-hidden={!isOpen}>
      <header className="flex items-center justify-between gap-2 border-b border-ssoo-content-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ssoo-content-bg">
            <Bot className="h-4 w-4 text-ssoo-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ssoo-primary">AI 어시스턴트</p>
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
          크게보기
        </button>
      </header>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div ref={historyRef} className="sticky left-0 top-0 z-20 h-0">
          <div className="pointer-events-auto w-fit space-y-2">
          <div className="flex flex-col items-start gap-2">
            <button
              type="button"
              onClick={() => {
                startNewSession();
                setHistoryOpen(false);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ssoo-content-border bg-ssoo-content-border/60 text-ssoo-primary/75 opacity-55 transition-all hover:border-ssoo-primary/40 hover:bg-ssoo-content-border hover:text-ssoo-primary hover:opacity-100 focus-visible:opacity-100"
              title="새 채팅 세션"
              aria-label="새 채팅 세션"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ssoo-content-border bg-ssoo-content-border/60 text-ssoo-primary/75 opacity-55 transition-all hover:border-ssoo-primary/40 hover:bg-ssoo-content-border hover:text-ssoo-primary hover:opacity-100 focus-visible:opacity-100"
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
                onSelect={(item) => {
                  selectSession(item.id);
                  setHistoryOpen(false);
                }}
                onTogglePersist={(item) => {
                  if (item.persistedToDb) {
                    void removeSessionFromDb(item.id).then((result) => {
                      if (!result.success) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success('세션 DB 저장을 해제했습니다.');
                    });
                    return;
                  }
                  void saveSession(item.id).then((result) => {
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success('세션을 DB에 저장했습니다.');
                  });
                }}
                variant="panel"
              />
            </div>
          )}
          </div>
        </div>
        {!hasMessages ? (
          <div className="rounded-lg border border-dashed border-ssoo-content-border bg-ssoo-content-bg/30 p-4 text-sm text-ssoo-primary/70">
            우리 서비스의 기능과 문서 내용에 대해 자유롭게 대화해 보세요 !
          </div>
        ) : (
          <AssistantMessageList
            messages={messages}
            onOpenFile={handleOpenFile}
            onOpenHelpAction={handleOpenHelpAction}
            variant="panel"
          />
        )}
      </div>

      <div className="border-t border-ssoo-content-border p-3">
        <AssistantComposer
          inputRef={inputRef}
          inputDraft={inputDraft}
          isProcessing={isProcessing}
          setInputDraft={setInputDraft}
          submitUserMessage={submitUserMessage}
          placeholder="질문하거나, 파일을 찾아달라고 요청하세요."
          submitVariant="icon"
          suggestions={suggestions}
          suggestionsCollapsed={suggestionsCollapsed}
          onToggleSuggestions={() => setSuggestionsCollapsed(!suggestionsCollapsed)}
        />
      </div>
    </section>
  );
}
