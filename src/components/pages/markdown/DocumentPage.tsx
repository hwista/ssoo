'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  useTabStore,
  useEditorStore,
  useConfirmStore,
  useFileStore,
  useAssistantContextStore,
  useAssistantPanelStore,
  useNewDocStore,
} from '@/stores';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import { fileApi, templateApi, docAssistApi } from '@/lib/api';
import { PageTemplate } from '@/components/templates';
import {
  DOC_PAGE_SURFACE_PRESETS,
  PAGE_BACKGROUND_PRESETS,
  SectionedShell,
} from '@/components/templates/page-frame';
import { EditorToolbar } from './_components/editor';
import type { EditorRef } from './_components/editor';
import { type TocItem } from '@/components/templates/page-frame';
import { markdownToHtmlSync } from '@/lib/utils/markdown';
import { generateUniqueFilename } from '@/lib/utils';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import type { DocumentMetadata } from '@/types';
import {
  type InlineSummaryFileItem,
} from '@/components/common/assistant/reference/Picker';
import type { TemplateItem } from '@/types/template';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/common/StateDisplay';
import { DocumentSidecar } from './_components/DocumentSidecar';
import { PreviewToggleButton, TemplateSaveControls } from './_components/EditorModeControls';
import { InlineComposerPanel, DocumentPageContent } from './_components/DocumentPagePanels';
import { NewDocumentLauncher } from './_components/NewDocumentLauncher';
import { useDocumentPageComposeActions } from './useDocumentPageComposeActions';
import {
  buildDocumentSidecarMetadata,
  buildMarkdownToc,
  deriveDefaultTemplateName,
  getDocumentFilePath,
} from './documentPageUtils';

type PageMode = 'viewer' | 'editor' | 'create';

interface TemplateSaveDraft {
  name: string;
  description: string;
  scope: 'personal' | 'global';
}

