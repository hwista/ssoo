'use client';

import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { docAssistApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { InlineSummaryFileItem } from '@/components/common/assistant/reference/Picker';
import type { TemplateItem } from '@/types/template';
import type { SourceFileMeta } from '@/types';
import type { RequestLifecycle } from '@/hooks/useRequestLifecycle';
import { resolveTitlePathRecommendation } from '@/lib/utils/titlePathRecommendation';
import { applyGeneratedContent, buildComposedDocument, mapSummaryFiles } from './documentPageUtils';
import type { EditorCommandHandlers, MetadataRecommendationResult } from './documentPageTypes';

interface ComposeEditorHandlers {
  getMarkdown?: EditorCommandHandlers['getMarkdown'];
  getSelection?: EditorCommandHandlers['getSelection'];
  insertAt?: EditorCommandHandlers['insertAt'];
  setPendingInsert?: EditorCommandHandlers['setPendingInsert'];
}

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
}

interface DocumentPageComposeState {
  content: string;
  createPath: string;
  filePath: string | null;
  inlineInstruction: string;
  inlineSummaryFiles: InlineSummaryFileItem[];
  inlineTemplate: TemplateItem | null;
  isComposing: boolean;
  isCreateMode: boolean;
  pendingDeletedFileIds: Set<string>;
  isTemplatePendingDelete: boolean;
}

interface DocumentPageComposeMutators {
  setContent: (content: string) => void;
  setCreatePath: (path: string) => void;
  setInlineInstruction: (value: string) => void;
  setInlineRelevanceWarnings: Dispatch<SetStateAction<string[]>>;
  setInlineTemplate: Dispatch<SetStateAction<TemplateItem | null>>;
  setIsComposing: Dispatch<SetStateAction<boolean>>;
  setIsRecommendingPath: Dispatch<SetStateAction<boolean>>;
}

interface DocumentPageComposeDeps {
  editorHandlers: ComposeEditorHandlers | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  requestLifecycle: RequestLifecycle;
  onSyncReferencesToSidecar?: (files: SourceFileMeta[], rawFiles?: Map<string, File>) => void;
  composeRecommendation?: {
    isCreateMode: boolean;
    autoRecommendMetadata: (
      content: string,
      options?: { signal?: AbortSignal; isRequestActive?: () => boolean },
    ) => Promise<MetadataRecommendationResult | null>;
    applyMetadataRecommendation: (
      recommendation: MetadataRecommendationResult | null,
      mode: 'suggest' | 'auto',
    ) => void;
    consumeTitlePathRecommendation: (
      resolved: ReturnType<typeof resolveTitlePathRecommendation>,
      mode: 'suggest' | 'auto',
    ) => void;
    setCreatePath: (path: string) => void;
    setDisplaySuggestedTitle: (title: string) => void;
    setDisplayCreatePath: (path: string) => void;
    setTitleRecommendationStatus: (status: 'idle' | 'loading' | 'resolved' | 'error') => void;
    setPathRecommendationStatus: (status: 'idle' | 'loading' | 'resolved' | 'error') => void;
  };
}

