'use client';

import { useCallback, useRef } from 'react';
import { toast } from '@/lib/toast';
import { useAssistantContextStore, useAssistantPanelStore, useAssistantSessionStore } from '@/stores';
import { useAssistantChat } from '../chat/useAssistantChat';
import { useAssistantSessionPersistence } from '../session/useAssistantSessionPersistence';
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

  const { submitUserMessage, handleOpenFile, handleOpenHelpAction, openExpandedAskPage } = useAssistantChat();
  const { saveSession, removeSessionFromDb } = useAssistantSessionPersistence();
  const {
    hasMessages,
    historyOpen,
    setHistoryOpen,
    panelClassName,
  } = useFloatingAssistantPanelBehavior({
    isOpen,
    messagesLength: messages.length,
    scrollRef,
    inputRef,
    historyRef,
    regenerateSuggestions,
    setSuggestionsCollapsed,
    setInputDraft,
  });

  const onExpand = useCallback(async () => {
    await openExpandedAskPage();
    closePanel();
  }, [closePanel, openExpandedAskPage]);

  return (
    <section className={panelClassName} aria-hidden={!isOpen}>
      <FloatingAssistantHeader onExpand={onExpand} />

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <FloatingAssistantHistory
          historyRef={historyRef}
          historyOpen={historyOpen}
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
        />
        {!hasMessages ? (
          <div className="rounded-lg border border-dashed border-ssoo-content-border bg-ssoo-content-bg/30 p-4 text-sm text-ssoo-primary/70">
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

      <FloatingAssistantFooter
        inputRef={inputRef}
        inputDraft={inputDraft}
        isProcessing={isProcessing}
        setInputDraft={setInputDraft}
        submitUserMessage={submitUserMessage}
        suggestions={suggestions}
        suggestionsCollapsed={suggestionsCollapsed}
        onToggleSuggestions={() => setSuggestionsCollapsed(!suggestionsCollapsed)}
      />
    </section>
  );
}
