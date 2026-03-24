'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { DOC_PAGE_SURFACE_PRESETS } from '@/components/templates/page-frame';
import { useRequestLifecycle } from '@/hooks/useRequestLifecycle';
import { useOpenDocumentTab } from '@/hooks/useOpenDocumentTab';
import { LoadingState } from '@/components/common/StateDisplay';
import { SplitDiffViewer } from '@/components/common/diff/SplitDiffViewer';
import { TemplateSaveControls } from './_components/EditorModeControls';
import { InlineComposerPanel, DocumentPageContent } from './_components/DocumentPagePanels';
import { DocumentPageEditorShell } from './_components/DocumentPageEditorShell';
import { DocumentPageFrame } from './_components/DocumentPageFrame';
import { DocumentPageSidecarSlot } from './_components/DocumentPageSidecarSlot';
import { NewDocumentLauncher } from './_components/NewDocumentLauncher';
import { useDocumentPageComposeActions } from './useDocumentPageComposeActions';
import { useDocumentPageMode } from './useDocumentPageMode';
import { useDocumentPageSidecar } from './useDocumentPageSidecar';
import { useDocumentPageReferences } from './useDocumentPageReferences';
import { useDocumentPageAI } from './useDocumentPageAI';
import { useDocumentPageDiff } from './useDocumentPageDiff';
import { useDocumentPageNavigation } from './useDocumentPageNavigation';
import { useDocumentPageLauncher } from './useDocumentPageLauncher';
import { useAiSummaryAutoExec } from './useAiSummaryAutoExec';
import { useDocumentPageActions } from './useDocumentPageActions';
import { buildDocumentSidecarDiffSnapshot } from './documentPageUtils';

