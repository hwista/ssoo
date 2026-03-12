'use client';

import { useCallback, useEffect, type RefObject } from 'react';
import { ChevronDown, ChevronUp, Loader2, Search, SendHorizontal } from 'lucide-react';
import type { TemplateItem } from '@/types/template';
import {
  AssistantReferencePicker,
  type InlineSummaryFileItem,
} from './reference/Picker';
import { AssistantReferenceChips } from './reference/Chips';

interface InlineContextProps {
  selectedTemplate: TemplateItem | null;
  summaryFiles: InlineSummaryFileItem[];
  onSelectTemplate: (template: TemplateItem) => void | Promise<void>;
  onUpsertSummaryFiles: (files: InlineSummaryFileItem[]) => void;
}

interface AssistantComposerProps {
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  inputDraft: string;
  isProcessing: boolean;
  setInputDraft: (value: string) => void;
  submitUserMessage: (text: string) => Promise<void>;
  placeholder: string;
  submitVariant?: 'icon' | 'text';
  submitLabel?: string;
  mode?: 'assistant' | 'inline';
  inlineContext?: InlineContextProps;
  inlineTemplate?: TemplateItem | null;
  inlineSummaryFiles?: InlineSummaryFileItem[];
  inlineWarnings?: string[];
  onInlineRemoveTemplate?: () => void;
  onInlineRemoveSummaryFile?: (id: string) => void;
  onInlineClearAll?: () => void;
  suggestions?: string[];
  suggestionsCollapsed?: boolean;
  onToggleSuggestions?: () => void;
}

export function AssistantComposer({
  inputRef,
  inputDraft,
  isProcessing,
  setInputDraft,
  submitUserMessage,
  placeholder,
  submitVariant = 'icon',
  submitLabel = '전송',
  mode = 'assistant',
  inlineContext,
  inlineTemplate,
  inlineSummaryFiles,
  inlineWarnings,
  onInlineRemoveTemplate,
  onInlineRemoveSummaryFile,
  onInlineClearAll,
  suggestions = [],
  suggestionsCollapsed,
  onToggleSuggestions,
}: AssistantComposerProps) {
  const resizeTextarea = useCallback((element: HTMLTextAreaElement) => {
    const style = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(style.lineHeight) || 20;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
    const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;
    const minHeight = Number.parseFloat(style.minHeight) || 40;
    const maxHeight = lineHeight * 5 + paddingTop + paddingBottom + borderTop + borderBottom;

    element.style.height = 'auto';
    const nextHeight = Math.max(minHeight, Math.min(element.scrollHeight, maxHeight));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    if (!inputRef?.current) return;
    resizeTextarea(inputRef.current);
  }, [inputDraft, inputRef, resizeTextarea]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submitUserMessage(inputDraft);
      }}
      className="w-full"
    >
      {onToggleSuggestions && (
        <div className="mb-2">
          <button
            type="button"
            onClick={onToggleSuggestions}
            className="flex w-full items-center justify-between rounded-md border border-transparent px-1 py-1 text-xs font-medium text-ssoo-primary/70 transition-colors hover:border-ssoo-content-border hover:bg-ssoo-content-bg/40"
          >
            <span>추천 질문</span>
            {suggestionsCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {onToggleSuggestions && !suggestionsCollapsed && (
        <div className="mb-2 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={isProcessing}
              onClick={() => {
                void submitUserMessage(suggestion);
              }}
              className="max-w-full truncate rounded-full border border-ssoo-content-border bg-ssoo-content-bg/60 px-3 py-1.5 text-xs text-ssoo-primary transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg disabled:cursor-not-allowed disabled:opacity-60"
              title={suggestion}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <AssistantReferenceChips
        disabled={isProcessing}
        mode={mode}
        inlineTemplate={inlineTemplate}
        inlineSummaryFiles={inlineSummaryFiles}
        inlineWarnings={inlineWarnings}
        onInlineRemoveTemplate={onInlineRemoveTemplate}
        onInlineRemoveSummaryFile={onInlineRemoveSummaryFile}
        onInlineClearAll={onInlineClearAll}
      />
      <div className="flex h-10 items-stretch gap-2">
        <AssistantReferencePicker
          disabled={isProcessing}
          mode={mode}
          inlineContext={inlineContext}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ssoo-primary/50" />
          <textarea
            ref={inputRef}
            value={inputDraft}
            onChange={(event) => {
              setInputDraft(event.target.value);
              resizeTextarea(event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              if (event.ctrlKey) {
                event.preventDefault();
                void submitUserMessage(inputDraft);
                return;
              }
              if (event.shiftKey) return;
              if (!inputDraft.includes('\n')) {
                event.preventDefault();
                void submitUserMessage(inputDraft);
              }
            }}
            placeholder={placeholder}
            className="block h-full min-h-10 w-full resize-none rounded-lg border border-ssoo-content-border py-2 pl-9 pr-3 text-sm leading-5 focus:border-ssoo-primary focus:outline-none"
            rows={1}
          />
        </div>
        {submitVariant === 'text' ? (
          <button
            type="submit"
            disabled={isProcessing || !inputDraft.trim()}
            className="flex h-full items-center justify-center gap-2 rounded-lg bg-ssoo-primary px-4 text-sm font-medium leading-none text-white transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            {submitLabel}
          </button>
        ) : (
          <button
            type="submit"
            disabled={isProcessing || !inputDraft.trim()}
            className="flex h-full w-10 items-center justify-center rounded-lg bg-ssoo-primary text-white transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="전송"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </button>
        )}
      </div>
    </form>
  );
}
