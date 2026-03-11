'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { docAssistApi } from '@/lib/api';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/ReferencePicker';
import type { TemplateItem } from '@/types/template';

interface SelectionRange {
  from: number;
  to: number;
}

interface ComposeEditorHandlers {
  getMarkdown?: () => string;
  getSelection?: () => SelectionRange;
  insertAt?: (from: number, to: number, text: string) => void;
  setPendingInsert?: (range: SelectionRange | null) => void;
}

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
}

interface ViewerPageComposeState {
  content: string;
  createPath: string;
  filePath: string | null;
  inlineInstruction: string;
  inlineSummaryFiles: InlineSummaryFileItem[];
  inlineTemplate: TemplateItem | null;
  isComposing: boolean;
  isCreateMode: boolean;
}

interface ViewerPageComposeMutators {
  setContent: (content: string) => void;
  setCreatePath: (path: string) => void;
  setInlineInstruction: (value: string) => void;
  setInlineRelevanceWarnings: Dispatch<SetStateAction<string[]>>;
  setInlineTemplate: Dispatch<SetStateAction<TemplateItem | null>>;
  setIsComposing: Dispatch<SetStateAction<boolean>>;
  setIsRecommendingPath: Dispatch<SetStateAction<boolean>>;
}

interface ViewerPageComposeDeps {
  editorHandlers: ComposeEditorHandlers | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

function mapSummaryFiles(summaryFiles: InlineSummaryFileItem[]) {
  return summaryFiles.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    textContent: item.textContent,
  }));
}

function applyGeneratedContent(params: {
  applyMode: 'replace-document' | 'replace-selection' | 'append' | 'insert';
  baseContent: string;
  generated: string;
  selection: SelectionRange;
  hasSelection: boolean;
  editorHandlers: ComposeEditorHandlers | null;
  setContent: (content: string) => void;
}) {
  const { applyMode, baseContent, generated, selection, hasSelection, editorHandlers, setContent } = params;

  if (applyMode === 'replace-document') {
    setContent(generated);
    return;
  }

  if (applyMode === 'replace-selection' && hasSelection) {
    if (editorHandlers?.insertAt) {
      editorHandlers.insertAt(selection.from, selection.to, generated);
    } else {
      setContent(`${baseContent.slice(0, selection.from)}${generated}${baseContent.slice(selection.to)}`);
    }
    return;
  }

  if (applyMode === 'append') {
    const joiner = baseContent.trim().length > 0 ? '\n\n' : '';
    if (editorHandlers?.insertAt) {
      editorHandlers.insertAt(baseContent.length, baseContent.length, `${joiner}${generated}`);
    } else {
      setContent(`${baseContent}${joiner}${generated}`);
    }
    return;
  }

  if (editorHandlers?.insertAt) {
    editorHandlers.insertAt(selection.from, selection.from, generated);
  } else {
    setContent(`${baseContent.slice(0, selection.from)}${generated}${baseContent.slice(selection.from)}`);
  }
}

export function useViewerPageComposeActions({
  state,
  mutators,
  deps,
}: {
  state: ViewerPageComposeState;
  mutators: ViewerPageComposeMutators;
  deps: ViewerPageComposeDeps;
}) {
  const {
    content,
    createPath,
    filePath,
    inlineInstruction,
    inlineSummaryFiles,
    inlineTemplate,
    isComposing,
    isCreateMode,
  } = state;
  const {
    setContent,
    setCreatePath,
    setInlineInstruction,
    setInlineRelevanceWarnings,
    setInlineTemplate,
    setIsComposing,
    setIsRecommendingPath,
  } = mutators;
  const { editorHandlers, confirm } = deps;

  const handleInlineCompose = useCallback(async (draft?: string) => {
    const instruction = (draft ?? inlineInstruction).trim();
    if (!instruction || isComposing) return;

    const baseContent = editorHandlers?.getMarkdown?.() ?? content;
    const currentSelection = editorHandlers?.getSelection?.() ?? { from: 0, to: 0 };
    const max = baseContent.length;
    const safeFrom = Math.max(0, Math.min(max, currentSelection.from));
    const safeTo = Math.max(0, Math.min(max, currentSelection.to));
    const selection = { from: Math.min(safeFrom, safeTo), to: Math.max(safeFrom, safeTo) };
    const hasSelection = selection.from !== selection.to;
    const selectedText = hasSelection ? baseContent.slice(selection.from, selection.to) : undefined;

    editorHandlers?.setPendingInsert?.(selection);
    setIsComposing(true);
    try {
      const response = await docAssistApi.compose({
        instruction,
        currentContent: baseContent,
        selectedText,
        activeDocPath: filePath || createPath,
        templates: inlineTemplate ? [inlineTemplate] : [],
        summaryFiles: mapSummaryFiles(inlineSummaryFiles),
      });

      if (!response.success || !response.data) return;
      const generated = typeof response.data.text === 'string' ? response.data.text.trim() : '';
      if (!generated && response.data.applyMode !== 'replace-document') return;

      applyGeneratedContent({
        applyMode: response.data.applyMode,
        baseContent,
        generated,
        selection,
        hasSelection,
        editorHandlers,
        setContent,
      });

      setInlineInstruction('');
      setInlineRelevanceWarnings(response.data.relevanceWarnings ?? []);
      if (isCreateMode && response.data.suggestedPath) {
        setCreatePath(response.data.suggestedPath);
      }
    } finally {
      editorHandlers?.setPendingInsert?.(null);
      setIsComposing(false);
    }
  }, [
    content,
    createPath,
    editorHandlers,
    filePath,
    inlineInstruction,
    inlineSummaryFiles,
    inlineTemplate,
    isComposing,
    isCreateMode,
    setContent,
    setCreatePath,
    setInlineInstruction,
    setInlineRelevanceWarnings,
    setIsComposing,
  ]);

  const handleRecommendPath = useCallback(async () => {
    const instruction = inlineInstruction.trim() || '새 문서 작성';
    setIsRecommendingPath(true);
    try {
      const response = await docAssistApi.recommendPath({
        instruction,
        activeDocPath: createPath,
        summaryFiles: mapSummaryFiles(inlineSummaryFiles),
      });
      if (!response.success || !response.data) return;
      setCreatePath(response.data.suggestedPath || createPath);
      setInlineRelevanceWarnings(response.data.relevanceWarnings ?? []);
    } finally {
      setIsRecommendingPath(false);
    }
  }, [
    createPath,
    inlineInstruction,
    inlineSummaryFiles,
    setCreatePath,
    setInlineRelevanceWarnings,
    setIsRecommendingPath,
  ]);

  const handleInlineTemplateSelect = useCallback(async (template: TemplateItem) => {
    if (template.kind !== 'document') return;

    if (!inlineTemplate) {
      setInlineTemplate(template);
      return;
    }

    if (inlineTemplate.id === template.id) {
      setInlineTemplate(null);
      return;
    }

    const confirmed = await confirm({
      title: '문서 템플릿 변경',
      description: `'${inlineTemplate.name}' 템플릿이 이미 선택되어 있습니다. 새 템플릿으로 바꾸면 이후 AI 작성은 '${template.name}' 형식에 맞춰 생성됩니다. 변경하시겠습니까?`,
      confirmText: '교체',
      cancelText: '유지',
    });

    if (!confirmed) return;
    setInlineTemplate(template);
  }, [confirm, inlineTemplate, setInlineTemplate]);

  return {
    handleInlineCompose,
    handleRecommendPath,
    handleInlineTemplateSelect,
  };
}
