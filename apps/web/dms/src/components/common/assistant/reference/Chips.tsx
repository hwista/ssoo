'use client';

import { Check, FileUp, Loader2, Paperclip, RefreshCw, Shapes, Undo2, X } from 'lucide-react';
import { useAssistantContextStore } from '@/stores';
import type { TemplateItem } from '@/types/template';
import type { InlineSummaryFileItem } from './Picker';

interface AssistantReferenceChipsProps {
  disabled?: boolean;
  mode?: 'assistant' | 'inline';
  inlineTemplate?: TemplateItem | null;
  inlineSummaryFiles?: InlineSummaryFileItem[];
  inlineWarnings?: string[];
  /** IDs of summary files that have been used in AI compose (synced to sidecar) */
  usedSummaryFileIds?: Set<string>;
  /** Whether the template has been used in AI compose */
  isTemplateUsed?: boolean;
  /** Soft-deleted file IDs (shown with strikethrough + restore button) */
  deletedFileIds?: Set<string>;
  /** Whether the template is soft-deleted */
  isTemplateDeleted?: boolean;
  onInlineRemoveTemplate?: () => void;
  onInlineRemoveSummaryFile?: (id: string) => void;
  onInlineRestoreTemplate?: () => void;
  onInlineRestoreSummaryFile?: (id: string) => void;
  onInlineClearAll?: () => void;
  hasFailedRestore?: boolean;
  isRetryingRestore?: boolean;
  onRetryRestore?: () => void;
}

export function AssistantReferenceChips({
  disabled,
  mode = 'assistant',
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
  hasFailedRestore,
  isRetryingRestore,
  onRetryRestore,
}: AssistantReferenceChipsProps) {
  const assistantReferences = useAssistantContextStore((state) => state.attachedReferences);
  const removeAssistantReference = useAssistantContextStore((state) => state.removeReference);
  const clearAssistantReferences = useAssistantContextStore((state) => state.clearReferences);

  const references = mode === 'assistant' ? assistantReferences : [];
  const template = mode === 'inline' ? (inlineTemplate ?? null) : null;
  const summaryFiles = mode === 'inline' ? (inlineSummaryFiles ?? []) : [];
  const warnings = mode === 'inline' ? (inlineWarnings ?? []) : [];

  const hasAnyContext = references.length > 0 || Boolean(template) || summaryFiles.length > 0;
  if (!hasAnyContext) return null;

  const handleClearAll = () => {
    if (mode === 'assistant') {
      clearAssistantReferences();
      return;
    }
    onInlineClearAll?.();
  };

  return (
    <div className="mb-2 rounded-lg border border-ssoo-primary/25 bg-ssoo-content-bg/70 px-2 py-1.5">
      <div className="mb-1 flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ssoo-primary/80">
          <Paperclip className="h-3.5 w-3.5" />
          첨부 컨텍스트
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleClearAll}
          className="ml-1 border-l border-ssoo-primary/20 pl-2 text-[11px] font-semibold text-ssoo-primary opacity-55 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="첨부 컨텍스트 전체 삭제"
        >
          전체 해제
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {references.map((ref) => (
          <span
            key={ref.path}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-ssoo-content-border bg-ssoo-content-border px-2 py-1 text-[11px] text-ssoo-primary"
            title={ref.path}
          >
            <span className="max-w-[180px] truncate">문서: {ref.title}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAssistantReference(ref.path)}
              className="rounded p-0.5 text-ssoo-primary/70 hover:bg-ssoo-content-border/40 hover:text-ssoo-primary disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`첨부 해제: ${ref.title}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {template ? (
          <span
            key={template.id}
            className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
              isTemplateDeleted
                ? 'border-destructive/30 bg-destructive/5 text-destructive/60 line-through'
                : isTemplateUsed
                  ? 'border-ssoo-content-border bg-ssoo-content-border text-ssoo-primary'
                  : 'border-ssoo-content-border bg-white text-ssoo-primary'
            }`}
            title={template.name}
          >
            <Shapes className="h-3 w-3" />
            <span className="max-w-[180px] truncate">템플릿: {template.name}</span>
            {!isTemplateDeleted && isTemplateUsed && <Check className="h-3 w-3 text-ssoo-primary" />}
            {isTemplateDeleted && onInlineRestoreTemplate ? (
              <button
                type="button"
                onClick={() => onInlineRestoreTemplate()}
                className="rounded p-0.5 transition-colors text-destructive/50 hover:text-ssoo-primary"
                aria-label={`템플릿 되돌리기: ${template.name}`}
                title="되돌리기"
              >
                <Undo2 className="h-3 w-3" />
              </button>
            ) : !isTemplateDeleted ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onInlineRemoveTemplate?.()}
                className="rounded p-0.5 text-ssoo-primary/70 hover:bg-ssoo-content-border/40 hover:text-ssoo-primary disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`템플릿 해제: ${template.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </span>
        ) : null}

        {summaryFiles.map((file) => {
          const isUsed = usedSummaryFileIds?.has(file.id) ?? false;
          const isDeleted = deletedFileIds?.has(file.id) ?? false;
          return (
            <span
              key={file.id}
              className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                isDeleted
                  ? 'border-destructive/30 bg-destructive/5 text-destructive/60 line-through'
                  : isUsed
                    ? 'border-ssoo-content-border bg-ssoo-content-border text-ssoo-primary'
                    : 'border-ssoo-content-border bg-white text-ssoo-primary'
              }`}
              title={file.name}
            >
              <FileUp className="h-3 w-3" />
              <span className="max-w-[180px] truncate">파일: {file.name}</span>
              {!isDeleted && isUsed && <Check className="h-3 w-3 text-ssoo-primary" />}
              {isDeleted && onInlineRestoreSummaryFile ? (
                <button
                  type="button"
                  onClick={() => onInlineRestoreSummaryFile(file.id)}
                  className="rounded p-0.5 transition-colors text-destructive/50 hover:text-ssoo-primary"
                  aria-label={`파일 되돌리기: ${file.name}`}
                  title="되돌리기"
                >
                  <Undo2 className="h-3 w-3" />
                </button>
              ) : !isDeleted ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onInlineRemoveSummaryFile?.(file.id)}
                  className="rounded p-0.5 text-ssoo-primary/70 hover:bg-ssoo-content-border/40 hover:text-ssoo-primary disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`파일 해제: ${file.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </span>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <div className="mt-2 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
          <span className="flex-1">{warnings.join(' ')}</span>
          {hasFailedRestore && onRetryRestore && (
            <button
              type="button"
              disabled={isRetryingRestore}
              onClick={onRetryRestore}
              className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="참조 파일 복원 재시도"
            >
              {isRetryingRestore ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              재시도
            </button>
          )}
        </div>
      )}
    </div>
  );
}
