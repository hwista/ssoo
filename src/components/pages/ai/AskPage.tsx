'use client';

import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { DocPageTemplate } from '@/components/templates';
import {
  DOC_PAGE_SURFACE_PRESETS,
  PAGE_BACKGROUND_PRESETS,
  SectionedShell,
} from '@/components/templates/page-frame';
import { useAssistantStore } from '@/stores';
import { useAssistantChat } from '@/components/common/assistant/chat/useAssistantChat';
import { useAssistantSessionPersistence } from '@/components/common/assistant/session/useAssistantSessionPersistence';
import { AiSidecar } from './_components/AiSidecar';
import { AiAskBody, AiAskFooter } from './_components/AiAskPanels';
import { buildSessionHistoryItems } from './askPageUtils';

export function AiAskPage() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messages = useAssistantStore((state) => state.messages);
  const inputDraft = useAssistantStore((state) => state.inputDraft);
  const isProcessing = useAssistantStore((state) => state.isProcessing);
  const suggestions = useAssistantStore((state) => state.suggestions);
  const sessions = useAssistantStore((state) => state.sessions);
  const activeSessionId = useAssistantStore((state) => state.activeSessionId);
  const setInputDraft = useAssistantStore((state) => state.setInputDraft);
  const regenerateSuggestions = useAssistantStore((state) => state.regenerateSuggestions);
  const setSuggestionsCollapsed = useAssistantStore((state) => state.setSuggestionsCollapsed);
  const startNewSession = useAssistantStore((state) => state.startNewSession);
  const selectSession = useAssistantStore((state) => state.selectSession);
  const { submitUserMessage, handleOpenFile, handleOpenHelpAction } = useAssistantChat();
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

  return (
    <main className={`h-full overflow-hidden ${PAGE_BACKGROUND_PRESETS.ai}`}>
      <DocPageTemplate
        filePath="ai/ask"
        mode="viewer"
        breadcrumbRootIconVariant="ai"
        contentOrientation="portrait"
        description="질문, 문서 검색, 기능 안내를 요청하세요."
        contentSurfaceClassName={DOC_PAGE_SURFACE_PRESETS.ai}
        sidecarContent={(
          <AiSidecar
            variant="ask"
            history={historyItems}
            onHistorySelect={(item) => selectSession(item.id)}
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
            <AiAskBody
              messages={messages}
              isProcessing={isProcessing}
              startNewSession={startNewSession}
              handleOpenFile={handleOpenFile}
              handleOpenHelpAction={handleOpenHelpAction}
              submitUserMessage={submitUserMessage}
            />
          )}
          footer={(
            <AiAskFooter
              inputRef={inputRef}
              inputDraft={inputDraft}
              isProcessing={isProcessing}
              setInputDraft={setInputDraft}
              submitUserMessage={submitUserMessage}
            />
          )}
        />
      </DocPageTemplate>
    </main>
  );
}
