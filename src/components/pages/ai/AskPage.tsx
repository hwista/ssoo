'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { DocPageTemplate } from '@/components/templates';
import { SectionedShell } from '@/components/common/page';
import { useAssistantStore } from '@/stores';
import { useAssistantChat } from '@/components/common/assistant/useAssistantChat';
import { useAssistantSessionPersistence } from '@/components/common/assistant/useAssistantSessionPersistence';
import { AssistantMessageList } from '@/components/common/assistant/MessageList';
import { AssistantComposer } from '@/components/common/assistant/Composer';
import { AiSidecar } from './_components/AiSidecar';

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

  const historyItems = useMemo(() => {
    return sessions
      .map((session) => ({
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        active: session.id === activeSessionId,
        persistedToDb: session.persistedToDb,
      }));
  }, [activeSessionId, sessions]);

  useEffect(() => {
    regenerateSuggestions(6);
    if (messages.length === 0) {
      setSuggestionsCollapsed(false);
    }
  }, [messages.length, regenerateSuggestions, setSuggestionsCollapsed]);

  const footer = (
    <AssistantComposer
      inputRef={inputRef}
      inputDraft={inputDraft}
      isProcessing={isProcessing}
      setInputDraft={setInputDraft}
      submitUserMessage={submitUserMessage}
      placeholder="AI에게 무엇이든 물어보세요. 문서 내용을 기반으로 대화하고 검색하거나, 기능 사용법을 안내받을 수도 있습니다!"
      submitVariant="text"
    />
  );

  return (
    <main className="h-full overflow-hidden bg-ssoo-content-bg/30">
      <DocPageTemplate
        filePath="ai/ask"
        mode="viewer"
        breadcrumbRootIconVariant="ai"
        contentOrientation="portrait"
        description="질문, 문서 검색, 기능 안내를 요청하세요."
        contentSurfaceClassName="rounded-lg border-0 bg-transparent"
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
          bodyClassName={[
            'border-x border-ssoo-content-border p-4',
            messages.length === 0 ? 'overflow-hidden' : 'overflow-auto',
          ].join(' ')}
          footerClassName="flex items-center rounded-b-lg border-x border-b border-t border-ssoo-content-border p-3"
          body={(
            <div className="relative h-full">
              <div className="sticky left-0 top-0 z-10 h-0">
                <button
                  type="button"
                  onClick={startNewSession}
                  className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-ssoo-content-border bg-ssoo-content-border/60 text-ssoo-primary/75 opacity-55 transition-all hover:border-ssoo-primary/40 hover:bg-ssoo-content-border hover:text-ssoo-primary hover:opacity-100 focus-visible:opacity-100"
                  title="새 채팅 세션"
                  aria-label="새 채팅 세션"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>

              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-ssoo-primary/60">
                  첫 질문을 입력해 대화를 시작하세요.
                </div>
              ) : (
                <div className="space-y-4 pb-8 pt-12">
                  <AssistantMessageList
                    messages={messages}
                    onOpenFile={handleOpenFile}
                    onOpenHelpAction={handleOpenHelpAction}
                    onResendUserMessage={submitUserMessage}
                    actionDisabled={isProcessing}
                    variant="page"
                  />
                </div>
              )}
            </div>
          )}
          footer={footer}
        />
      </DocPageTemplate>
    </main>
  );
}