export function DocumentPage() {
  const tabId = useTabInstanceId();
  const { tabs, closeTab, updateTab } = useTabStore();
  const { confirm } = useConfirmStore();
  const { refreshFileTree } = useFileStore();
  const openAssistantPanel = useAssistantPanelStore((state) => state.openPanel);
  const toggleAssistantReference = useAssistantContextStore((state) => state.toggleReference);
  const attachedReferences = useAssistantContextStore((state) => state.attachedReferences);

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
    hasUnsavedChanges,
    setHasUnsavedChanges,
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

  // 새 문서용 자동 생성 파일명 (세션당 1회 생성)
  const [generatedFileName] = useState(() => generateUniqueFilename());

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

  const createEntryType = useMemo<'launcher' | 'wiki' | 'template' | 'ai-summary' | null>(() => {
    const path = activeTab?.path;
    if (path === '/wiki/new') return 'launcher';
    if (path === '/wiki/new-wiki') return 'wiki';
    if (path === '/wiki/new-template') return 'template';
    if (path === '/wiki/new-ai-summary') return 'ai-summary';
    return null;
  }, [activeTab?.path]);

  const isCreateMode = createEntryType !== null && createEntryType !== 'launcher';

  const filePath = useMemo(() => getDocumentFilePath(activeTab?.path), [activeTab?.path]);

  const consumeAiSummaryPending = useNewDocStore((s) => s.consumeAiSummaryPending);
  const aiSummaryConsumedRef = useRef(false);
  const aiSummaryCompletedRef = useRef(false);

  useEffect(() => {
    if (!createEntryType || createEntryType === 'launcher') return;

    reset();
    setContent('');
    setMode('create');
    setIsEditing(true);
    setCreatePath('drafts/new-doc.md');

    if (createEntryType === 'template') {
      setSaveAsTemplateOnly(true);
    } else {
      setSaveAsTemplateOnly(false);
    }

    aiSummaryConsumedRef.current = false;
    aiSummaryCompletedRef.current = false;
  }, [createEntryType, reset, setContent, setIsEditing]);

  useEffect(() => {
    if (filePath && !isCreateMode) {
      loadFile(filePath);
      setMode('viewer');
      setIsEditing(false);
      setCreatePath(filePath);
    }
  }, [filePath, isCreateMode, loadFile, setIsEditing]);

  // AI 요약 자동 실행: 진입 시 pending 파일을 소비하고 본문 기반으로 compose 호출
  useEffect(() => {
    if (createEntryType !== 'ai-summary' || aiSummaryConsumedRef.current) return;
    aiSummaryConsumedRef.current = true;

    const runAiSummary = async () => {
      const pending = consumeAiSummaryPending();
      if (!pending || pending.summaryFiles.length === 0) return;

      setInlineSummaryFiles(pending.summaryFiles);
      setIsComposing(true);

      try {
        const fileNames = pending.summaryFiles.map((f) => f.name).join(', ');
        const instruction = `다음 파일의 본문 내용을 면밀히 파악한 뒤, 본문 내용에 맞게 문단을 구성하고 요약해주세요: ${fileNames}`;
        const summaryFilesPayload = pending.summaryFiles.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          textContent: item.textContent,
        }));

        const response = await docAssistApi.compose({
          instruction,
          currentContent: '',
          templates: [],
          summaryFiles: summaryFilesPayload,
        });

        if (response.success && response.data) {
          const generated = typeof response.data.text === 'string' ? response.data.text.trim() : '';
          if (generated) {
            setContent(generated);
            aiSummaryCompletedRef.current = true;
          }
          if (response.data.suggestedPath) {
            setCreatePath(response.data.suggestedPath);
          }
          setInlineRelevanceWarnings([]);
        }
      } finally {
        setIsComposing(false);
      }
    };

    void runAiSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createEntryType]);

  // AI 요약 완료 후 에디터 마운트 → dirty 표시
  // Editor.resetContent가 먼저 실행된 뒤 다음 프레임에서 dirty 플래그 설정
  useEffect(() => {
    if (!aiSummaryCompletedRef.current || isComposing) return;
    aiSummaryCompletedRef.current = false;

    const frameId = requestAnimationFrame(() => {
      setHasUnsavedChanges(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [isComposing, setHasUnsavedChanges]);

  // 문서명이 있으면 탭 제목을 문서명으로 업데이트 (사이드바와 동일 패턴)
  useEffect(() => {
    if (!tabId) return;
    const docTitle = documentMetadata?.title?.trim();
    const fileName = filePath?.split('/').pop() || '';
    const displayTitle = docTitle || fileName;
    if (displayTitle) {
      updateTab(tabId, { title: displayTitle });
    }
  }, [tabId, documentMetadata?.title, filePath, updateTab]);

  const htmlContent = useMemo(() => {
    if (!content) return '';
    return markdownToHtmlSync(content);
  }, [content]);

  const toc = useMemo((): TocItem[] => buildMarkdownToc(content), [content]);

  const metadata = useMemo(
    () => buildDocumentSidecarMetadata(content, documentMetadata, fileMetadata),
    [content, documentMetadata, fileMetadata]
  );

  useEffect(() => {
    if (templateSaveDraft.name.trim().length > 0) return;

    const fallbackPath = filePath || createPath;
    const nextName = deriveDefaultTemplateName(content, fallbackPath);
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
    setHasUnsavedChanges(true);
  }, [setLocalDocumentMetadata, setHasUnsavedChanges]);

  const handleFileMove = useCallback(async (newPath: string) => {
    if (!filePath || !tabId || newPath === filePath) return;
    try {
      const result = await fileApi.rename(filePath, newPath);
      if (result.success) {
        const encodedPath = `/doc/${encodeURIComponent(newPath)}`;
        const title = newPath.split('/').pop() || newPath;
        updateTab(tabId, { path: encodedPath, title });
        await refreshFileTree();
      }
    } catch (err) {
      console.error('파일 이동 실패:', err);
    }
  }, [filePath, tabId, updateTab, refreshFileTree]);

  const handleRetry = useCallback(() => {
    if (filePath) loadFile(filePath);
  }, [filePath, loadFile]);

  const {
    handleInlineCompose,
    handleRecommendPath,
    handleInlineTemplateSelect,
  } = useDocumentPageComposeActions({
    state: {
      content,
      createPath,
      filePath,
      inlineInstruction,
      inlineSummaryFiles,
      inlineTemplate,
      isComposing,
      isCreateMode,
    },
    mutators: {
      setContent,
      setCreatePath,
      setInlineInstruction,
      setInlineRelevanceWarnings,
      setInlineTemplate,
      setIsComposing,
      setIsRecommendingPath,
    },
    deps: {
      editorHandlers,
      confirm,
    },
  });

  const isEditorMode = mode === 'editor' || mode === 'create';

  const contentSurfaceClassName = DOC_PAGE_SURFACE_PRESETS.document;
  const headerEditorRightSlot = (
    <TemplateSaveControls
      mode={mode}
      saveAsTemplateOnly={saveAsTemplateOnly}
      setSaveAsTemplateOnly={setSaveAsTemplateOnly}
    />
  );

  const headerEditorPreviewSlot = (
    <PreviewToggleButton
      mode={mode}
      isPreview={isPreview}
      onToggle={() => setIsPreview((prev) => !prev)}
    />
  );

  const setAiSummaryPending = useNewDocStore((s) => s.setAiSummaryPending);

  const handleLauncherWiki = useCallback(() => {
    if (!tabId) return;
    updateTab(tabId, { path: '/wiki/new-wiki', title: '새 문서' });
  }, [tabId, updateTab]);

  const handleLauncherTemplate = useCallback(() => {
    if (!tabId) return;
    updateTab(tabId, { path: '/wiki/new-template', title: '새 템플릿' });
  }, [tabId, updateTab]);

  const handleLauncherAiSummary = useCallback((files: InlineSummaryFileItem[]) => {
    if (!tabId || files.length === 0) return;
    setAiSummaryPending({ summaryFiles: files });
    updateTab(tabId, { path: '/wiki/new-ai-summary', title: 'AI 요약' });
  }, [tabId, updateTab, setAiSummaryPending]);

  const handleLauncherClose = useCallback(() => {
    if (!tabId) return;
    closeTab(tabId);
  }, [tabId, closeTab]);

  // 런처 페이지: /wiki/new
  if (createEntryType === 'launcher') {
    return (
      <NewDocumentLauncher
        onSelectWiki={handleLauncherWiki}
        onSelectTemplate={handleLauncherTemplate}
        onSelectAiSummary={handleLauncherAiSummary}
        onClose={handleLauncherClose}
      />
    );
  }

  if (createEntryType === 'ai-summary' && isComposing) {
    return (
      <main className="h-full flex items-center justify-center bg-ssoo-content-bg/30">
        <LoadingState message="AI가 문서를 요약하는 중..." />
      </main>
    );
  }

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
      <PageTemplate
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
            onFileMove={handleFileMove}
            generatedFileName={isCreateMode ? generatedFileName : undefined}
            isNewDocument={isCreateMode}
            filePath={isCreateMode ? '' : (filePath || '새 문서.md')}
            templateSaveEnabled={saveAsTemplateOnly}
            templateDraft={templateSaveDraft}
            onTemplateDraftChange={(update) => {
              setTemplateSaveDraft((prev) => ({ ...prev, ...update }));
            }}
            getEditorContent={() => editorRef.current?.getMarkdown() ?? ''}
          />
        )}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={isCreateMode ? undefined : handleDelete}
        saving={isSaving}
        isPreview={isPreview}
        headerEditorRightSlot={headerEditorRightSlot}
        headerEditorPreviewSlot={headerEditorPreviewSlot}
      >
        {(() => {
          const contentBody = (
            <DocumentPageContent
              error={error}
              handleRetry={handleRetry}
              isLoading={isLoading}
              isCreateMode={isCreateMode}
              mode={mode}
              htmlContent={htmlContent}
              toc={toc}
              handleTocClick={handleTocClick}
              handleSearch={handleSearch}
              handleAttachCurrentDocToAssistant={handleAttachCurrentDocToAssistant}
              editorRef={editorRef}
              createPath={createPath}
              setCreatePath={setCreatePath}
              generatedFileName={isCreateMode ? generatedFileName : undefined}
              isPreview={isPreview}
              isComposing={isComposing}
              saveAsTemplateOnly={saveAsTemplateOnly}
              templateSaveDraft={templateSaveDraft}
              setSaveAsTemplateOnly={setSaveAsTemplateOnly}
            />
          );
          const inlineComposer = (
            <InlineComposerPanel
              isEditorMode={isEditorMode}
              inlineInstruction={inlineInstruction}
              isComposing={isComposing}
              setInlineInstruction={setInlineInstruction}
              handleInlineCompose={handleInlineCompose}
              inlineTemplate={inlineTemplate}
              inlineSummaryFiles={inlineSummaryFiles}
              inlineRelevanceWarnings={inlineRelevanceWarnings}
              handleInlineTemplateSelect={handleInlineTemplateSelect}
              setInlineTemplate={setInlineTemplate}
              setInlineSummaryFiles={setInlineSummaryFiles}
              setInlineRelevanceWarnings={setInlineRelevanceWarnings}
            />
          );

          return isEditorMode ? (
            <SectionedShell
              variant="editor_with_footer"
              borderColorClass={hasUnsavedChanges ? 'border-destructive/40' : undefined}
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
          );
        })()}
      </PageTemplate>
    </main>
  );
}
