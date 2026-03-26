'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { ChevronDown, ChevronUp, Loader2, SendHorizontal, Square } from 'lucide-react';
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
  usedSummaryFileIds?: Set<string>;
  isTemplateUsed?: boolean;
  deletedFileIds?: Set<string>;
  isTemplateDeleted?: boolean;
  onInlineRemoveTemplate?: () => void;
  onInlineRemoveSummaryFile?: (id: string) => void;
  onInlineRestoreTemplate?: () => void;
  onInlineRestoreSummaryFile?: (id: string) => void;
  onInlineClearAll?: () => void;
  onAbort?: () => void;
  hasFailedRestore?: boolean;
  isRetryingRestore?: boolean;
  onRetryRestore?: () => void;
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
  usedSummaryFileIds,
  isTemplateUsed,
  deletedFileIds,
  isTemplateDeleted,
  onInlineRemoveTemplate,
  onInlineRemoveSummaryFile,
  onInlineRestoreTemplate,
  onInlineRestoreSummaryFile,
  onInlineClearAll,
  onAbort,
  hasFailedRestore,
  isRetryingRestore,
  onRetryRestore,
  suggestions = [],
  suggestionsCollapsed,
  onToggleSuggestions,
}: AssistantComposerProps) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      internalRef.current = node;
      if (inputRef && 'current' in inputRef) {
        (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    },
    [inputRef],
  );

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
    if (!internalRef.current) return;
    resizeTextarea(internalRef.current);
  }, [inputDraft, resizeTextarea]);

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
        usedSummaryFileIds={usedSummaryFileIds}
        isTemplateUsed={isTemplateUsed}
        deletedFileIds={deletedFileIds}
        isTemplateDeleted={isTemplateDeleted}
        onInlineRemoveTemplate={onInlineRemoveTemplate}
        onInlineRemoveSummaryFile={onInlineRemoveSummaryFile}
        onInlineRestoreTemplate={onInlineRestoreTemplate}
        onInlineRestoreSummaryFile={onInlineRestoreSummaryFile}
        onInlineClearAll={onInlineClearAll}
        hasFailedRestore={hasFailedRestore}
        isRetryingRestore={isRetryingRestore}
        onRetryRestore={onRetryRestore}
      />
      <div className="flex min-h-10 items-end gap-2">
        <AssistantReferencePicker
          disabled={isProcessing}
          mode={mode}
          inlineContext={inlineContext}
        />
        <div className="relative flex-1">
          <textarea
            ref={setRefs}
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
            className="block min-h-10 w-full resize-none rounded-lg border border-ssoo-content-border px-3 py-2 text-sm leading-5 focus:border-ssoo-primary focus:outline-none"
            rows={1}
          />
        </div>
        {submitVariant === 'text' ? (
          isProcessing && onAbort ? (
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAbort();
              }}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium leading-none text-white transition-colors hover:bg-destructive/90"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              중단
            </button>
          ) : (
            <button
              type="submit"
              disabled={isProcessing || !inputDraft.trim()}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-ssoo-primary px-4 text-sm font-medium leading-none text-white transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              {submitLabel}
            </button>
          )
        ) : (
          isProcessing && onAbort ? (
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAbort();
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive text-white transition-colors hover:bg-destructive/90"
              aria-label="중단"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isProcessing || !inputDraft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ssoo-primary text-white transition-colors hover:bg-ssoo-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="전송"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            </button>
          )
        )}
      </div>
    </form>
  );
}
