'use client';

import { ExternalLink } from 'lucide-react';
import { AssistantComposer } from '@/components/common/assistant/Composer';
import { AssistantMessageList } from '@/components/common/assistant/MessageList';
import { SHELL_BODY_WRAPPER_PRESETS } from '@/components/templates/page-frame';
import type { AssistantHelpAction } from '@/lib/assistant/assistantHelp';
import type { AssistantMessage, AssistantSearchResult } from '@/stores';

interface AiChatBodyProps {
  messages: AssistantMessage[];
  isProcessing: boolean;
  startNewSession: () => void;
  handleOpenFile: (result: AssistantSearchResult) => void | Promise<void>;
  handleOpenHelpAction: (action: AssistantHelpAction) => void | Promise<void>;
  submitUserMessage: (message: string) => void | Promise<void>;
}

export function AiChatBody({
  messages,
  isProcessing,
  startNewSession,
  handleOpenFile,
  handleOpenHelpAction,
  submitUserMessage,
}: AiChatBodyProps) {
  return (
    <div
      className={[
        SHELL_BODY_WRAPPER_PRESETS.aiChat,
        messages.length === 0 ? 'overflow-hidden' : 'overflow-y-auto',
      ].join(' ')}
    >
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
  );
}

interface AiChatFooterProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  inputDraft: string;
  isProcessing: boolean;
  setInputDraft: (value: string) => void;
  submitUserMessage: (message: string) => Promise<void>;
  onAbort?: () => void;
}

export function AiChatFooter({
  inputRef,
  inputDraft,
  isProcessing,
  setInputDraft,
  submitUserMessage,
  onAbort,
}: AiChatFooterProps) {
  return (
    <AssistantComposer
      inputRef={inputRef}
      inputDraft={inputDraft}
      isProcessing={isProcessing}
      setInputDraft={setInputDraft}
      submitUserMessage={submitUserMessage}
      placeholder="AI에게 무엇이든 물어보세요. 문서 내용을 기반으로 대화하고 검색하거나, 기능 사용법을 안내받을 수도 있습니다!"
      submitVariant="text"
      onAbort={onAbort}
    />
  );
}
