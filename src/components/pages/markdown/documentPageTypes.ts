import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TemplateItem } from '@/types/template';

export type PageMode = 'viewer' | 'editor' | 'create';
export type EditorSurfaceMode = 'edit' | 'preview' | 'diff';
export type DiffTarget = 'content' | 'metadata';
export type RecommendationStatus = 'idle' | 'loading' | 'resolved' | 'error';
export type CreateEntryType = 'launcher' | 'doc' | 'template' | 'ai-summary' | null;
export type ComposeApplyMode = 'replace-document' | 'replace-selection' | 'append' | 'insert';

export interface TemplateSaveDraft {
  name: string;
  description: string;
  scope: 'personal' | 'global';
}

export interface MetadataRecommendationResult {
  suggestedTags: string[];
  summaryText: string | null;
}

export interface FailedRestoreFile {
  id: string;
  name: string;
  path: string;
}

export interface SelectionRange {
  from: number;
  to: number;
}

export interface EditorCommandHandlers {
  getMarkdown?: () => string;
  getSelection?: () => SelectionRange;
  insertAt?: (from: number, to: number, text: string) => void;
  setPendingInsert?: (range: SelectionRange | null) => void;
}

export interface DocumentPageReferenceState {
  inlineTemplate: TemplateItem | null;
  setInlineTemplate: Dispatch<SetStateAction<TemplateItem | null>>;
  inlineSummaryFiles: InlineSummaryFileItem[];
  setInlineSummaryFiles: Dispatch<SetStateAction<InlineSummaryFileItem[]>>;
  inlineRelevanceWarnings: string[];
  setInlineRelevanceWarnings: Dispatch<SetStateAction<string[]>>;
  usedSummaryFileIds: Set<string>;
  setUsedSummaryFileIds: Dispatch<SetStateAction<Set<string>>>;
  isTemplateUsed: boolean;
  setIsTemplateUsed: Dispatch<SetStateAction<boolean>>;
  isRestoringReferences: boolean;
  setIsRestoringReferences: Dispatch<SetStateAction<boolean>>;
  pendingDeletedFileIds: Set<string>;
  setPendingDeletedFileIds: Dispatch<SetStateAction<Set<string>>>;
  isTemplatePendingDelete: boolean;
  setIsTemplatePendingDelete: Dispatch<SetStateAction<boolean>>;
  failedRestoreFiles: FailedRestoreFile[];
  setFailedRestoreFiles: Dispatch<SetStateAction<FailedRestoreFile[]>>;
  isRetryingRestore: boolean;
  setIsRetryingRestore: Dispatch<SetStateAction<boolean>>;
  pendingAttachmentsRef: RefObject<Map<string, File>>;
}
