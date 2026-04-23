'use client';

import { useEffect, useMemo, useRef } from 'react';
import { toast } from '@/lib/toast';
import { ErrorState } from '@/components/common/StateDisplay';
import { PageTemplate } from '@/components/templates';
import {
  DOC_PAGE_SURFACE_PRESETS,
  PAGE_BACKGROUND_PRESETS,
  SectionedShell,
} from '@/components/templates/page-frame';
import { useAccessStore, useAssistantContextStore, useAssistantPanelStore, useAssistantSessionStore } from '@/stores';
import { useAssistantChat } from '@/components/common/assistant/chat/useAssistantChat';
import { useAssistantSessionPersistence } from '@/components/common/assistant/session/useAssistantSessionPersistence';
import { AiPanel } from './_components/AiPanel';
import { AiChatBody, AiChatFooter } from './_components/AiChatPanels';
import { buildSessionHistoryItems } from './chatPageUtils';

export function AiChatPage() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messages = useAssistantSessionStore((state) => state.messages);
  const sessions = useAssistantSessionStore((state) => state.sessions);
  const activeSessionId = useAssistantSessionStore((state) => state.activeSessionId);
  const startNewSession = useAssistantSessionStore((state) => state.startNewSession);
  const selectSession = useAssistantSessionStore((state) => state.selectSession);
  const canUseAssistant = useAccessStore((state) => state.snapshot?.features.canUseAssistant ?? false);
  const inputDraft = useAssistantPanelStore((state) => state.inputDraft);
  const isProcessing = useAssistantPanelStore((state) => state.isProcessing);
  const suggestions = useAssistantPanelStore((state) => state.suggestions);
  const setInputDraft = useAssistantPanelStore((state) => state.setInputDraft);
  const regenerateSuggestions = useAssistantPanelStore((state) => state.regenerateSuggestions);
  const setSuggestionsCollapsed = useAssistantPanelStore((state) => state.setSuggestionsCollapsed);
  const resetDraftState = useAssistantPanelStore((state) => state.resetDraftState);
  const resetContext = useAssistantContextStore((state) => state.resetContext);
  const { submitUserMessage, abortChat, handleOpenFile, handleOpenHelpAction } = useAssistantChat();
  const { saveSession, removeSessionFromDb } = useAssistantSessionPersistence();

  const historyItems = useMemo(
    () => buildSessionHistoryItems(sessions, activeSessionId),
    [activeSessionId, sessions]
  );

  useEffect(() => {
    regenerateSuggestions(6);
    if (messages.length === 0) {
      setSuggestionsCollapsed(false);
    }
  }, [messages.length, regenerateSuggestions, setSuggestionsCollapsed]);

  if (!canUseAssistant) {
    return (
      <main className={`h-full overflow-hidden ${PAGE_BACKGROUND_PRESETS.ai}`}>
        <div className="flex h-full items-center justify-center">
          <ErrorState error="AI 어시스턴트를 사용할 권한이 없습니다." />
        </div>
      </main>
    );
  }

  return (
    <main className={`h-full overflow-hidden ${PAGE_BACKGROUND_PRESETS.ai}`}>
      <PageTemplate
        filePath="ai/chat"
        mode="viewer"
        breadcrumbRootIconVariant="ai"
        contentOrientation="portrait"
        description="질문, 문서 검색, 기능 안내를 요청하세요."
        contentSurfaceClassName={DOC_PAGE_SURFACE_PRESETS.ai}
        panelContent={(
          <AiPanel
            variant="chat"
            history={historyItems}
            onHistorySelect={(item) => {
              selectSession(item.id);
              resetDraftState();
              resetContext();
            }}
            onHistoryPersistToggle={(item) => {
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
            suggestions={suggestions}
            onSuggestionSelect={(suggestion) => {
              void submitUserMessage(suggestion);
            }}
          />
        )}
      >
        <SectionedShell
          variant="chat_with_footer"
          body={(
            <AiChatBody
              messages={messages}
              isProcessing={isProcessing}
              startNewSession={() => {
                startNewSession();
                resetDraftState();
                resetContext();
              }}
              handleOpenFile={handleOpenFile}
              handleOpenHelpAction={handleOpenHelpAction}
              submitUserMessage={submitUserMessage}
            />
          )}
          footer={(
            <AiChatFooter
              inputRef={inputRef}
              inputDraft={inputDraft}
              isProcessing={isProcessing}
              setInputDraft={setInputDraft}
              submitUserMessage={submitUserMessage}
              onAbort={abortChat}
            />
          )}
        />
      </PageTemplate>
    </main>
  );
}
