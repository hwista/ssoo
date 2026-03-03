'use client';

import { useCallback, useEffect, type RefObject } from 'react';
import { ChevronDown, ChevronUp, Loader2, Search, SendHorizontal } from 'lucide-react';
import type { TemplateItem } from '@/types/template';
import {
  AssistantReferenceChips,
  AssistantReferencePicker,
  type InlineSummaryFileItem,
} from './ReferencePicker';

interface InlineContextProps {
  selectedTemplates: TemplateItem[];
  summaryFiles: InlineSummaryFileItem[];
  onToggleTemplate: (template: TemplateItem) => void;
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
  inlineTemplates?: TemplateItem[];
  inlineSummaryFiles?: InlineSummaryFileItem[];
  inlineWarnings?: string[];
  onInlineRemoveTemplate?: (id: string) => void;
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
  inlineTemplates,
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
    const maxHeight = lineHeight * 5 + paddingTop + paddingBottom + borderTop + borderBottom;

    element.style.height = 'auto';
    const nextHeight = Math.min(element.scrollHeight, maxHeight);
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
        inlineTemplates={inlineTemplates}
        inlineSummaryFiles={inlineSummaryFiles}
        inlineWarnings={inlineWarnings}
        onInlineRemoveTemplate={onInlineRemoveTemplate}
        onInlineRemoveSummaryFile={onInlineRemoveSummaryFile}
        onInlineClearAll={onInlineClearAll}
      />
      <div className="flex items-center gap-2">
        <AssistantReferencePicker
          disabled={isProcessing}
          mode={mode}
          inlineContext={inlineContext}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ssoo-primary/50" />
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
            className="min-h-10 w-full resize-none rounded-lg border border-ssoo-content-border pl-9 pr-3 py-2 text-sm focus:border-ssoo-primary focus:outline-none"
            rows={1}
          />
        </div>
        {submitVariant === 'text' ? (
          <button
            type="submit"
            disabled={isProcessing || !inputDraft.trim()}
            className="flex h-10 items-center gap-2 rounded-lg bg-ssoo-primary px-4 text-sm font-medium text-white transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            {submitLabel}
          </button>
        ) : (
          <button
            type="submit"
            disabled={isProcessing || !inputDraft.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-ssoo-primary text-white transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="전송"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </button>
        )}
      </div>
    </form>
  );
}
