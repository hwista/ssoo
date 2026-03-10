'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Loader2, Wand2, Eye, EyeOff } from 'lucide-react';
import { useTabStore, useEditorStore, useConfirmStore, useFileStore, useAssistantStore } from '@/stores';
import { useCurrentTabId } from '@/contexts/TabInstanceContext';
import { fileApi, docAssistApi } from '@/lib/api';
import { DocPageTemplate } from '@/components/templates';
import { Viewer } from '@/components/common/viewer';
import {
  DOC_PAGE_SURFACE_PRESETS,
  PAGE_BACKGROUND_PRESETS,
  SectionedShell,
} from '@/components/common/page';
import { Editor } from '@/components/common/editor';
import { EditorToolbar } from '@/components/common/editor';
import type { EditorRef } from '@/components/common/editor';
import { type TocItem } from '@/components/common/page';
import { markdownToHtmlSync } from '@/lib/utils/markdown';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import type { DocumentMetadata } from '@/types';
import { ErrorState, LoadingState } from '@/components/common/StateDisplay';
import {
  type InlineSummaryFileItem,
} from '@/components/common/assistant/ReferencePicker';
import { AssistantComposer } from '@/components/common/assistant/Composer';
import type { TemplateItem } from '@/types/template';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DocumentSidecar } from './_components/DocumentSidecar';

type PageMode = 'viewer' | 'editor' | 'create';

interface TemplateSaveDraft {
  name: string;
  description: string;
  scope: 'personal' | 'global';
}

