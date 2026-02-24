'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useTabStore, useEditorStore, useConfirmStore, useFileStore, useAssistantStore } from '@/stores';
import { useCurrentTabId } from '@/contexts/TabInstanceContext';
import { fileApi, docAssistApi } from '@/lib/utils/apiClient';
import { DocPageTemplate } from '@/components/templates';
import { Viewer } from '@/components/common/viewer';
import { Editor } from '@/components/common/editor';
import { type TocItem } from '@/components/common/page';
import { markdownToHtmlSync } from '@/lib/markdownConverter';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import type { DocumentMetadata } from '@/types';
import { ErrorState, LoadingState } from '@/components/common/StateDisplay';
import { AssistantReferenceChips, AssistantReferencePicker } from '@/components/common/assistant/ReferencePicker';

type PageMode = 'viewer' | 'editor' | 'create';

function replaceOnce(content: string, target: string, next: string): string {
  const index = content.indexOf(target);
  if (index < 0) return `${content.trimEnd()}\n\n${next}`;
  return `${content.slice(0, index)}${next}${content.slice(index + target.length)}`;
}

export function ViewerPage() {
  const tabId = useCurrentTabId();
  const { tabs, closeTab } = useTabStore();
  const { confirm } = useConfirmStore();
  const { refreshFileTree } = useFileStore();
  const openAssistantPanel = useAssistantStore((state) => state.openPanel);
  const toggleAssistantReference = useAssistantStore((state) => state.toggleReference);
  const attachedReferences = useAssistantStore((state) => state.attachedReferences);
  const selectedTemplates = useAssistantStore((state) => state.selectedTemplates);
  const summaryFiles = useAssistantStore((state) => state.summaryFiles);
  const setRelevanceWarnings = useAssistantStore((state) => state.setRelevanceWarnings);

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
      setContent('# 새 문서\n\n내용을 입력하세요...');
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

  const handleInlineCompose = useCallback(async () => {
    const instruction = inlineInstruction.trim();
    if (!instruction || isComposing) return;

    const selectedText = window.getSelection?.()?.toString().trim() || undefined;
    setIsComposing(true);
    try {
      const response = await docAssistApi.compose({
        instruction,
        currentContent: content,
        selectedText,
        activeDocPath: filePath || createPath,
        templates: selectedTemplates,
        summaryFiles: summaryFiles.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          textContent: item.textContent,
        })),
      });

      if (!response.success || !response.data) return;
      const generated = response.data.text.trim();
      if (!generated) return;

      const nextContent = selectedText
        ? replaceOnce(content, selectedText, generated)
        : `${content.trimEnd()}\n\n${generated}`;

      setContent(nextContent);
      setInlineInstruction('');
      setRelevanceWarnings(response.data.relevanceWarnings ?? []);
      if (isCreateMode && response.data.suggestedPath) {
        setCreatePath(response.data.suggestedPath);
      }
    } finally {
      setIsComposing(false);
    }
  }, [content, createPath, filePath, inlineInstruction, isComposing, isCreateMode, selectedTemplates, setContent, setRelevanceWarnings, summaryFiles]);

  const handleRecommendPath = useCallback(async () => {
    const instruction = inlineInstruction.trim() || '새 문서 작성';
    setIsRecommendingPath(true);
    try {
      const response = await docAssistApi.recommendPath({
        instruction,
        activeDocPath: createPath,
        templates: selectedTemplates,
        summaryFiles: summaryFiles.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          textContent: item.textContent,
        })),
      });
      if (!response.success || !response.data) return;
      setCreatePath(response.data.suggestedPath || createPath);
      setRelevanceWarnings(response.data.relevanceWarnings ?? []);
    } finally {
      setIsRecommendingPath(false);
    }
  }, [createPath, inlineInstruction, selectedTemplates, setRelevanceWarnings, summaryFiles]);

  const composeFooter = (mode === 'editor' || mode === 'create') ? (
    <section className="border-t border-ssoo-content-border bg-white/95 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ssoo-primary/80">인라인 AI 작성</p>
        <p className="text-[11px] text-ssoo-primary/60">선택 텍스트가 있으면 우선 치환, 없으면 하단에 추가됩니다.</p>
      </div>

      {mode === 'create' && (
        <div className="mb-2 flex items-center gap-2">
          <input
            value={createPath}
            onChange={(event) => setCreatePath(event.target.value)}
            placeholder="생성 경로 (예: design/order/request.md)"
            className="h-control-h w-full rounded-md border border-ssoo-content-border bg-white px-3 text-sm text-ssoo-primary placeholder:text-ssoo-primary/45 focus:outline-none focus:ring-1 focus:ring-ssoo-primary"
          />
          <button
            type="button"
            onClick={() => {
              void handleRecommendPath();
            }}
            disabled={isRecommendingPath}
            className="inline-flex h-control-h items-center gap-1 rounded-md border border-ssoo-content-border bg-white px-3 text-xs font-medium text-ssoo-primary hover:border-ssoo-primary/40 disabled:opacity-60"
          >
            {isRecommendingPath ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            경로 추천
          </button>
        </div>
      )}

      <AssistantReferenceChips disabled={isComposing} />

      <div className="flex items-center gap-2">
        <AssistantReferencePicker disabled={isComposing} />
        <textarea
          value={inlineInstruction}
          onChange={(event) => setInlineInstruction(event.target.value)}
          placeholder="AI에게 문서 수정/생성 지시를 입력하세요."
          className="min-h-control-h flex-1 resize-y rounded-md border border-ssoo-content-border px-3 py-2 text-sm text-ssoo-primary placeholder:text-ssoo-primary/45 focus:outline-none focus:ring-1 focus:ring-ssoo-primary"
          rows={1}
        />
        <button
          type="button"
          onClick={() => {
            void handleInlineCompose();
          }}
          disabled={isComposing || inlineInstruction.trim().length === 0}
          className="inline-flex h-control-h items-center gap-1 rounded-md bg-ssoo-primary px-3 text-sm font-medium text-white hover:bg-ssoo-primary/90 disabled:opacity-60"
        >
          {isComposing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          적용
        </button>
      </div>
    </section>
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
        showContentSurface
      />
    ) : (
      <Editor
        className="h-full"
        variant="embedded"
        preferredCreatePath={isCreateMode ? createPath : undefined}
        onCreatePathResolved={setCreatePath}
      />
    );
  }, [
    createPath,
    error,
    handleRetry,
    htmlContent,
    isCreateMode,
    isLoading,
    mode,
    toc,
    handleTocClick,
    handleSearch,
    handleAttachCurrentDocToAssistant,
  ]);

  const contentSurfaceClassName = 'bg-transparent border-0';

  if (!filePath && !isCreateMode) {
    return (
      <main className="h-full flex items-center justify-center bg-ssoo-content-bg/30">
        <p className="text-ssoo-primary/70">사이드바에서 파일을 선택해주세요.</p>
      </main>
    );
  }

  return (
    <main className="h-full overflow-hidden bg-ssoo-content-bg/30">
      <DocPageTemplate
        filePath={filePath || '새 문서.md'}
        mode={mode === 'create' ? 'editor' : mode}
        contentOrientation="portrait"
        contentSurfaceClassName={contentSurfaceClassName}
        metadata={metadata}
        tags={tags}
        documentMetadata={documentMetadata}
        onMetadataChange={handleMetadataChange}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onHistory={handleHistory}
        onDelete={isCreateMode ? undefined : handleDelete}
        onPathClick={handlePathClick}
        saving={isSaving}
      >
        <section className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">{contentBody}</div>
          {composeFooter}
        </section>
      </DocPageTemplate>
    </main>
  );
}

export default ViewerPage;
