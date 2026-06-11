'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollToLatestButton } from '@/components/common/ScrollToLatestButton';
import { useAssistantContextStore, useAssistantPanelStore, useAssistantSessionStore } from '@/stores';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useAssistantChat } from '../chat/useAssistantChat';
import { AssistantMessageList } from '../MessageList';
import {
  FloatingAssistantFooter,
  FloatingAssistantHeader,
  FloatingAssistantHistory,
} from './FloatingAssistantPanelSections';
import { useFloatingAssistantPanelBehavior } from './useFloatingAssistantPanelBehavior';

interface FloatingAssistantPanelProps {
  isOpen: boolean;
}

export function FloatingAssistantPanel({ isOpen }: FloatingAssistantPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const messages = useAssistantSessionStore((state) => state.messages);
  const sessions = useAssistantSessionStore((state) => state.sessions);
  const activeSessionId = useAssistantSessionStore((state) => state.activeSessionId);
  const inputDraft = useAssistantPanelStore((state) => state.inputDraft);
  const isProcessing = useAssistantPanelStore((state) => state.isProcessing);
  const suggestions = useAssistantPanelStore((state) => state.suggestions);
  const suggestionsCollapsed = useAssistantPanelStore((state) => state.suggestionsCollapsed);

  const setInputDraft = useAssistantPanelStore((state) => state.setInputDraft);
  const regenerateSuggestions = useAssistantPanelStore((state) => state.regenerateSuggestions);
  const setSuggestionsCollapsed = useAssistantPanelStore((state) => state.setSuggestionsCollapsed);
  const closePanel = useAssistantPanelStore((state) => state.closePanel);
  const resetDraftState = useAssistantPanelStore((state) => state.resetDraftState);
  const resetContext = useAssistantContextStore((state) => state.resetContext);
  const startNewSession = useAssistantSessionStore((state) => state.startNewSession);
  const selectSession = useAssistantSessionStore((state) => state.selectSession);

  const { submitUserMessage, abortChat, handleOpenFile, handleOpenHelpAction, openExpandedChatPage } = useAssistantChat();
  const {
    hasMessages,
    historyOpen,
    setHistoryOpen,
    panelClassName,
    panelStyle,
  } = useFloatingAssistantPanelBehavior({
    isOpen,
    messagesLength: messages.length,
    inputRef,
    historyRef,
    regenerateSuggestions,
    setSuggestionsCollapsed,
    setInputDraft,
  });
  const {
    showScrollToBottom,
    scrollToBottom,
    scrollToBottomIfNeeded,
  } = useAutoScroll({
    scrollRef,
    active: isOpen && hasMessages,
  });
  const streamingContentLength = useMemo(() => {
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.kind === 'text' && lastMessage.pending ? lastMessage.text.length : 0;
  }, [messages]);

  useEffect(() => {
    scrollToBottomIfNeeded();
  }, [messages.length, scrollToBottomIfNeeded, streamingContentLength]);

  useEffect(() => {
    if (!isOpen || !hasMessages) return;
    scrollToBottom({ force: true });
  }, [activeSessionId, hasMessages, isOpen, scrollToBottom]);

  const onExpand = useCallback(async () => {
    await openExpandedChatPage();
    closePanel();
  }, [closePanel, openExpandedChatPage]);

  return (
    <section className={panelClassName} style={panelStyle} aria-hidden={!isOpen}>
      <FloatingAssistantHeader onExpand={onExpand} />

      <FloatingAssistantHistory
        historyRef={historyRef}
        historyOpen={historyOpen}
        isOpen={isOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onStartNewSession={() => {
          startNewSession();
          resetDraftState();
          resetContext();
          setHistoryOpen(false);
        }}
        onToggleHistory={() => setHistoryOpen((prev) => !prev)}
        onSelectSession={(id) => {
          selectSession(id);
          resetDraftState();
          resetContext();
          setHistoryOpen(false);
        }}
      />

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto px-4 py-3 pb-12">
          {!hasMessages ? (
            <div className="rounded-lg border border-dashed border-ssoo-content-border bg-ssoo-content-bg/30 p-4 text-body-sm text-ssoo-primary/70">
              우리 서비스의 기능과 문서 내용에 대해 자유롭게 대화해 보세요 !
            </div>
          ) : (
            <AssistantMessageList
              messages={messages}
              onOpenFile={handleOpenFile}
              onOpenHelpAction={handleOpenHelpAction}
              onResendUserMessage={submitUserMessage}
              actionDisabled={isProcessing}
              variant="panel"
            />
          )}
        </div>
        <ScrollToLatestButton
          visible={showScrollToBottom}
          onClick={() => scrollToBottom({ force: true, behavior: 'smooth' })}
          label="최신 응답으로 이동"
          className="bottom-3 right-3 h-8 w-8"
        />
      </div>

      <FloatingAssistantFooter
        inputRef={inputRef}
        inputDraft={inputDraft}
        isProcessing={isProcessing}
        setInputDraft={setInputDraft}
        submitUserMessage={submitUserMessage}
        onAbort={abortChat}
        suggestions={suggestions}
        suggestionsCollapsed={suggestionsCollapsed}
        onToggleSuggestions={() => setSuggestionsCollapsed(!suggestionsCollapsed)}
      />
    </section>
  );
}
