'use client';

import { ArrowRight, BookOpen, Bot, Copy, FileText, Loader2, RotateCcw, Settings, User } from 'lucide-react';
import { useCallback, type ComponentType } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidBlock } from '@/components/common/MermaidBlock';
import { toast } from '@/lib/toast';
import type { AssistantHelpAction } from '@/lib/assistant/assistantHelp';
import type { AssistantMessage, AssistantSearchResult } from '@/stores';
import { SearchResultCard } from '@/components/common/assistant/_components/ResultCard';

interface AssistantMessageListProps {
  messages: AssistantMessage[];
  onOpenFile: (result: AssistantSearchResult) => Promise<void> | void;
  onOpenHelpAction: (action: AssistantHelpAction) => Promise<void> | void;
  onResendUserMessage?: (text: string) => Promise<void> | void;
  actionDisabled?: boolean;
  variant?: 'panel' | 'page';
}

const iconMap: Record<AssistantHelpAction['icon'], ComponentType<{ className?: string }>> = {
  Bot,
  FileText,
  Settings,
  BookOpen,
};

function tokenizeHighlightTerms(query: string): string[] {
  return Array.from(new Set(
    query
      .toLowerCase()
      .split(/[\s,.;:!?()[\]{}"'`/\\|]+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2)
  ));
}

export function AssistantMessageList({
  messages,
  onOpenFile,
  onOpenHelpAction,
  onResendUserMessage,
  actionDisabled = false,
  variant = 'panel',
}: AssistantMessageListProps) {
  const stackClass = variant === 'panel' ? 'space-y-3' : 'space-y-4';
  const assistantBubbleClass = variant === 'panel'
    ? 'max-w-[80%] rounded-xl px-3 py-2 text-body-sm'
    : 'max-w-[78%] rounded-xl px-4 py-3 text-body-sm leading-relaxed';
  const avatarClass = variant === 'panel'
    ? 'mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-ssoo-content-bg'
    : 'flex h-control-h w-control-h shrink-0 items-center justify-center rounded-full bg-ssoo-content-bg';
  const userAvatarClass = variant === 'panel'
    ? 'mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-ssoo-primary'
    : 'flex h-control-h w-control-h shrink-0 items-center justify-center rounded-full bg-ssoo-primary';
  const messageActionButtonClass = variant === 'panel'
    ? 'inline-flex h-7 w-7 items-center justify-center rounded-full border border-ssoo-content-border bg-white text-ssoo-primary/75 transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg hover:text-ssoo-primary disabled:cursor-not-allowed disabled:opacity-60'
    : 'inline-flex h-8 w-8 items-center justify-center rounded-full border border-ssoo-content-border bg-white text-ssoo-primary/75 transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg hover:text-ssoo-primary disabled:cursor-not-allowed disabled:opacity-60';
  const messageActionIconClass = variant === 'panel' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  const handleCopyUserMessage = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('질문을 클립보드에 복사했습니다.');
    } catch {
      toast.error('클립보드 복사에 실패했습니다.');
    }
  }, []);

  return (
    <div className={stackClass}>
      {messages.map((message) => {
        if (message.kind === 'search-results') {
          const snippetHighlightTerms = tokenizeHighlightTerms(message.query);
          return (
            <div key={message.id} className="space-y-2">
              <p className="text-caption text-ssoo-primary/70">
                검색 결과: <span className="text-label-sm">{message.query}</span>
              </p>
              {message.results.map((result) => (
                <SearchResultCard
                  key={`${message.id}-${result.id}`}
                  result={result}
                  compact={variant === 'panel'}
                  highlightTerms={snippetHighlightTerms}
                  onClick={() => {
                    void onOpenFile(result);
                  }}
                />
              ))}
            </div>
          );
        }

        if (message.kind === 'help-actions') {
          return (
            <div key={message.id} className={variant === 'panel' ? 'flex gap-2 justify-start' : 'space-y-2 rounded-xl border border-ssoo-content-border bg-ssoo-content-bg px-4 py-3'}>
              {variant === 'panel' && (
                <div className={avatarClass}>
                  <Bot className="h-4 w-4 text-ssoo-primary" />
                </div>
              )}
              <div className={variant === 'panel' ? 'max-w-[86%] space-y-2 rounded-xl bg-ssoo-content-bg px-3 py-2 text-body-sm text-ssoo-primary' : 'space-y-2'}>
                <p className="text-body-sm leading-6 text-ssoo-primary">{message.summary}</p>
                <div className="space-y-2">
                  {message.actions.map((action) => {
                    const ActionIcon = iconMap[action.icon as AssistantHelpAction['icon']] ?? Bot;
                    return (
                      <button
                        key={`${message.id}-${action.id}`}
                        type="button"
                        onClick={() => {
                          void onOpenHelpAction(action);
                        }}
                        className="w-full rounded-lg border border-ssoo-content-border bg-white px-3 py-2 text-left transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg/60"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 gap-2">
                            <ActionIcon className="mt-0.5 h-4 w-4 shrink-0 text-ssoo-primary/70" />
                            <div className="min-w-0">
                              <p className="truncate text-label-md text-ssoo-primary">{action.title}</p>
                              <p className="text-caption text-ssoo-primary/70">{action.description}</p>
                            </div>
                          </div>
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-ssoo-primary/50" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        const isUser = message.role === 'user';

        return (
          <div key={message.id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
              <div className={avatarClass}>
                <Bot className={variant === 'panel' ? 'h-4 w-4 text-ssoo-primary' : 'h-5 w-5 text-ssoo-primary'} />
              </div>
            )}
            {isUser && message.text.trim().length > 0 && (
              <div className="flex items-center gap-1.5 self-end">
                <button
                  type="button"
                  onClick={() => {
                    void handleCopyUserMessage(message.text);
                  }}
                  disabled={actionDisabled}
                  className={messageActionButtonClass}
                  title="복사"
                  aria-label="질문 복사"
                >
                  <Copy className={messageActionIconClass} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!onResendUserMessage) return;
                    void onResendUserMessage(message.text);
                  }}
                  disabled={actionDisabled || !onResendUserMessage}
                  className={messageActionButtonClass}
                  title="재전송"
                  aria-label="질문 재전송"
                >
                  <RotateCcw className={messageActionIconClass} />
                </button>
              </div>
            )}
            <div className={`${assistantBubbleClass} ${isUser ? 'bg-ssoo-primary text-white' : 'bg-ssoo-content-bg text-ssoo-primary'}`}>
              {message.pending && !message.text ? (
                <span className="inline-flex items-center gap-1 text-ssoo-primary/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  응답 생성 중...
                </span>
              ) : (
                isUser ? (
                  <span className="whitespace-pre-wrap break-words">{message.text}</span>
                ) : (
                  <div className="assistant-markdown break-words text-ssoo-primary">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            {children}
                          </a>
                        ),
                        code: ({ className, children, ...rest }) => {
                          const match = /language-(\w+)/.exec(className ?? '');
                          if (match?.[1] === 'mermaid') {
                            return <MermaidBlock code={String(children).replace(/\n$/, '')} />;
                          }
                          return <code className={className} {...rest}>{children}</code>;
                        },
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                )
              )}
            </div>
            {isUser && (
              <div className={userAvatarClass}>
                <User className={variant === 'panel' ? 'h-4 w-4 text-white' : 'h-5 w-5 text-white'} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