export function useDocumentPageComposeActions({
  state,
  mutators,
  deps,
}: {
  state: DocumentPageComposeState;
  mutators: DocumentPageComposeMutators;
  deps: DocumentPageComposeDeps;
}) {
  const {
    content,
    createPath,
    filePath,
    inlineInstruction,
    inlineSummaryFiles,
    inlineTemplate,
    isComposing,
    pendingDeletedFileIds,
    isTemplatePendingDelete,
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
  const { editorHandlers, confirm, requestLifecycle, onSyncReferencesToSidecar, composeRecommendation } = deps;
  // Always-fresh reference to editorHandlers (avoids stale closure in streaming callbacks)
  const editorHandlersRef = useRef(editorHandlers);
  editorHandlersRef.current = editorHandlers;

  const handleInlineCompose = useCallback(async (draft?: string) => {
    const instruction = (draft ?? inlineInstruction).trim();
    if (!instruction || isComposing) return;

    const handlers = editorHandlersRef.current;
    const baseContent = handlers?.getMarkdown?.() ?? content;
    const currentSelection = handlers?.getSelection?.() ?? { from: 0, to: 0 };
    const max = baseContent.length;
    const safeFrom = Math.max(0, Math.min(max, currentSelection.from));
    const safeTo = Math.max(0, Math.min(max, currentSelection.to));
    const selection = { from: Math.min(safeFrom, safeTo), to: Math.max(safeFrom, safeTo) };
    const hasSelection = selection.from !== selection.to;
    const selectedText = hasSelection ? baseContent.slice(selection.from, selection.to) : undefined;

    const activeSummaryFiles = inlineSummaryFiles.filter(
      (f) => !pendingDeletedFileIds.has(f.id),
    );
    const activeTemplate = isTemplatePendingDelete ? null : inlineTemplate;
    const usedSummaryFiles = [...activeSummaryFiles];
    const usedTemplate = activeTemplate;

    handlers?.setPendingInsert?.(selection);
    setIsComposing(true);
    const { token, signal } = requestLifecycle.beginRequest();

    let applyMode: string = 'insert';
    let suggestedPath = '';
    let relevanceWarnings: string[] = [];
    let generatedText = '';

    try {
      const completed = await docAssistApi.composeStream(
        {
          instruction,
          currentContent: baseContent,
          selectedText,
          activeDocPath: filePath || createPath,
          templates: activeTemplate ? [activeTemplate] : [],
          summaryFiles: mapSummaryFiles(activeSummaryFiles),
        },
        {
          onMeta: (meta) => {
            if (!requestLifecycle.isRequestActive(token)) return;
            applyMode = meta.applyMode;
            suggestedPath = meta.suggestedPath;
            relevanceWarnings = meta.relevanceWarnings;
          },
          onTextDelta: (delta) => {
            if (!requestLifecycle.isRequestActive(token)) return;
            generatedText += delta;
          },
        },
        { signal },
      );

      if (!completed || !requestLifecycle.isRequestActive(token)) return;

      const generated = generatedText.trim();
      if (!generated && applyMode !== 'replace-document') return;

      if (!requestLifecycle.isRequestActive(token)) return;
      const finalContent = buildComposedDocument({
        applyMode: applyMode as 'replace-document' | 'replace-selection' | 'append' | 'insert',
        baseContent,
        generated,
        selection,
        hasSelection,
      });

      if (composeRecommendation && requestLifecycle.isRequestActive(token)) {
        const isRequestActive = () => requestLifecycle.isRequestActive(token);
        if (composeRecommendation.isCreateMode) {
          composeRecommendation.setTitleRecommendationStatus('loading');
          composeRecommendation.setPathRecommendationStatus('loading');
          const [metadataResult, titlePathResult] = await Promise.allSettled([
            composeRecommendation.autoRecommendMetadata(finalContent, { signal, isRequestActive }),
            docAssistApi.recommendTitleAndPath({ currentContent: finalContent }, { signal }),
          ]);

          if (!isRequestActive() || signal.aborted) return;

          if (metadataResult.status === 'fulfilled') {
            composeRecommendation.applyMetadataRecommendation(metadataResult.value, 'suggest');
          }

          if (titlePathResult.status === 'fulfilled') {
            const res = titlePathResult.value;
            if (res.success && res.data) {
              const resolved = resolveTitlePathRecommendation(res.data, { fallbackContent: finalContent });
              composeRecommendation.consumeTitlePathRecommendation(resolved, 'suggest');
              if (!resolved.path) {
                if (res.data.suggestedFileName) {
                  composeRecommendation.setCreatePath(`drafts/${res.data.suggestedFileName}`);
                } else if (suggestedPath) {
                  composeRecommendation.setCreatePath(suggestedPath);
                }
              }
            } else if (suggestedPath) {
              composeRecommendation.setCreatePath(suggestedPath);
              composeRecommendation.setDisplaySuggestedTitle('');
              composeRecommendation.setDisplayCreatePath('');
              composeRecommendation.setTitleRecommendationStatus('error');
              composeRecommendation.setPathRecommendationStatus('error');
            } else {
              composeRecommendation.setDisplaySuggestedTitle('');
              composeRecommendation.setDisplayCreatePath('');
              composeRecommendation.setTitleRecommendationStatus('error');
              composeRecommendation.setPathRecommendationStatus('error');
            }
          } else if (suggestedPath) {
            composeRecommendation.setCreatePath(suggestedPath);
            composeRecommendation.setDisplaySuggestedTitle('');
            composeRecommendation.setDisplayCreatePath('');
            composeRecommendation.setTitleRecommendationStatus('error');
            composeRecommendation.setPathRecommendationStatus('error');
          } else {
            composeRecommendation.setDisplaySuggestedTitle('');
            composeRecommendation.setDisplayCreatePath('');
            composeRecommendation.setTitleRecommendationStatus('error');
            composeRecommendation.setPathRecommendationStatus('error');
          }
        } else {
          const recommendation = await composeRecommendation.autoRecommendMetadata(finalContent, { signal, isRequestActive });
          if (!isRequestActive() || signal.aborted) return;
          composeRecommendation.applyMetadataRecommendation(recommendation, 'suggest');
        }
      }

      if (!requestLifecycle.isRequestActive(token)) return;

      applyGeneratedContent({
        applyMode: applyMode as 'replace-document' | 'replace-selection' | 'append' | 'insert',
        baseContent,
        generated,
        selection,
        hasSelection,
        editorHandlers: editorHandlersRef.current,
        setContent,
      });

      if (onSyncReferencesToSidecar && requestLifecycle.isRequestActive(token)) {
        const syncFiles: SourceFileMeta[] = [];
        const rawFiles = new Map<string, File>();

        for (const sf of usedSummaryFiles) {
          const tempPath = `__pending__/ref-${sf.id}`;
          syncFiles.push({
            name: sf.name,
            path: tempPath,
            type: sf.type || 'application/octet-stream',
            size: sf.size,
            origin: 'reference',
            status: 'draft',
            provider: 'local',
          });
          const blob = new Blob([sf.textContent], { type: sf.type || 'text/plain' });
          rawFiles.set(tempPath, new File([blob], sf.name, { type: sf.type || 'text/plain' }));
        }

        if (usedTemplate) {
          syncFiles.push({
            name: usedTemplate.name,
            path: usedTemplate.sourcePath || `templates/${usedTemplate.id}`,
            type: 'text/markdown',
            size: 0,
            origin: 'template',
            status: 'published',
            provider: 'local',
          });
        }

        if (syncFiles.length > 0) {
          onSyncReferencesToSidecar(syncFiles, rawFiles);
        }
      }

      if (!requestLifecycle.isRequestActive(token)) return;
      setInlineInstruction('');
      setInlineRelevanceWarnings(relevanceWarnings);
    } catch {
      // Network errors — silently ignored
    } finally {
      editorHandlersRef.current?.setPendingInsert?.(null);
      const shouldFinalize = requestLifecycle.isRequestActive(token);
      requestLifecycle.finalizeRequest(token);
      if (shouldFinalize) {
        setIsComposing(false);
      }
    }
  }, [
    content,
    createPath,
    filePath,
    inlineInstruction,
    inlineSummaryFiles,
    inlineTemplate,
    isComposing,
    isTemplatePendingDelete,
    composeRecommendation,
    onSyncReferencesToSidecar,
    pendingDeletedFileIds,
    requestLifecycle,
    setContent,
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

  const abortCompose = useCallback(() => {
    requestLifecycle.abortActiveRequest();
    editorHandlersRef.current?.setPendingInsert?.(null);
    setIsComposing(false);
    toast.info('AI 작성이 중단되었습니다.');
  }, [requestLifecycle, setIsComposing]);

  return {
    handleInlineCompose,
    handleRecommendPath,
    handleInlineTemplateSelect,
    abortCompose,
  };
}
