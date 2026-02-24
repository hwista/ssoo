'use client';

import { ArrowRight, BookOpen, Bot, FileText, Loader2, Search, Settings, User } from 'lucide-react';
import type { ComponentType } from 'react';
import type { AssistantHelpAction } from '@/lib/utils/assistantHelp';
import { toTextBlocks, type AssistantTextBlock } from '@/lib/utils/assistantTextFormat';
import type { AssistantMessage, AssistantSearchResult } from '@/stores';
import { SearchResultCard } from '@/components/common/search/ResultCard';

interface AssistantMessageListProps {
  messages: AssistantMessage[];
  onOpenFile: (result: AssistantSearchResult) => Promise<void> | void;
  onOpenHelpAction: (action: AssistantHelpAction) => Promise<void> | void;
  variant?: 'panel' | 'page';
}

const iconMap: Record<AssistantHelpAction['icon'], ComponentType<{ className?: string }>> = {
  Bot,
  Search,
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
  variant = 'panel',
}: AssistantMessageListProps) {
  const stackClass = variant === 'panel' ? 'space-y-3' : 'space-y-4';
  const assistantBubbleClass = variant === 'panel'
    ? 'max-w-[80%] rounded-xl px-3 py-2 text-sm'
    : 'max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed';
  const avatarClass = variant === 'panel'
    ? 'mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-ssoo-content-bg'
    : 'flex h-control-h w-control-h shrink-0 items-center justify-center rounded-full bg-ssoo-content-bg';
  const userAvatarClass = variant === 'panel'
    ? 'mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-ssoo-primary'
    : 'flex h-control-h w-control-h shrink-0 items-center justify-center rounded-full bg-ssoo-primary';

  return (
    <div className={stackClass}>
      {messages.map((message) => {
        if (message.kind === 'search-results') {
          const snippetHighlightTerms = tokenizeHighlightTerms(message.query);
          return (
            <div key={message.id} className="space-y-2">
              <p className="text-xs text-ssoo-primary/70">
                검색 결과: <span className="font-medium">{message.query}</span>
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
              <div className={variant === 'panel' ? 'max-w-[86%] space-y-2 rounded-xl bg-ssoo-content-bg px-3 py-2 text-sm text-ssoo-primary' : 'space-y-2'}>
                <p className="text-sm leading-6 text-ssoo-primary">{message.summary}</p>
                <div className="space-y-2">
                  {message.actions.map((action) => {
                    const ActionIcon = iconMap[action.icon];
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
                              <p className="truncate text-sm font-medium text-ssoo-primary">{action.title}</p>
                              <p className="text-xs text-ssoo-primary/70">{action.description}</p>
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
        const textBlocks = !isUser ? toTextBlocks(message.text) : [];
        const renderBlocks: AssistantTextBlock[] = textBlocks.length > 0 ? textBlocks : [{ type: 'paragraph', text: message.text }];
        let orderedItemIndex = 0;

        return (
          <div key={message.id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
              <div className={avatarClass}>
                <Bot className={variant === 'panel' ? 'h-4 w-4 text-ssoo-primary' : 'h-5 w-5 text-ssoo-primary'} />
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
                  <div className="space-y-1.5 break-words text-ssoo-primary">
                    {renderBlocks.map((block, index) => (
                      block.type === 'list-item' ? (
                        <p key={`${message.id}-li-${index}`} className="flex gap-2 leading-6">
                          <span className="mt-[3px] text-ssoo-primary/50">{block.ordered ? `${++orderedItemIndex}.` : '•'}</span>
                          <span>{block.text}</span>
                        </p>
                      ) : (
                        <p key={`${message.id}-p-${index}`} className="leading-6">{block.text}</p>
                      )
                    ))}
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