export function DocumentPage() {
  const tabId = useTabInstanceId();
  const { tabs, closeTab, updateTab } = useTabStore();
  const { confirm } = useConfirmStore();
  const { refreshFileTree } = useFileStore();
  const openAssistantPanel = useAssistantPanelStore((state) => state.openPanel);
  const toggleAssistantReference = useAssistantContextStore((state) => state.toggleReference);
  const attachedReferences = useAssistantContextStore((state) => state.attachedReferences);
  const openDocumentTab = useOpenDocumentTab();

  const { loadFile, isLoading, error, content, isEditing, setIsEditing, fileMetadata, documentMetadata, setLocalDocumentMetadata, setContent, reset, isSaving, editorHandlers, removeTabEditor, hasUnsavedChanges, setHasUnsavedChanges, flushPendingMetadata, setCurrentFilePath, refreshFileMetadata } = useEditorStore();

  const [inlineInstruction, setInlineInstruction] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [, setIsRecommendingPath] = useState(false);
  const {
    mode,
    setMode,
    surfaceMode,
    setSurfaceMode,
    createPath,
    setCreatePath,
    setDisplayCreatePath,
    displaySuggestedTitle,
    setDisplaySuggestedTitle,
    editorRef,
    generatedFileName,
    createEntryType,
    isCreateMode,
    filePath,
    handleEditorContentChange,
    getCurrentDraftContent,
  } = useDocumentPageMode({
    tabId,
    tabs,
    isEditing,
    updateTab,
    removeTabEditor,
    content,
    editorHandlers,
  });
  const sidecar = useDocumentPageSidecar({
    content,
    documentMetadata,
    fileMetadata,
    filePath,
    isCreateMode,
    createPath,
    setCreatePath,
    getCurrentDraftContent,
    setLocalDocumentMetadata,
    setHasUnsavedChanges,
  });
  const references = useDocumentPageReferences({
    confirm,
    documentMetadata,
    setLocalDocumentMetadata,
    setHasUnsavedChanges,
  });
  const aiState = useDocumentPageAI({
    documentMetadata,
    setLocalDocumentMetadata,
  });
  const diffState = useDocumentPageDiff({
    surfaceMode,
    setSurfaceMode,
    getCurrentDraftContent,
    documentMetadata,
  });
  const { pendingSuggestedInfoTitle, pendingSuggestedInfoPath, pendingInfoPathValidationMessage, titleRecommendationStatus, setTitleRecommendationStatus, pathRecommendationStatus, setPathRecommendationStatus, pathValidationMessage, saveAsTemplateOnly, setSaveAsTemplateOnly, templateSaveDraft, setTemplateSaveDraft, originalMetaSnapshot, setOriginalMetaSnapshot, pendingFileMove, setPendingFileMove, htmlContent, toc, metadata, tags, liveBodyLinks, currentSidecarFilePath, originalInfoDocumentTitle, originalInfoFilePath, consumeTitlePathRecommendation, requestInfoRecommendation, handleAcceptSuggestedInfoTitle, handleDismissSuggestedInfoTitle, handleAcceptSuggestedInfoPath, handleDismissSuggestedInfoPath, handleMetadataChange, handleFileMove, resetSuggestionState } = sidecar;
  const { inlineTemplate, setInlineTemplate, inlineSummaryFiles, setInlineSummaryFiles, inlineRelevanceWarnings, setInlineRelevanceWarnings, usedSummaryFileIds, isTemplateUsed, isRestoringReferences, pendingDeletedFileIds, isTemplatePendingDelete, failedRestoreFiles, isRetryingRestore, pendingAttachmentsRef, handleRemoveSummaryFile, handleRestoreSummaryFile, handleRemoveTemplate, handleRestoreTemplate, handleRetryRestoreFiles, handleClearAll, handleSyncReferencesToSidecar, restoreReferencesFromMetadata, applyPendingReferenceMutationsBeforeSave, uploadPendingAttachments, resetReferences, deletedReferenceKeys } = references;
  const { pendingSuggestedTags, pendingAiSuggestion, isAutoSuggestingTags, isAutoSuggestingSummary, clearPendingSuggestedTags, clearPendingAiSuggestion, autoRecommendMetadata, applyMetadataRecommendation } = aiState;
  const { diffTarget, setDiffTarget, diffDraftContent, diffMetadataSnapshotText, canUndo, canRedo, metadataDiffCurrentText, metadataDiffOriginalText: buildMetadataDiffOriginalText, handleHistoryChange, handleDiffToggle, resetDiff } = diffState;
  const navigation = useDocumentPageNavigation({
    editorRef,
    mode,
    filePath,
    attachedReferences,
    openAssistantPanel,
    openDocumentTab,
    toggleAssistantReference,
  });
  const { imagePreview, setImagePreview, lightboxImage, setLightboxImage, handleAttachCurrentDocToAssistant, handleTocClick, handleScrollToBodyLink, handleOpenLink, handleViewerLinkClick, handleViewerImageClick } = navigation;

  // 첨부파일 선택 이벤트 수신: File 객체를 pendingAttachmentsRef에 저장
  useEffect(() => {
    const handler = (e: Event) => {
      const { meta, file } = (e as CustomEvent).detail as { meta: { path: string }; file: File };
      pendingAttachmentsRef.current.set(meta.path, file);
    };
    window.addEventListener('attachment-file-selected', handler);
    return () => window.removeEventListener('attachment-file-selected', handler);
  }, [pendingAttachmentsRef]);

  // 뷰어 모드에서 documentMetadata 로드 시 diff 스냅샷 초기화
  // (snapshot이 null이면 파일명으로 폴백되어 제목 하이라이트 오작동)
  useEffect(() => {
    if (mode === 'viewer' && documentMetadata && !originalMetaSnapshot) {
      setOriginalMetaSnapshot(buildDocumentSidecarDiffSnapshot(documentMetadata));
    }
  }, [documentMetadata, mode, originalMetaSnapshot, setOriginalMetaSnapshot]);

  const consumeAiSummaryPending = useNewDocStore((s) => s.consumeAiSummaryPending);
  useAiSummaryAutoExec({
    autoRecommendMetadata,
    applyMetadataRecommendation,
    consumeAiSummaryPending,
    consumeTitlePathRecommendation,
    createEntryType,
    isComposing,
    reset,
    resetDiff,
    resetSuggestionState,
    setContent,
    setCreatePath,
    setDiffTarget,
    setDisplayCreatePath,
    setDisplaySuggestedTitle,
    setHasUnsavedChanges,
    setInlineRelevanceWarnings,
    setInlineSummaryFiles,
    setIsComposing,
    setIsEditing,
    setMode,
    setOriginalMetaSnapshot,
    setPathRecommendationStatus,
    setSaveAsTemplateOnly,
    setSurfaceMode,
    setTitleRecommendationStatus,
  });

  useEffect(() => {
    if (filePath && !isCreateMode) {
      loadFile(filePath);
      setMode('viewer');
      setIsEditing(false);
      setCreatePath(filePath);
      setDisplayCreatePath('');
      setDisplaySuggestedTitle('');
      resetSuggestionState();
    }
  }, [filePath, isCreateMode, loadFile, resetSuggestionState, setCreatePath, setDisplayCreatePath, setDisplaySuggestedTitle, setIsEditing, setMode]);

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

  const composeRequestLifecycle = useRequestLifecycle();
  const { handleEdit, handleDelete, handleSave, handleCancel, handleRetry } = useDocumentPageActions({
    confirm,
    closeTab,
    content,
    documentMetadata,
    editorHandlers,
    editorRef,
    filePath,
    isCreateMode,
    isEditing,
    loadFile,
    pendingFileMove,
    refreshFileMetadata,
    refreshFileTree,
    reset,
    resetDiff,
    resetReferences,
    restoreReferencesFromMetadata,
    setCurrentFilePath,
    setDiffTarget,
    setIsEditing,
    setLocalDocumentMetadata,
    setMode,
    setOriginalMetaSnapshot,
    setPendingFileMove,
    setSurfaceMode,
    tabId,
    updateTab,
    uploadPendingAttachments,
    applyPendingReferenceMutationsBeforeSave,
  });

  const {
    handleInlineCompose,
    handleInlineTemplateSelect,
    abortCompose,
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
      pendingDeletedFileIds,
      isTemplatePendingDelete,
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
      requestLifecycle: composeRequestLifecycle,
      onSyncReferencesToSidecar: handleSyncReferencesToSidecar,
      composeRecommendation: {
        isCreateMode,
        autoRecommendMetadata,
        applyMetadataRecommendation,
        consumeTitlePathRecommendation,
        setCreatePath,
        setDisplaySuggestedTitle,
        setDisplayCreatePath,
        setTitleRecommendationStatus,
        setPathRecommendationStatus,
      },
    },
  });

  const isEditorMode = mode === 'editor' || mode === 'create';
  const metadataDiffOriginalText = useMemo(
    () => buildMetadataDiffOriginalText(originalMetaSnapshot),
    [buildMetadataDiffOriginalText, originalMetaSnapshot],
  );
  const sidecarInfoLoading = isCreateMode && isComposing;
  const sidecarTagsLoading = isComposing || isAutoSuggestingTags;
  const sidecarSummaryLoading = isComposing || isAutoSuggestingSummary;
  const diffViewerNode = surfaceMode === 'diff' ? (
    <SplitDiffViewer
      originalText={diffTarget === 'content' ? content : metadataDiffOriginalText}
      currentText={diffTarget === 'content'
        ? (diffDraftContent ?? getCurrentDraftContent())
        : (diffMetadataSnapshotText ?? metadataDiffCurrentText)}
      originalTitle="이전"
      currentTitle="현재"
      language={diffTarget === 'content' ? 'markdown' : 'json'}
      className="h-full"
    />
  ) : null;

  const contentSurfaceClassName = DOC_PAGE_SURFACE_PRESETS.document;
  const headerEditorRightSlot = (
    <TemplateSaveControls
      mode={mode}
      saveAsTemplateOnly={saveAsTemplateOnly}
      setSaveAsTemplateOnly={setSaveAsTemplateOnly}
    />
  );
  const setAiSummaryPending = useNewDocStore((s) => s.setAiSummaryPending);
  const { handleLauncherNewDoc, handleLauncherTemplate, handleLauncherAiSummary, handleLauncherClose } = useDocumentPageLauncher({
    tabId,
    closeTab,
    setAiSummaryPending,
    setIsComposing,
    updateTab,
  });

  // 런처 페이지: /doc/new
  if (createEntryType === 'launcher') {
    return <NewDocumentLauncher onSelectNewDoc={handleLauncherNewDoc} onSelectTemplate={handleLauncherTemplate} onSelectAiSummary={handleLauncherAiSummary} onClose={handleLauncherClose} />;
  }

  if (createEntryType === 'ai-summary' && isComposing) {
    return <main className="h-full flex items-center justify-center bg-ssoo-content-bg/30"><LoadingState message="AI가 문서를 요약하는 중..." /></main>;
  }

  if (!filePath && !isCreateMode) {
    return <main className="h-full flex items-center justify-center bg-ssoo-content-bg/30"><p className="text-ssoo-primary/70">사이드바에서 파일을 선택해주세요.</p></main>;
  }

  const contentBody = <DocumentPageContent error={error} handleRetry={handleRetry} isLoading={isLoading} isCreateMode={isCreateMode} mode={mode} htmlContent={htmlContent} toc={toc} handleTocClick={handleTocClick} handleAttachCurrentDocToAssistant={handleAttachCurrentDocToAssistant} editorRef={editorRef} createPath={createPath} setCreatePath={setCreatePath} generatedFileName={isCreateMode ? generatedFileName : undefined} isPreview={surfaceMode === 'preview'} isComposing={isComposing} saveAsTemplateOnly={saveAsTemplateOnly} templateSaveDraft={templateSaveDraft} setSaveAsTemplateOnly={setSaveAsTemplateOnly} onEditorContentChange={handleEditorContentChange} onLinkClick={handleViewerLinkClick} onImageClick={handleViewerImageClick} onHistoryChange={handleHistoryChange} />;
  const inlineComposer = <InlineComposerPanel isEditorMode={isEditorMode} inlineInstruction={inlineInstruction} isComposing={isComposing || isRestoringReferences} setInlineInstruction={setInlineInstruction} handleInlineCompose={handleInlineCompose} inlineTemplate={inlineTemplate} inlineSummaryFiles={inlineSummaryFiles} inlineRelevanceWarnings={isRestoringReferences ? ['참조 파일/템플릿 내용을 복원하는 중입니다...'] : inlineRelevanceWarnings} usedSummaryFileIds={usedSummaryFileIds} isTemplateUsed={isTemplateUsed} deletedFileIds={pendingDeletedFileIds.size > 0 ? pendingDeletedFileIds : undefined} isTemplateDeleted={isTemplatePendingDelete || undefined} handleInlineTemplateSelect={handleInlineTemplateSelect} setInlineTemplate={setInlineTemplate} setInlineSummaryFiles={setInlineSummaryFiles} setInlineRelevanceWarnings={setInlineRelevanceWarnings} onRemoveSummaryFile={handleRemoveSummaryFile} onRemoveTemplate={handleRemoveTemplate} onRestoreSummaryFile={handleRestoreSummaryFile} onRestoreTemplate={handleRestoreTemplate} onClearAll={handleClearAll} onAbort={abortCompose} hasFailedRestore={failedRestoreFiles.length > 0} isRetryingRestore={isRetryingRestore} onRetryRestore={handleRetryRestoreFiles} />;

  return (
    <DocumentPageFrame
      filePath={filePath || '새 문서.md'}
      mode={mode}
      isCreateMode={isCreateMode}
      surfaceMode={surfaceMode}
      documentTitle={documentMetadata?.title?.trim() || undefined}
      contentSurfaceClassName={contentSurfaceClassName}
      sidecarContent={(
        <DocumentPageSidecarSlot
          metadata={metadata}
          tags={tags}
          editable={mode === 'editor' || mode === 'create'}
          documentMetadata={documentMetadata}
          isLoading={isLoading}
          onMetadataChange={handleMetadataChange}
          onFileMove={isCreateMode
            ? (newPath) => {
                setCreatePath(newPath);
                setDisplayCreatePath(newPath);
                setHasUnsavedChanges(true);
              }
            : handleFileMove}
          generatedFileName={isCreateMode ? generatedFileName : undefined}
          isNewDocument={isCreateMode}
          titleRecommendationStatus={titleRecommendationStatus}
          pathRecommendationStatus={pathRecommendationStatus}
          externalInfoLoading={sidecarInfoLoading}
          originalDocumentTitle={originalInfoDocumentTitle}
          originalFilePath={originalInfoFilePath}
          pathValidationMessage={pathValidationMessage || undefined}
          displayDocumentTitle={isCreateMode ? displaySuggestedTitle : undefined}
          pendingSuggestedTitle={pendingSuggestedInfoTitle}
          pendingSuggestedPath={pendingSuggestedInfoPath}
          pendingPathValidationMessage={pendingInfoPathValidationMessage || undefined}
          filePath={currentSidecarFilePath}
          templateSaveEnabled={saveAsTemplateOnly}
          templateDraft={templateSaveDraft}
          onTemplateDraftChange={(update) => {
            setTemplateSaveDraft((prev) => ({ ...prev, ...update }));
          }}
          onRequestInfoRecommendation={requestInfoRecommendation}
          onAcceptSuggestedTitle={() => handleAcceptSuggestedInfoTitle()}
          onDismissSuggestedTitle={handleDismissSuggestedInfoTitle}
          onAcceptSuggestedPath={() => handleAcceptSuggestedInfoPath()}
          onDismissSuggestedPath={handleDismissSuggestedInfoPath}
          getEditorContent={getCurrentDraftContent}
          bodyLinks={liveBodyLinks}
          onScrollToBodyLink={handleScrollToBodyLink}
          onOpenLink={handleOpenLink}
          originalMetaSnapshot={originalMetaSnapshot}
          onOpenDocumentTab={(path) => openDocumentTab({ path })}
          externalSuggestedTags={pendingSuggestedTags}
          externalSuggestedTagsLoading={sidecarTagsLoading}
          onExternalSuggestedTagsConsumed={clearPendingSuggestedTags}
          externalAiSuggestion={pendingAiSuggestion}
          externalAiSuggestionLoading={sidecarSummaryLoading}
          onExternalAiSuggestionConsumed={clearPendingAiSuggestion}
          deletedReferenceKeys={deletedReferenceKeys}
          onImmediateFlush={async () => { await flushPendingMetadata(); }}
        />
      )}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={isCreateMode ? undefined : handleDelete}
      saving={isSaving}
      saveDisabled={!hasUnsavedChanges}
      headerEditorRightSlot={headerEditorRightSlot}
      imagePreview={imagePreview}
      setImagePreview={setImagePreview}
      lightboxImage={lightboxImage}
      setLightboxImage={setLightboxImage}
    >
      {isEditorMode ? (
        <DocumentPageEditorShell
          mode={mode}
          surfaceMode={surfaceMode}
          setSurfaceMode={setSurfaceMode}
          editorRef={editorRef}
          canUndo={canUndo}
          canRedo={canRedo}
          hasUnsavedChanges={hasUnsavedChanges}
          diffTarget={diffTarget}
          setDiffTarget={setDiffTarget}
          handleDiffToggle={handleDiffToggle}
          contentBody={contentBody}
          diffViewerNode={diffViewerNode}
          footer={inlineComposer}
        />
      ) : contentBody}
    </DocumentPageFrame>
  );
}