export function ViewerPage() {
  const tabId = useCurrentTabId();
  const { tabs, closeTab, updateTab } = useTabStore();
  const { confirm } = useConfirmStore();
  const { refreshFileTree } = useFileStore();
  const openAssistantPanel = useAssistantStore((state) => state.openPanel);
  const toggleAssistantReference = useAssistantStore((state) => state.toggleReference);
  const attachedReferences = useAssistantStore((state) => state.attachedReferences);

  const {
    loadFile,
    isLoading,
    error,
    content,
    isEditing,
    setIsEditing,
    fileMetadata,
    documentMetadata,
    setLocalDocumentMetadata,
    setContent,
    reset,
    isSaving,
    editorHandlers,
    removeTabEditor,
  } = useEditorStore();

  const [mode, setMode] = useState<PageMode>('viewer');
  const [inlineInstruction, setInlineInstruction] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [createPath, setCreatePath] = useState('drafts/new-doc.md');
  const [isRecommendingPath, setIsRecommendingPath] = useState(false);
  const [inlineTemplate, setInlineTemplate] = useState<TemplateItem | null>(null);
  const [inlineSummaryFiles, setInlineSummaryFiles] = useState<InlineSummaryFileItem[]>([]);
  const [inlineRelevanceWarnings, setInlineRelevanceWarnings] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [saveAsTemplateOnly, setSaveAsTemplateOnly] = useState(false);
  const [templateSaveDraft, setTemplateSaveDraft] = useState<TemplateSaveDraft>({
    name: '',
    description: '',
    scope: 'personal',
  });
  const editorRef = useRef<EditorRef | null>(null);

  useEffect(() => {
    return () => {
      removeTabEditor();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== 'create') {
      setMode(isEditing ? 'editor' : 'viewer');
    }
  }, [isEditing, mode]);

  useEffect(() => {
    if (mode === 'viewer') {
      setIsPreview(false);
      setSaveAsTemplateOnly(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!tabId) return;
    updateTab(tabId, { isEditing: mode === 'editor' || mode === 'create' });
  }, [mode, tabId, updateTab]);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabs, tabId]);

  const isCreateMode = useMemo(() => activeTab?.path === '/wiki/new', [activeTab?.path]);

  const filePath = useMemo(() => {
    if (!activeTab?.path) return null;
    if (activeTab.path === '/wiki/new') return null;
    const path = activeTab.path.replace(/^\/doc\//, '');
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }, [activeTab?.path]);

  useEffect(() => {
    if (isCreateMode) {
      reset();
      setContent('');
      setMode('create');
      setIsEditing(true);
      setCreatePath('drafts/new-doc.md');
    }
  }, [isCreateMode, reset, setContent, setIsEditing]);

  useEffect(() => {
    if (filePath && !isCreateMode) {
      loadFile(filePath);
      setMode('viewer');
      setIsEditing(false);
      setCreatePath(filePath);
    }
  }, [filePath, isCreateMode, loadFile, setIsEditing]);

  const htmlContent = useMemo(() => {
    if (!content) return '';
    return markdownToHtmlSync(content);
  }, [content]);

  const toc = useMemo((): TocItem[] => {
    if (!content) return [];

    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items: TocItem[] = [];
    let match;
    let index = 0;

    while ((match = headingRegex.exec(content)) !== null) {
      items.push({
        id: `heading-${index++}`,
        level: match[1].length,
        text: match[2].trim(),
      });
    }

    return items;
  }, [content]);

  const metadata = useMemo(() => {
    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
    return {
      author: documentMetadata?.author || 'Unknown',
      createdAt: fileMetadata.createdAt || undefined,
      updatedAt: fileMetadata.modifiedAt || undefined,
      lineCount: content ? content.split('\n').length : 0,
      charCount: content ? content.length : 0,
      wordCount,
      attachments: documentMetadata?.sourceFiles || [],
    };
  }, [content, documentMetadata, fileMetadata]);

  useEffect(() => {
    if (templateSaveDraft.name.trim().length > 0) return;

    const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const fallbackPath = filePath || createPath;
    const fallbackName = fallbackPath.split('/').pop()?.replace(/\.md$/i, '').trim() || '새 템플릿';
    const nextName = heading || fallbackName;
    setTemplateSaveDraft((prev) => (
      prev.name.trim().length > 0 || prev.name === nextName
        ? prev
        : { ...prev, name: nextName }
    ));
  }, [content, createPath, filePath, templateSaveDraft.name]);

  const tags = useMemo(() => documentMetadata?.tags || [], [documentMetadata]);

  const handleEdit = useCallback(() => {
    setMode('editor');
    setIsEditing(true);
  }, [setIsEditing]);

  const handleDelete = useCallback(async () => {
    if (!filePath || !tabId) return;

    const confirmed = await confirm({
      title: '문서 삭제',
      description: `'${filePath}'를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
    });

    if (!confirmed) return;

    try {
      const result = await fileApi.delete(filePath);
      if (result.success) {
        reset();
        closeTab(tabId);
        await refreshFileTree();
      }
    } catch (err) {
      console.error('파일 삭제 실패:', err);
    }
  }, [filePath, tabId, confirm, reset, closeTab, refreshFileTree]);

  const handleSearch = useCallback(() => {
    // TODO: 문서 내 검색 하이라이트
  }, []);

  const handleAttachCurrentDocToAssistant = useCallback(() => {
    if (!filePath) return;
    const alreadyAttached = attachedReferences.some((item) => item.path === filePath);
    if (!alreadyAttached) {
      const title = filePath.split('/').pop() || filePath;
      toggleAssistantReference({ path: filePath, title });
    }
    openAssistantPanel();
    window.dispatchEvent(new Event(ASSISTANT_FOCUS_INPUT_EVENT));
  }, [attachedReferences, filePath, openAssistantPanel, toggleAssistantReference]);

  const handleTocClick = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handlePathClick = useCallback(() => {
    // TODO: 해당 폴더로 트리 이동
  }, []);

  const handleHistory = useCallback(() => {
    // TODO: 깃 히스토리 뷰어 연동
  }, []);

  const handleSave = useCallback(() => {
    editorHandlers?.save();
  }, [editorHandlers]);

  const handleCancel = useCallback(() => {
    if (editorHandlers) {
      editorHandlers.cancel();
    } else {
      setMode('viewer');
      setIsEditing(false);
    }
  }, [editorHandlers, setIsEditing]);

  const handleMetadataChange = useCallback((update: Partial<DocumentMetadata>) => {
    setLocalDocumentMetadata(update);
  }, [setLocalDocumentMetadata]);

  const handleRetry = useCallback(() => {
    if (filePath) loadFile(filePath);
  }, [filePath, loadFile]);

  const handleInlineCompose = useCallback(async (draft?: string) => {
    const instruction = (draft ?? inlineInstruction).trim();
    if (!instruction || isComposing) return;

    const baseContent = content;
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
        summaryFiles: inlineSummaryFiles.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          textContent: item.textContent,
        })),
      });

      if (!response.success || !response.data) return;
      const generated = typeof response.data.text === 'string' ? response.data.text.trim() : '';
      if (!generated && response.data.applyMode !== 'replace-document') return;

      if (response.data.applyMode === 'replace-document') {
        setContent(generated);
      } else if (response.data.applyMode === 'replace-selection' && hasSelection) {
        if (editorHandlers?.insertAt) {
          editorHandlers.insertAt(selection.from, selection.to, generated);
        } else {
          setContent(`${baseContent.slice(0, selection.from)}${generated}${baseContent.slice(selection.to)}`);
        }
      } else if (response.data.applyMode === 'append') {
        const joiner = baseContent.trim().length > 0 ? '\n\n' : '';
        if (editorHandlers?.insertAt) {
          editorHandlers.insertAt(baseContent.length, baseContent.length, `${joiner}${generated}`);
        } else {
          setContent(`${baseContent}${joiner}${generated}`);
        }
      } else {
        if (editorHandlers?.insertAt) {
          editorHandlers.insertAt(selection.from, selection.from, generated);
        } else {
          setContent(`${baseContent.slice(0, selection.from)}${generated}${baseContent.slice(selection.from)}`);
        }
      }
      setInlineInstruction('');
      setInlineRelevanceWarnings(response.data.relevanceWarnings ?? []);
      if (isCreateMode && response.data.suggestedPath) {
        setCreatePath(response.data.suggestedPath);
      }
    } finally {
      editorHandlers?.setPendingInsert?.(null);
      setIsComposing(false);
    }
  }, [content, createPath, editorHandlers, filePath, inlineInstruction, inlineSummaryFiles, inlineTemplate, isComposing, isCreateMode, setContent]);

  const handleRecommendPath = useCallback(async () => {
    const instruction = inlineInstruction.trim() || '새 문서 작성';
    setIsRecommendingPath(true);
    try {
      const response = await docAssistApi.recommendPath({
        instruction,
        activeDocPath: createPath,
        summaryFiles: inlineSummaryFiles.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          textContent: item.textContent,
        })),
      });
      if (!response.success || !response.data) return;
      setCreatePath(response.data.suggestedPath || createPath);
      setInlineRelevanceWarnings(response.data.relevanceWarnings ?? []);
    } finally {
      setIsRecommendingPath(false);
    }
  }, [createPath, inlineInstruction, inlineSummaryFiles]);

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
  }, [confirm, inlineTemplate]);

  const isEditorMode = mode === 'editor' || mode === 'create';

  const inlineComposer = isEditorMode ? (
    <AssistantComposer
      inputDraft={inlineInstruction}
      isProcessing={isComposing}
      setInputDraft={setInlineInstruction}
      submitUserMessage={async (text) => {
        await handleInlineCompose(text);
      }}
      placeholder="AI와 함께 문서를 작성하세요. 선택한 텍스트 영역이 있으면 치환하고 없으면 커서 위치에 삽입됩니다."
      submitVariant="text"
      submitLabel="적용"
      mode="inline"
      inlineContext={{
        selectedTemplate: inlineTemplate,
        summaryFiles: inlineSummaryFiles,
        onSelectTemplate: handleInlineTemplateSelect,
        onUpsertSummaryFiles: (files) => {
          setInlineSummaryFiles((prev) => {
            const map = new Map(prev.map((item) => [item.id, item]));
            for (const file of files) map.set(file.id, file);
            return Array.from(map.values());
          });
        },
      }}
      inlineTemplate={inlineTemplate}
      inlineSummaryFiles={inlineSummaryFiles}
      inlineWarnings={inlineRelevanceWarnings}
      onInlineClearAll={() => {
        setInlineTemplate(null);
        setInlineSummaryFiles([]);
        setInlineRelevanceWarnings([]);
      }}
      onInlineRemoveTemplate={() => {
        setInlineTemplate(null);
      }}
      onInlineRemoveSummaryFile={(id) => {
        setInlineSummaryFiles((prev) => prev.filter((item) => item.id !== id));
      }}
    />
  ) : null;

  const contentBody = useMemo(() => {
    if (error) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <ErrorState error={error} onRetry={handleRetry} />
        </div>
      );
    }

    if (isLoading && !isCreateMode) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <LoadingState message="문서를 불러오는 중..." />
        </div>
      );
    }

    return mode === 'viewer' ? (
      <Viewer
        content={htmlContent}
        toc={toc}
        onTocClick={handleTocClick}
        onSearch={handleSearch}
        onAttachToAssistant={handleAttachCurrentDocToAssistant}
        variant="embedded"
      />
    ) : (
      <Editor
        ref={editorRef}
        className="h-full min-h-0"
        variant="embedded"
        showToolbar={false}
        preferredCreatePath={isCreateMode ? createPath : undefined}
        onCreatePathResolved={setCreatePath}
        isPreview={isPreview}
        isPendingInsertLoading={isComposing}
        templateSaveEnabled={saveAsTemplateOnly}
        templateSaveDraft={templateSaveDraft}
        onTemplateSaved={() => {
          setSaveAsTemplateOnly(false);
        }}
      />
    );
  }, [
    createPath,
    error,
    handleRetry,
    htmlContent,
    isCreateMode,
    isLoading,
    isComposing,
    isPreview,
    mode,
    saveAsTemplateOnly,
    toc,
    templateSaveDraft,
    handleTocClick,
    handleSearch,
    handleAttachCurrentDocToAssistant,
  ]);

  const contentSurfaceClassName = DOC_PAGE_SURFACE_PRESETS.document;
  const headerEditorInlineSlot = (mode === 'editor' || mode === 'create') ? (
    <div className="ml-2 flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={saveAsTemplateOnly}
        onClick={() => setSaveAsTemplateOnly((prev) => !prev)}
        className={cn(
          'inline-flex h-control-h items-center gap-2 px-1 text-xs font-medium text-ssoo-primary transition-colors'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
            saveAsTemplateOnly ? 'bg-ssoo-primary' : 'bg-ssoo-content-border'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              saveAsTemplateOnly ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </span>
        <span>템플릿으로 저장</span>
      </button>
      {mode === 'create' ? (
        <>
          <input
            value={createPath}
            onChange={(event) => setCreatePath(event.target.value)}
            placeholder="생성 경로 (예: design/order/request.md)"
            disabled={saveAsTemplateOnly}
            className="h-control-h w-[420px] max-w-[42vw] rounded-md border border-ssoo-content-border bg-white px-3 text-sm text-ssoo-primary placeholder:text-ssoo-primary/45 focus:outline-none focus:ring-1 focus:ring-ssoo-primary disabled:cursor-not-allowed disabled:bg-ssoo-content-bg/40 disabled:text-ssoo-primary/45"
          />
          <button
            type="button"
            onClick={() => {
              void handleRecommendPath();
            }}
            disabled={isRecommendingPath || saveAsTemplateOnly}
            className="inline-flex h-control-h items-center gap-1 rounded-md border border-ssoo-content-border bg-white px-3 text-xs font-medium text-ssoo-primary hover:border-ssoo-primary/40 disabled:opacity-60"
          >
            {isRecommendingPath ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            경로 추천
          </button>
        </>
      ) : null}
    </div>
  ) : undefined;

  const headerEditorPreviewSlot = (mode === 'editor' || mode === 'create') ? (
    <Button
      variant="ghost"
      size="default"
      onClick={() => setIsPreview((prev) => !prev)}
      className="h-control-h"
    >
      {isPreview ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
      {isPreview ? '원본보기' : '미리보기'}
    </Button>
  ) : undefined;

  if (!filePath && !isCreateMode) {
    return (
      <main className="h-full flex items-center justify-center bg-ssoo-content-bg/30">
        <p className="text-ssoo-primary/70">사이드바에서 파일을 선택해주세요.</p>
      </main>
    );
  }

  return (
    <main
      className={cn(
        'h-full overflow-hidden',
        isEditorMode ? PAGE_BACKGROUND_PRESETS.documentEditor : PAGE_BACKGROUND_PRESETS.documentViewer
      )}
    >
      <DocPageTemplate
        filePath={filePath || '새 문서.md'}
        mode={mode === 'create' ? 'editor' : mode}
        breadcrumbRootIconVariant={isCreateMode ? 'editor' : 'folder'}
        contentOrientation="portrait"
        contentSurfaceClassName={contentSurfaceClassName}
        sidecarContent={(
          <DocumentSidecar
            metadata={metadata}
            tags={tags}
            editable={mode === 'editor' || mode === 'create'}
            documentMetadata={documentMetadata}
            onMetadataChange={handleMetadataChange}
            filePath={filePath || '새 문서.md'}
            templateSaveEnabled={saveAsTemplateOnly}
            templateDraft={templateSaveDraft}
            onTemplateDraftChange={(update) => {
              setTemplateSaveDraft((prev) => ({ ...prev, ...update }));
            }}
          />
        )}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onHistory={handleHistory}
        onDelete={isCreateMode ? undefined : handleDelete}
        onPathClick={handlePathClick}
        saving={isSaving}
        headerEditorInlineSlot={headerEditorInlineSlot}
        headerEditorPreviewSlot={headerEditorPreviewSlot}
      >
        {isEditorMode ? (
          <SectionedShell
            variant="editor_with_footer"
            toolbar={(
              <EditorToolbar
                disabled={isPreview}
                onCommand={(id) => editorRef.current?.applyCommand(id)}
              />
            )}
            body={(
              <div className="h-full min-h-0 overflow-hidden">
                {contentBody}
              </div>
            )}
            footer={inlineComposer}
          />
        ) : (
          contentBody
        )}
      </DocPageTemplate>
    </main>
  );
}

export default ViewerPage;
