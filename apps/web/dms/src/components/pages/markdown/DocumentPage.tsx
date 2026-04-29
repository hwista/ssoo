'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  useTabStore,
  useEditorStore,
  useConfirmStore,
  useFileStore,
  useAccessStore,
  useAuthStore,
  useAssistantContextStore,
  useAssistantPanelStore,
  useNewDocStore,
} from '@/stores';
import type { TemplateConversionPendingData } from '@/stores/new-doc.store';
import type { TemplateSaveData } from '@/stores/editor-core.store';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import { docAssistApi } from '@/lib/api/endpoints/ai';
import { fileApi } from '@/lib/api/endpoints/files';
import { templateApi } from '@/lib/api/endpoints/templates';
import { fetchWithSharedAuth } from '@/lib/api/sharedAuth';
import { PageTemplate } from '@/components/templates';
import {
  DOC_PAGE_SURFACE_PRESETS,
  PAGE_BACKGROUND_PRESETS,
  SectionedShell,
} from '@/components/templates/page-frame';
import { EditorToolbar } from './_components/editor';
import type { EditorRef, EditorSaveConflictPayload } from './_components/editor';
import { type TocItem } from '@/components/templates/page-frame';
import { markdownToHtmlSync } from '@/lib/utils/markdown';
import { generateUniqueFilename } from '@/lib/utils';
import { extractMarkdownLinks } from '@/lib/utils/extractMarkdownLinks';
import { useBodyLinks } from '@/hooks/useBodyLinks';
import { useRequestLifecycle } from '@/hooks/useRequestLifecycle';
import { useOpenDocumentTab } from '@/hooks/useOpenDocumentTab';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import { resolveDocPath } from '@/lib/utils/linkUtils';
import type { DocumentMetadata } from '@/types';
import {
  type InlineSummaryFileItem,
} from '@/components/common/assistant/reference/Picker';
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import type { TemplateItem } from '@/types/template';
import { cn } from '@/lib/utils';
import { Divider } from '@/components/ui/divider';
import { AlertTriangle, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { ErrorState, LoadingState } from '@/components/common/StateDisplay';
import { SplitDiffViewer } from '@/components/common/diff/SplitDiffViewer';
import { DocumentPanel } from './_components/DocumentPanel';
import { DiffTargetToggle, DiffToggleButton, PreviewToggleButton } from './_components/EditorModeControls';
import { InlineComposerPanel, DocumentPageContent } from './_components/DocumentPagePanels';
import { NewDocumentLauncher } from './_components/NewDocumentLauncher';
import { DocumentExportMenu } from './_components/DocumentExportMenu';
import { TemplatePickerDialog } from './_components/document-panel/TemplatePickerDialog';
import { TemplatePreviewDialog } from './_components/document-panel/TemplatePreviewDialog';
import { useDocumentPageComposeActions } from './useDocumentPageComposeActions';
import { useTemplateSaveFlow } from './useTemplateSaveFlow';
import { useViewerTemplatePicker } from './useViewerTemplatePicker';
import { useDocumentCollaboration } from './useDocumentCollaboration';
import { useDocumentInfoRecommendation } from './useDocumentInfoRecommendation';
import { useDocumentLauncherActions } from './useDocumentLauncherActions';
import { useDocumentReferenceLifecycle } from './useDocumentReferenceLifecycle';
import { useSyncReferencesToMetadata } from './useSyncReferencesToMetadata';
import { toast } from '@/lib/toast';
import { downloadMarkdown, printHtmlContent } from '@/lib/utils/downloadUtils';
import { resolveTitlePathRecommendation } from '@/lib/utils/titlePathRecommendation';
import {
  canEditDocument,
  canManageDocument,
  buildDocumentMetadataDiffSnapshot,
  buildDocumentPanelMetadata,
  buildMarkdownToc,
  getDocumentFilePath,
  getDocumentHighlightQuery,
  resolveDocumentAclRole,
  resolveSaveDisplayName,
  stringifyDocumentMetadataDiffSnapshot,
  type DocumentMetadataDiffSnapshot,
} from './documentPageUtils';

type PageMode = 'viewer' | 'editor' | 'create';
type EditorSurfaceMode = 'edit' | 'preview' | 'diff' | 'conflict';
type DiffTarget = 'content' | 'metadata';

type SaveConflictState = EditorSaveConflictPayload;

export function DocumentPage() {
  const tabId = useTabInstanceId();
  const { tabs, closeTab, updateTab, openTab } = useTabStore();
  const { confirm } = useConfirmStore();
  const { refreshFileTree } = useFileStore();
  const openAssistantPanel = useAssistantPanelStore((state) => state.openPanel);
  const toggleAssistantReference = useAssistantContextStore((state) => state.toggleReference);
  const attachedReferences = useAssistantContextStore((state) => state.attachedReferences);
  const openDocumentTab = useOpenDocumentTab();
  const currentUser = useAuthStore((state) => state.user);
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const canWriteDocuments = accessSnapshot?.features.canWriteDocuments ?? false;
  const canUseAssistant = accessSnapshot?.features.canUseAssistant ?? false;
  const canManageTemplates = accessSnapshot?.features.canManageTemplates ?? false;
  const canManageStorage = accessSnapshot?.features.canManageStorage ?? false;

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
    replaceLocalDocumentMetadata,
    setContent,
    reset,
    isSaving,
    editorHandlers,
    removeTabEditor,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    flushPendingMetadata,
    discardPendingMetadata,
    currentFilePath: storeCurrentFilePath,
    setCurrentFilePath,
    patchDocumentMetadata,
    refreshFileMetadata,
    setContentType,
    setTemplateSaveData,
  } = useEditorStore();

  const [mode, setMode] = useState<PageMode>('viewer');
  const [inlineInstruction, setInlineInstruction] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [createPath, setCreatePath] = useState('drafts/new-doc.md');
  const [, setIsRecommendingPath] = useState(false);
  const [inlineTemplate, setInlineTemplate] = useState<TemplateItem | null>(null);
  const [inlineSummaryFiles, setInlineSummaryFiles] = useState<InlineSummaryFileItem[]>([]);
  const [inlineRelevanceWarnings, setInlineRelevanceWarnings] = useState<string[]>([]);
  const [surfaceMode, setSurfaceMode] = useState<EditorSurfaceMode>('edit');
  const [diffTarget, setDiffTarget] = useState<DiffTarget>('content');
  const [diffDraftContent, setDiffDraftContent] = useState<string | null>(null);
  const [diffMetadataSnapshotText, setDiffMetadataSnapshotText] = useState<string | null>(null);
  const [saveConflict, setSaveConflict] = useState<SaveConflictState | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const editorRef = useRef<EditorRef | null>(null);
  const [liveEditorContent, setLiveEditorContent] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [templateConversionSource, setTemplateConversionSource] = useState<TemplateConversionPendingData | null>(null);
  // 템플릿 전환 완료 시 생성된 콘텐츠 (useEffect에서 메타데이터 자동 생성 트리거)
  const [templateConvertedContent, setTemplateConvertedContent] = useState<string | null>(null);

  // AI 작성에 사용된 참조 파일/템플릿 추적
  const [usedSummaryFileIds, setUsedSummaryFileIds] = useState<Set<string>>(new Set());
  const [isTemplateUsed, setIsTemplateUsed] = useState(false);
  const [isRestoringReferences, setIsRestoringReferences] = useState(false);

  // 참조 파일/템플릿 소프트 삭제 (되돌리기 가능)
  const [pendingDeletedFileIds, setPendingDeletedFileIds] = useState<Set<string>>(new Set());
  const [isTemplatePendingDelete, setIsTemplatePendingDelete] = useState(false);
  const [usedTemplateRefPaths, setUsedTemplateRefPaths] = useState<Set<string>>(new Set());
  const [pendingDeletedRefPaths, setPendingDeletedRefPaths] = useState<Set<string>>(new Set());

  // 참조 파일 복원 실패 추적 (재시도용)
  const [failedRestoreFiles, setFailedRestoreFiles] = useState<Array<{ id: string; name: string; path: string }>>([]);
  const [isRetryingRestore, setIsRetryingRestore] = useState(false);

  // AI 자동 추천 상태 (compose 후 패널에 주입)
  const [pendingSuggestedTags, setPendingSuggestedTags] = useState<string[] | undefined>(undefined);
  const [pendingAiSuggestion, setPendingAiSuggestion] = useState<string | null | undefined>(undefined);
  const [isAutoSuggestingTags, setIsAutoSuggestingTags] = useState(false);
  const [isAutoSuggestingSummary, setIsAutoSuggestingSummary] = useState(false);
  const clearPendingSuggestedTags = useCallback(() => setPendingSuggestedTags(undefined), []);
  const clearPendingAiSuggestion = useCallback(() => setPendingAiSuggestion(undefined), []);

  // 첨부파일 deferred upload: 파일 선택 시 File 객체를 저장, 문서 저장 시 업로드
  const pendingAttachmentsRef = useRef<Map<string, File>>(new Map());

  // 경로 변경 지연: 기존문서 경로 변경을 저장 시까지 보류
  const [pendingFileMove, setPendingFileMove] = useState<string | null>(null);

  const handleEditorContentChange = useCallback((editorContent: string) => {
    setLiveEditorContent(editorContent);
  }, []);

  /** 편집 진입 시 메타데이터 스냅샷 (변경 하이라이트용) */
  const [originalMetaSnapshot, setOriginalMetaSnapshot] = useState<DocumentMetadataDiffSnapshot | null>(null);

  // handleSave 클로저에서 항상 최신 메타데이터를 참조하기 위한 ref
  const documentMetadataRef = useRef(documentMetadata);
  documentMetadataRef.current = documentMetadata;

  // 새 문서용 자동 생성 파일명 (세션당 1회 생성)
  const [generatedFileName] = useState(() => generateUniqueFilename());

  useEffect(() => {
    return () => {
      removeTabEditor();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 첨부파일 선택 이벤트 수신: File 객체를 pendingAttachmentsRef에 저장
  useEffect(() => {
    const handler = (e: Event) => {
      const { meta, file } = (e as CustomEvent).detail as { meta: { path: string }; file: File };
      pendingAttachmentsRef.current.set(meta.path, file);
    };
    window.addEventListener('attachment-file-selected', handler);
    return () => window.removeEventListener('attachment-file-selected', handler);
  }, []);

  useEffect(() => {
    if (mode === 'create' && !isEditing && storeCurrentFilePath) {
      // create 모드에서 저장 완료 (currentFilePath가 설정됨) → viewer 전환
      setMode('viewer');
    } else if (mode !== 'create') {
      setMode(isEditing ? 'editor' : 'viewer');
    }
  }, [isEditing, mode, storeCurrentFilePath]);

  useEffect(() => {
    if (mode === 'viewer') {
      setSurfaceMode('edit');
    }
  }, [mode]);

  // 뷰어 모드에서 documentMetadata 로드 시 diff 스냅샷 초기화
  // (snapshot이 null이면 파일명으로 폴백되어 제목 하이라이트 오작동)
  useEffect(() => {
    if (mode === 'viewer' && documentMetadata && !originalMetaSnapshot) {
      setOriginalMetaSnapshot(buildDocumentMetadataDiffSnapshot(documentMetadata));
    }
  }, [mode, documentMetadata, originalMetaSnapshot]);

  useEffect(() => {
    if (mode !== 'editor' && mode !== 'create') {
      setSurfaceMode('edit');
      setDiffTarget('content');
      setSaveConflict(null);
    }
  }, [mode]);

  useEffect(() => {
    if (!tabId) return;
    updateTab(tabId, { isEditing: mode === 'editor' || mode === 'create' });
  }, [mode, tabId, updateTab]);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabs, tabId]);

  const createEntryType = useMemo<'launcher' | 'doc' | 'template' | 'ai-summary' | null>(() => {
    const path = activeTab?.path;
    if (path === '/doc/new') return 'launcher';
    if (path === '/doc/new-doc') return 'doc';
    if (path === '/doc/new-template') return 'template';
    if (path === '/doc/new-ai-summary') return 'ai-summary';
    return null;
  }, [activeTab?.path]);

  const isCreateMode = createEntryType !== null && createEntryType !== 'launcher';
  const documentAclRole = useMemo(
    () => resolveDocumentAclRole(documentMetadata, currentUser),
    [documentMetadata, currentUser],
  );
  const canEditCurrentDocument = isCreateMode
    || (canWriteDocuments && canEditDocument(documentMetadata, currentUser));
  const canManageCurrentDocument = isCreateMode
    || (canWriteDocuments && canManageDocument(documentMetadata, currentUser));

  useEffect(() => {
    if (isCreateMode || canEditCurrentDocument || mode === 'viewer') {
      return;
    }

    setMode('viewer');
    setIsEditing(false);
    setSurfaceMode('edit');
    setDiffTarget('content');
  }, [canEditCurrentDocument, isCreateMode, mode, setIsEditing]);

  const filePath = useMemo(() => getDocumentFilePath(activeTab?.path), [activeTab?.path]);
  const highlightQuery = useMemo(() => getDocumentHighlightQuery(activeTab?.path), [activeTab?.path]);

  const consumeAiSummaryPending = useNewDocStore((s) => s.consumeAiSummaryPending);
  const setTemplateConversionPending = useNewDocStore((s) => s.setTemplateConversionPending);
  const getTemplateConversionPending = useNewDocStore((s) => s.getTemplateConversionPending);
  const clearTemplateConversionPending = useNewDocStore((s) => s.clearTemplateConversionPending);
  const aiSummaryConsumedRef = useRef(false);
  const aiSummaryCompletedRef = useRef(false);
  const templateConversionConsumedRef = useRef(false);

  useEffect(() => {
    if (!createEntryType || createEntryType === 'launcher') return;

    reset();
    setContent('');
    setMode('create');
    setIsEditing(true);
    setCreatePath('drafts/new-doc.md');
    resetInfoRecommendation();
    setOriginalMetaSnapshot(buildDocumentMetadataDiffSnapshot(null));
    setSurfaceMode('edit');
    setDiffTarget('content');
    setSaveConflict(null);

    aiSummaryConsumedRef.current = false;
    aiSummaryCompletedRef.current = false;
    templateConversionConsumedRef.current = false;
    setTemplateConversionSource(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- resetInfoRecommendation is referentially stable
  }, [createEntryType, reset, setContent, setIsEditing]);

  useEffect(() => {
    if (filePath && !isCreateMode) {
      loadFile(filePath);
      setMode('viewer');
      setIsEditing(false);
      setCreatePath(filePath);
      resetInfoRecommendation();
      setSaveConflict(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- resetInfoRecommendation is referentially stable
  }, [filePath, isCreateMode, loadFile, setIsEditing]);

  // AI 요약 자동 실행: 진입 시 pending 파일을 소비하고 본문 기반으로 compose 호출
  useEffect(() => {
    if (createEntryType !== 'ai-summary' || aiSummaryConsumedRef.current) return;
    if (!canWriteDocuments || !canUseAssistant) {
      setIsComposing(false);
      return;
    }
    aiSummaryConsumedRef.current = true;

    const runAiSummary = async () => {
      const pending = consumeAiSummaryPending();
      if (!pending || pending.summaryFiles.length === 0) {
        setIsComposing(false);
        return;
      }

      setInlineSummaryFiles(pending.summaryFiles);

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
            markRecommendationLoading();
            const [metadataResult, titlePathResult] = await Promise.allSettled([
              autoRecommendMetadata(generated),
              docAssistApi.recommendTitleAndPath({ currentContent: generated }),
            ]);

            if (metadataResult.status === 'fulfilled') {
              applyMetadataRecommendation(metadataResult.value, 'auto');
            }

            if (titlePathResult.status === 'fulfilled' && titlePathResult.value.success && titlePathResult.value.data) {
              const resolved = resolveTitlePathRecommendation(titlePathResult.value.data, {
                fallbackContent: generated,
              });
              consumeTitlePathRecommendation(resolved, 'auto');
              if (!resolved.path) {
                if (titlePathResult.value.data.suggestedFileName) {
                  const nextPath = `drafts/${titlePathResult.value.data.suggestedFileName}`;
                  setCreatePath(nextPath);
                } else if (response.data.suggestedPath) {
                  setCreatePath(response.data.suggestedPath);
                }
              }
            } else if (response.data.suggestedPath) {
              setCreatePath(response.data.suggestedPath);
              markRecommendationError();
            } else {
              markRecommendationError();
            }

            setContent(generated);
            aiSummaryCompletedRef.current = true;
          }
          setInlineRelevanceWarnings([]);
        }
      } finally {
        setIsComposing(false);
      }
    };

    void runAiSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseAssistant, canWriteDocuments, createEntryType]);

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

  useEffect(() => {
    if (createEntryType !== 'template' || !tabId || templateConversionConsumedRef.current) return;
    const pending = getTemplateConversionPending(tabId);
    if (!pending) return;
    templateConversionConsumedRef.current = true;
    setTemplateConversionSource(pending);
  }, [createEntryType, getTemplateConversionPending, tabId]);

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

  const currentDraftContent = editorHandlers?.getMarkdown?.()
    ?? editorRef.current?.getMarkdown()
    ?? liveEditorContent
    ?? content;
  const currentTemplateDraftContent = editorRef.current?.getMarkdown()
    ?? liveEditorContent
    ?? content;
  const isGeneratedTemplateMode = createEntryType === 'template';

  const getCurrentDraftContent = useCallback(() => (
    editorHandlers?.getMarkdown?.()
    ?? editorRef.current?.getMarkdown()
    ?? liveEditorContent
    ?? content
  ), [content, editorHandlers, liveEditorContent]);
  const templateSaveFlow = useTemplateSaveFlow({
    enabled: isGeneratedTemplateMode,
    editorContent: currentDraftContent,
    filePath,
    documentTitle: documentMetadata?.title,
    sourceDocument: templateConversionSource ? {
      path: templateConversionSource.sourceFilePath,
      title: templateConversionSource.sourceTitle,
      content: templateConversionSource.sourceContent,
    } : null,
    documentMetadata,
    replaceContent: (nextContent) => {
      editorRef.current?.replaceContent(nextContent);
      setLiveEditorContent(nextContent);
    },
    replaceLocalDocumentMetadata,
    discardPendingMetadata,
    onConvertComplete: useCallback((generatedContent: string) => {
      setTemplateConvertedContent(generatedContent);
    }, []),
  });
  const {
    templateModeEnabled,
    isConvertingToTemplate,
    isTemplatePickerOpen,
    referenceTemplates,
    currentTemplateId,
    saveTarget,
    templateOriginType,
    templateReferenceDocuments,
    templateGeneration,
    toggleTemplateMode,
    addTemplateReference,
    removeTemplateReference,
    handleTemplateSelected,
    handleAiConvertRequested,
    handleTemplatePickerClose,
  } = templateSaveFlow;

  // 스토어에 contentType 동기화 (템플릿/문서)
  useEffect(() => {
    setContentType((isGeneratedTemplateMode || templateModeEnabled) ? 'template' : 'document');
  }, [isGeneratedTemplateMode, templateModeEnabled, setContentType]);

  const {
    isViewerTemplatePickerOpen,
    viewerReferenceTemplates,
    previewTemplate,
    isCheckingReferenceTemplates,
    startViewerTemplateFlow,
    closeViewerTemplatePicker,
    openViewerTemplatePreview,
    returnFromPreviewToPicker,
    createReferencedTemplate,
  } = useViewerTemplatePicker({
    filePath,
    content,
    documentTitle: documentMetadata?.title,
    openTab,
    setTemplateConversionPending,
    clearTemplateConversionPending,
  });

  useEffect(() => {
    if (!isConvertingToTemplate || !tabId) return;
    clearTemplateConversionPending(tabId);
  }, [clearTemplateConversionPending, isConvertingToTemplate, tabId]);

  const liveBodyLinks = useBodyLinks(currentDraftContent);

  const {
    displayCreatePath,
    displaySuggestedTitle,
    pendingSuggestedInfoTitle,
    pendingSuggestedInfoPath,
    pendingInfoPathValidationMessage,
    titleRecommendationStatus,
    pathRecommendationStatus,
    pathValidationMessage,
    setDisplayCreatePath,
    setTitleRecommendationStatus,
    setPathRecommendationStatus,
    resetInfoRecommendation,
    markRecommendationLoading,
    markRecommendationError,
    consumeTitlePathRecommendation,
    requestInfoRecommendation,
    handleAcceptSuggestedInfoTitle,
    handleDismissSuggestedInfoTitle,
    handleAcceptSuggestedInfoPath,
    handleDismissSuggestedInfoPath,
  } = useDocumentInfoRecommendation({
    canUseAssistant,
    isCreateMode,
    isGeneratedTemplateMode,
    filePath,
    getCurrentDraftContent,
    setLocalDocumentMetadata,
    setCreatePath,
    setHasUnsavedChanges,
    setPendingFileMove,
  });

  // 패널 표시용: isCreateMode 대신 mode === 'create' 사용
  // 템플릿 저장 후 mode가 'viewer'로 전환되면 저장된 값을 표시하기 위함
  const isActivelyCreating = mode === 'create';
  const currentDocumentPath = isActivelyCreating ? displayCreatePath : (pendingFileMove ?? filePath ?? storeCurrentFilePath ?? '');
  const originalInfoDocumentTitle = isActivelyCreating
    ? ''
    : (originalMetaSnapshot?.title || filePath?.split('/').pop()?.replace(/\.md$/, '') || '');
  const originalInfoFilePath = isActivelyCreating ? '' : (filePath ?? storeCurrentFilePath ?? '');

  const metadata = useMemo(
    () => buildDocumentPanelMetadata(content, documentMetadata, fileMetadata),
    [content, documentMetadata, fileMetadata]
  );


  const tags = useMemo(() => documentMetadata?.tags || [], [documentMetadata]);

  const handleEdit = useCallback(() => {
    if (!canEditCurrentDocument) {
      toast.error('문서를 편집할 권한이 없습니다.');
      return;
    }

    setOriginalMetaSnapshot(buildDocumentMetadataDiffSnapshot(documentMetadata));
    setMode('editor');
    setIsEditing(true);
    setSurfaceMode('edit');
    setDiffTarget('content');
    setSaveConflict(null);

    // 기존 참조/템플릿을 Chips에 복원
    const sourceFiles = documentMetadata?.sourceFiles ?? [];
    const refFiles = sourceFiles.filter((f) => f.origin === 'reference');
    const templateFile = sourceFiles.find((f) => f.origin === 'template');

    const hasRefsToRestore = refFiles.length > 0 || !!templateFile;
    if (hasRefsToRestore) setIsRestoringReferences(true);
    const restorePromises: Promise<void>[] = [];

    if (refFiles.length > 0) {
      const restored: InlineSummaryFileItem[] = refFiles.map((f) => ({
        id: `${f.name}-restored-${f.size}`,
        name: f.name,
        type: f.type ?? 'application/octet-stream',
        size: f.size ?? 0,
        textContent: '',
      }));
      setInlineSummaryFiles((prev) => {
        const map = new Map(prev.map((item) => [item.name, item]));
        for (const r of restored) {
          if (!map.has(r.name)) map.set(r.name, r);
        }
        return Array.from(map.values());
      });
      setUsedSummaryFileIds(new Set(restored.map((r) => r.id)));

      // 서버에서 참조 파일 내용 비동기 복원 (타임아웃 + 실패 추적)
      restorePromises.push((async () => {
        const failed: Array<{ id: string; name: string; path: string }> = [];
        const results = await Promise.all(
          refFiles.map(async (f) => {
            const itemId = `${f.name}-restored-${f.size}`;
            if (!f.path || f.path.startsWith('__pending__')) {
              failed.push({ id: itemId, name: f.name, path: f.path || '' });
              return null;
            }
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);
              const res = await fetchWithSharedAuth(
                `/api/file/serve-attachment?path=${encodeURIComponent(f.path)}`,
                { signal: controller.signal },
              );
              clearTimeout(timeout);
              if (res.ok) {
                const text = await res.text();
                if (text.trim().length > 0) {
                  return { name: f.name, textContent: text.slice(0, 12000) };
                }
              }
              failed.push({ id: itemId, name: f.name, path: f.path });
            } catch {
              failed.push({ id: itemId, name: f.name, path: f.path || '' });
            }
            return null;
          }),
        );
        const fetched = results.filter(Boolean) as { name: string; textContent: string }[];
        if (fetched.length > 0) {
          setInlineSummaryFiles((prev) =>
            prev.map((item) => {
              const match = fetched.find((c) => c.name === item.name);
              return match ? { ...item, textContent: match.textContent } : item;
            }),
          );
        }
        if (failed.length > 0) {
          const failedNames = failed.map((f) => f.name);
          setFailedRestoreFiles(failed);
          setInlineRelevanceWarnings((prev) => [
            ...prev,
            `참조 파일 복원 실패: ${failedNames.join(', ')}. AI 작성 시 해당 파일 내용이 반영되지 않을 수 있습니다.`,
          ]);
        }
      })());
    }

    if (templateFile) {
      const tplItem: TemplateItem = {
        id: templateFile.path || templateFile.name,
        name: templateFile.name,
        kind: 'document',
        scope: 'personal',
        content: '',
        updatedAt: new Date().toISOString(),
        sourcePath: templateFile.path,
        status: 'active',
        sourceType: 'markdown-file',
        visibility: 'private',
      };
      setInlineTemplate(tplItem);
      setIsTemplateUsed(true);

      // 서버에서 템플릿 내용 비동기 복원 (템플릿 전용 API 사용)
      restorePromises.push((async () => {
        try {
          // sourcePath에서 scope와 id 추출: "global/{id}.md" 또는 "personal/{userId}/{id}.md"
          const sourcePath = templateFile.path || '';
          const isGlobal = sourcePath.startsWith('global/');
          const scope: 'global' | 'personal' = isGlobal ? 'global' : 'personal';

          // sourcePath에서 파일명(확장자 제외)을 ID로 사용
          const baseName = sourcePath.split('/').pop()?.replace(/\.md$/, '') || '';
          const templateId = baseName || tplItem.id;

          const res = await templateApi.get(templateId, scope);
          if (res.success && res.data?.content) {
            setInlineTemplate((prev) => prev ? { ...prev, content: res.data!.content, scope } : prev);
          } else {
            // fallback: 전체 목록에서 이름으로 매칭
            const listRes = await templateApi.list();
            if (listRes.success && listRes.data) {
              const all = [...(listRes.data.global ?? []), ...(listRes.data.personal ?? [])];
              const match = all.find((t) => t.name === templateFile.name || t.id === templateId);
              if (match?.content) {
                setInlineTemplate((prev) => prev ? { ...prev, content: match.content, scope: match.scope } : prev);
              }
            }
          }
        } catch { /* ignore restore failure */ }
      })());
    }

    // 모든 복원 완료 후 상태 해제
    if (hasRefsToRestore) {
      void Promise.allSettled(restorePromises).then(() => {
        setIsRestoringReferences(false);
      });
    }
  }, [canEditCurrentDocument, setIsEditing, documentMetadata]);

  const handleDelete = useCallback(async () => {
    if (!canManageCurrentDocument) {
      toast.error('문서를 삭제할 권한이 없습니다.');
      return;
    }
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
  }, [canManageCurrentDocument, filePath, tabId, confirm, reset, closeTab, refreshFileTree]);

  const handleSearch = useCallback(() => {
    // TODO: 문서 내 검색 하이라이트
  }, []);

  const handleAttachCurrentDocToAssistant = useCallback(() => {
    if (!canUseAssistant) {
      toast.error('AI 어시스턴트를 사용할 권한이 없습니다.');
      return;
    }
    if (!filePath) return;
    const alreadyAttached = attachedReferences.some((item) => item.path === filePath);
    if (!alreadyAttached) {
      const title = filePath.split('/').pop() || filePath;
      toggleAssistantReference({ path: filePath, title });
    }
    openAssistantPanel();
    window.dispatchEvent(new Event(ASSISTANT_FOCUS_INPUT_EVENT));
  }, [attachedReferences, canUseAssistant, filePath, openAssistantPanel, toggleAssistantReference]);

  const handleTocClick = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScrollToBodyLink = useCallback((url: string) => {
    if (mode === 'viewer') {
      // 일반 링크 (<a>) 또는 이미지 (<img data-original-src>) 모두 검색
      const link = document.querySelector(`a[href="${CSS.escape(url)}"]`)
        ?? document.querySelector(`img[data-original-src="${CSS.escape(url)}"]`);
      if (link) {
        link.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const el = link as HTMLElement;
        const prevBg = el.style.backgroundColor;
        const prevOutline = el.style.outline;
        const prevOutlineOffset = el.style.outlineOffset;
        const prevRadius = el.style.borderRadius;
        const prevPadding = el.style.padding;
        el.style.backgroundColor = '#fef08a';
        el.style.outline = '2px solid #fb923c';
        el.style.outlineOffset = '1px';
        el.style.borderRadius = '2px';
        el.style.padding = '0 2px';
        setTimeout(() => {
          el.style.backgroundColor = prevBg;
          el.style.outline = prevOutline;
          el.style.outlineOffset = prevOutlineOffset;
          el.style.borderRadius = prevRadius;
          el.style.padding = prevPadding;
        }, 2000);
      }
    } else {
      const md = editorRef.current?.getMarkdown() ?? '';
      const idx = md.indexOf(url);
      if (idx >= 0) {
        const cmContent = document.querySelector('.cm-content');
        if (cmContent) {
          const walker = document.createTreeWalker(cmContent, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const text = node.textContent ?? '';
            const pos = text.indexOf(url);
            if (pos >= 0) {
              const range = document.createRange();
              range.setStart(node, pos);
              range.setEnd(node, pos + url.length);
              const rect = range.getBoundingClientRect();
              if (rect) {
                const scroller = document.querySelector('.cm-scroller');
                if (scroller) {
                  const scrollerRect = scroller.getBoundingClientRect();
                  scroller.scrollTo({
                    top: scroller.scrollTop + rect.top - scrollerRect.top - scrollerRect.height / 2,
                    behavior: 'smooth',
                  });
                }
              }
              // 하이라이트 마크 삽입
              const mark = document.createElement('mark');
              mark.className = 'search-highlight';
              mark.style.backgroundColor = '#fef08a';
              mark.style.color = 'inherit';
              mark.style.borderRadius = '2px';
              mark.style.padding = '0 2px';
              mark.style.outline = '2px solid #fb923c';
              mark.style.outlineOffset = '1px';
              range.surroundContents(mark);
              setTimeout(() => {
                const parent = mark.parentNode;
                if (parent) {
                  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
                  parent.removeChild(mark);
                }
              }, 2000);
              break;
            }
          }
        }
      }
    }
  }, [mode]);

  const handleOpenLink = useCallback((url: string, type?: 'link' | 'image') => {
    if (type === 'image') {
      setImagePreview({ src: url, alt: '이미지 미리보기' });
      return;
    }
    const docPath = resolveDocPath(url, filePath);
    if (docPath) {
      openDocumentTab({ path: docPath });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [filePath, openDocumentTab]);

  // 뷰어 본문 <a> 클릭: 사이드카 링크 섹션과 동일 동작
  const handleViewerLinkClick = useCallback((href: string) => {
    const docPath = resolveDocPath(href, filePath);
    if (docPath) {
      openDocumentTab({ path: docPath });
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }, [filePath, openDocumentTab]);

  // 뷰어 본문 <img> 클릭: 미리보기 모달 없이 바로 라이트박스
  const handleViewerImageClick = useCallback((src: string, alt: string) => {
    setLightboxImage({ src, alt });
  }, []);

  // 참조 파일/템플릿을 metadata projection 에서 제거하는 헬퍼
  const removeReferenceFromMetadata = useCallback((name: string) => {
    const currentFiles = documentMetadata?.sourceFiles ?? [];
    setLocalDocumentMetadata({
      sourceFiles: currentFiles.filter((f) => f.name !== name),
    });
  }, [documentMetadata, setLocalDocumentMetadata]);

  const handleSave = useCallback(async () => {
    if (!canEditCurrentDocument) {
      return;
    }

    // 소프트 삭제된 항목을 저장 전 실제로 제거
    if (pendingDeletedFileIds.size > 0) {
      const deletedNames = inlineSummaryFiles
        .filter((f) => pendingDeletedFileIds.has(f.id))
        .map((f) => f.name);
      setInlineSummaryFiles((prev) => prev.filter((f) => !pendingDeletedFileIds.has(f.id)));
      setUsedSummaryFileIds((prev) => {
        const next = new Set(prev);
        for (const id of pendingDeletedFileIds) next.delete(id);
        return next;
      });
      // metadata projection 에서도 제거
      const currentFiles = documentMetadata?.sourceFiles ?? [];
      const nameSet = new Set(deletedNames);
      setLocalDocumentMetadata({
        sourceFiles: currentFiles.filter((f) => !nameSet.has(f.name)),
      });
      setPendingDeletedFileIds(new Set());
    }
    if (isTemplatePendingDelete && inlineTemplate) {
      removeReferenceFromMetadata(inlineTemplate.name);
      setInlineTemplate(null);
      setIsTemplateUsed(false);
      setIsTemplatePendingDelete(false);
    }
    if (pendingDeletedRefPaths.size > 0) {
      const deletedInlineRefIds = templateReferenceDocuments
        .filter((ref) => pendingDeletedRefPaths.has(ref.path) && ref.storage === 'inline' && ref.tempId)
        .flatMap((ref) => ref.tempId ? [ref.tempId] : []);
      for (const path of pendingDeletedRefPaths) {
        removeTemplateReference(path);
      }
      if (deletedInlineRefIds.length > 0) {
        const deletedIdSet = new Set(deletedInlineRefIds);
        setInlineSummaryFiles((prev) => prev.filter((item) => !deletedIdSet.has(item.id)));
      }
      setPendingDeletedRefPaths(new Set());
      setUsedTemplateRefPaths((prev) => {
        const next = new Set(prev);
        for (const path of pendingDeletedRefPaths) next.delete(path);
        return next;
      });
    }

    // 저장 직전 본문 링크를 metadata projection 에 영속화
    const currentBodyLinks = extractMarkdownLinks(
      editorRef.current?.getMarkdown() ?? content,
    );
    setLocalDocumentMetadata({ bodyLinks: currentBodyLinks });

    // 대기 중인 첨부파일/참조파일 업로드 → sourceFiles 경로 치환
    const pending = pendingAttachmentsRef.current;
    if (pending.size > 0) {
      const currentFiles = documentMetadata?.sourceFiles ?? [];
      const updatedFiles = [...currentFiles];

      for (const [tempPath, file] of pending.entries()) {
        // 참조 파일은 _assets/references/, 수기 첨부는 _assets/attachments/
        const isRef = tempPath.startsWith('__pending__/ref-');
        const uploadUrl = isRef ? '/api/file/upload-reference' : '/api/file/upload-attachment';
        const currentFile = updatedFiles.find((entry) => entry.path === tempPath);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentPath', filePath || createPath);
        if (currentFile?.provider) {
          formData.append('provider', currentFile.provider);
        }
        try {
          const res = await fetchWithSharedAuth(uploadUrl, { method: 'POST', body: formData });
          const data = await res.json();
          if (res.ok && data && typeof data.path === 'string') {
            const idx = updatedFiles.findIndex((f) => f.path === tempPath);
            const nextFile = {
              ...(idx >= 0 ? updatedFiles[idx] ?? {} : currentFile ?? {}),
              name: typeof data.fileName === 'string' ? data.fileName : currentFile?.name ?? file.name,
              path: data.path,
              size: typeof data.size === 'number' ? data.size : currentFile?.size ?? file.size,
              type: typeof data.type === 'string' ? data.type : currentFile?.type ?? file.type,
              provider: typeof data.provider === 'string' ? data.provider : currentFile?.provider,
              storageUri: typeof data.storageUri === 'string' ? data.storageUri : currentFile?.storageUri,
              versionId: typeof data.versionId === 'string' ? data.versionId : currentFile?.versionId,
              etag: typeof data.etag === 'string' ? data.etag : currentFile?.etag,
              checksum: typeof data.checksum === 'string' ? data.checksum : currentFile?.checksum,
              url: typeof data.webUrl === 'string' ? data.webUrl : currentFile?.url,
              status: data.status === 'draft' || data.status === 'pending_confirm' || data.status === 'published'
                ? data.status
                : 'published',
            };
            if (idx >= 0) {
              updatedFiles[idx] = nextFile;
            } else {
              updatedFiles.push(nextFile);
            }
            pending.delete(tempPath);
          }
        } catch {
          // 업로드 실패 시 해당 파일은 pending 상태로 유지
        }
      }
      setLocalDocumentMetadata({ sourceFiles: updatedFiles });
    }

    // 템플릿 저장 시 스토어에 메타데이터 설정 (saveFile이 templateApi.upsert() 호출에 사용)
    if (saveTarget === 'template') {
      setTemplateSaveData({
        ...(currentTemplateId ? { id: currentTemplateId } : {}),
        scope: 'personal',
        kind: 'document',
        originType: templateOriginType,
        referenceDocuments: templateReferenceDocuments.filter(
          (ref) => !pendingDeletedRefPaths.has(ref.path),
        ),
        generation: templateGeneration,
      } as TemplateSaveData);
      // 템플릿 이름을 메타데이터 title로 설정
      setLocalDocumentMetadata({
        title: resolveSaveDisplayName(documentMetadata, currentDraftContent, filePath || createPath),
      });
    }

    // 공통 저장 경로: editorHandlers.save() → useEditorPersistence.handleSave()
    // - isCreateMode → requestSaveLocation 모달 → storeSaveFile
    // - 기존 콘텐츠 → storeSaveFile 직접 호출
    // storeSaveFile은 스토어의 contentType에 따라 fileApi 또는 templateApi 호출
    const didSave = await editorHandlers?.save();
    if (!didSave) {
      return;
    }
    setSaveConflict(null);

    // 저장 성공 후 diff 스냅샷 갱신 (하이라이트 초기화)
    // create 모드: 탭 ID 변경으로 컴포넌트가 재마운트되므로 null로 초기화
    // (재마운트 시 초기화 effect가 디스크에서 로드된 메타데이터로 올바르게 재설정)
    // 기존 문서: ref로 최신 메타데이터 참조 (클로저 캡처 문제 방지)
    if (isCreateMode) {
      setOriginalMetaSnapshot(null);
    } else {
      setOriginalMetaSnapshot(buildDocumentMetadataDiffSnapshot(documentMetadataRef.current));
    }

    // 저장 완료 후 보류 중인 파일 이동 적용
    if (pendingFileMove && filePath && tabId && pendingFileMove !== filePath) {
      try {
        const result = await fileApi.rename(filePath, pendingFileMove, true);
        if (result.success) {
          const actualPath = result.data?.finalPath ?? pendingFileMove;
          const encodedPath = `/doc/${encodeURIComponent(actualPath)}`;
          const title = actualPath.split('/').pop() || actualPath;
          updateTab(tabId, { path: encodedPath, title });
          setCurrentFilePath(actualPath);
          await refreshFileMetadata(actualPath);
          setPendingFileMove(null);
          await refreshFileTree();
        } else {
          console.error('파일 이동 실패:', result);
        }
      } catch (err) {
        console.error('파일 이동 실패:', err);
      }
    } else {
      // 경로 이동 없어도 파일 트리 갱신 (문서명 변경 반영)
      await refreshFileTree();
    }
  }, [
    createPath,
    currentDraftContent,
    pendingDeletedFileIds,
    inlineSummaryFiles,
    isTemplatePendingDelete,
    inlineTemplate,
    removeReferenceFromMetadata,
    documentMetadata,
    setLocalDocumentMetadata,
    editorHandlers,
    content,
    pendingFileMove,
    filePath,
    tabId,
    updateTab,
    setCurrentFilePath,
    refreshFileMetadata,
    refreshFileTree,
    isCreateMode,
    saveTarget,
    templateGeneration,
    templateOriginType,
    templateReferenceDocuments,
    pendingDeletedRefPaths,
    currentTemplateId,
    removeTemplateReference,
    setTemplateSaveData,
    canEditCurrentDocument,
  ]);

  const handleSaveConflict = useCallback(async (conflict: EditorSaveConflictPayload) => {
    setSaveConflict(conflict);
    setDiffTarget('content');
    setSurfaceMode('conflict');
    if (typeof conflict.currentRevisionSeq === 'number') {
      patchDocumentMetadata({ revisionSeq: conflict.currentRevisionSeq });
    }
  }, [patchDocumentMetadata]);

  // Ctrl+S를 DocumentPage의 handleSave로 라우팅 (rename 로직 포함)
  // Editor 내부의 Ctrl+S 핸들러보다 먼저 capture phase에서 실행
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleSave();
      }
    };
    document.addEventListener('keydown', handler, { capture: true });
    return () => document.removeEventListener('keydown', handler, { capture: true });
  }, [handleSave, isEditing]);

  const handleCancel = useCallback(() => {
    if (templateModeEnabled && !isGeneratedTemplateMode) {
      toggleTemplateMode(false);
    }
    // 대기 중인 이미지 blob URL 정리
    editorRef.current?.clearPendingImages();
    // 대기 중인 첨부파일 정리
    pendingAttachmentsRef.current.clear();
    // 참조 파일/템플릿 추적 초기화
    setUsedSummaryFileIds(new Set());
    setIsTemplateUsed(false);
    setInlineSummaryFiles([]);
    setInlineTemplate(null);
    setInlineRelevanceWarnings([]);
    // 소프트 삭제 상태 초기화
    setPendingDeletedFileIds(new Set());
    setIsTemplatePendingDelete(false);
    setUsedTemplateRefPaths(new Set());
    setPendingDeletedRefPaths(new Set());
    setFailedRestoreFiles([]);
    // 보류 중인 경로 변경 폐기
    setPendingFileMove(null);
    if (editorHandlers) {
      editorHandlers.cancel();
    } else {
      setMode('viewer');
      setIsEditing(false);
    }
    setSurfaceMode('edit');
    setDiffTarget('content');
  }, [editorHandlers, isGeneratedTemplateMode, setIsEditing, templateModeEnabled, toggleTemplateMode]);

  const handleMetadataChange = useCallback((update: Partial<DocumentMetadata>) => {
    setLocalDocumentMetadata(update);
    setHasUnsavedChanges(true);
  }, [setLocalDocumentMetadata, setHasUnsavedChanges]);
  const composeRequestLifecycle = useRequestLifecycle();

  interface MetadataRecommendationResult {
    suggestedTags: string[];
    summaryText: string | null;
  }

  const autoRecommendMetadata = useCallback(async (
    editorContent: string,
    options?: { signal?: AbortSignal; isRequestActive?: () => boolean; contentType?: 'document' | 'template' },
  ): Promise<MetadataRecommendationResult | null> => {
    if (!editorContent.trim()) return null;

    const ct = options?.contentType;

    setIsAutoSuggestingTags(true);
    setIsAutoSuggestingSummary(true);

    const tagInstruction = ct === 'template'
      ? '다음 템플릿을 대표하는 핵심 태그를 5개 이내로 추출하세요. 템플릿의 용도·문서 유형·적용 분야를 나타내는 키워드를 우선하세요. 태그만 쉼표로 구분하여 반환하세요.'
      : '다음 문서를 대표하는 핵심 태그를 5개 이내로 추출하세요. 태그만 쉼표로 구분하여 반환하세요. 다른 설명 없이 태그만 출력하세요.';

    const tagPromise = docAssistApi.compose({
      instruction: tagInstruction,
      currentContent: editorContent,
      contentType: ct,
    }, { signal: options?.signal }).finally(() => {
      setIsAutoSuggestingTags(false);
    });

    const summaryPromise = docAssistApi.compose({
      instruction: '다음 문서의 핵심 내용을 2~3문장으로 요약하세요. 요약문만 출력하세요.',
      currentContent: editorContent,
      contentType: ct,
    }, { signal: options?.signal }).finally(() => {
      setIsAutoSuggestingSummary(false);
    });

    const [tagRes, summaryRes] = await Promise.allSettled([tagPromise, summaryPromise]);
    if (options?.signal?.aborted || (options?.isRequestActive && !options.isRequestActive())) return null;

    let suggestedTags: string[] = [];
    if (tagRes.status === 'fulfilled' && tagRes.value.data?.text) {
      suggestedTags = tagRes.value.data.text
        .split(/[,،、\n]+/)
        .map((t: string) => t.replace(/^[#\-*\s]+/, '').trim())
        .filter((t: string) => t.length > 0);
    }

    let summaryText: string | null = null;
    if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.text) {
      summaryText = summaryRes.value.data.text.trim();
    }

    return { suggestedTags, summaryText };
  }, []);

  const applyMetadataRecommendation = useCallback((
    recommendation: MetadataRecommendationResult | null,
    mode: 'suggest' | 'auto',
  ) => {
    if (!recommendation) return;

    if (mode === 'auto') {
      const currentTags = documentMetadata?.tags ?? [];
      const newTags = recommendation.suggestedTags.filter((tag) => !currentTags.includes(tag));
      const update: Partial<DocumentMetadata> = {};
      if (newTags.length > 0) {
        update.tags = [...currentTags, ...newTags];
      }
      if (recommendation.summaryText) {
        update.summary = recommendation.summaryText;
      }
      if (Object.keys(update).length > 0) {
        setLocalDocumentMetadata(update);
      }
      return;
    }

    if (recommendation.suggestedTags.length > 0) {
      setPendingSuggestedTags(recommendation.suggestedTags);
    }
    if (recommendation.summaryText) {
      setPendingAiSuggestion(recommendation.summaryText);
    }
  }, [documentMetadata?.tags, setLocalDocumentMetadata]);

  // 템플릿 전환/선택 완료 후 메타데이터 자동 생성 (AI 요약 생성과 동일 패턴)
  useEffect(() => {
    if (!templateConvertedContent) return;
    const generatedContent = templateConvertedContent;
    setTemplateConvertedContent(null);

    markRecommendationLoading();

    void (async () => {
      const [metadataResult, titlePathResult] = await Promise.allSettled([
        autoRecommendMetadata(generatedContent, { contentType: 'template' }),
        docAssistApi.recommendTitleAndPath({ currentContent: generatedContent, contentType: 'template' }),
      ]);

      if (metadataResult.status === 'fulfilled') {
        applyMetadataRecommendation(metadataResult.value, 'auto');
      }

      if (titlePathResult.status === 'fulfilled' && titlePathResult.value.success && titlePathResult.value.data) {
        const resolved = resolveTitlePathRecommendation(titlePathResult.value.data, {
          fallbackContent: generatedContent,
        });
        consumeTitlePathRecommendation(resolved, 'auto');
        if (titlePathResult.value.data.suggestedFileName) {
          const dir = titlePathResult.value.data.suggestedDirectory || 'templates/personal';
          setCreatePath(`${dir}/${titlePathResult.value.data.suggestedFileName}`);
        }
      } else {
        setTitleRecommendationStatus('error');
        setPathRecommendationStatus('error');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateConvertedContent]);

  const handleFileMove = useCallback((newPath: string) => {
    if (!filePath || newPath === filePath) return;
    setPendingFileMove(newPath);
    setHasUnsavedChanges(true);
  }, [filePath, setHasUnsavedChanges]);

  const handleRetry = useCallback(() => {
    if (filePath) loadFile(filePath);
  }, [filePath, loadFile]);

  // AI 작성 후 사용된 참조 파일/템플릿을 metadata sourceFiles에 동기화
  const handleSyncReferencesToMetadata = useSyncReferencesToMetadata({
    documentMetadata,
    inlineSummaryFiles,
    setLocalDocumentMetadata,
    setHasUnsavedChanges,
    setUsedSummaryFileIds,
    setIsTemplateUsed,
    setUsedTemplateRefPaths,
    pendingAttachmentsRef,
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
      templateReferenceDocuments,
      isComposing,
      isCreateMode,
      pendingDeletedFileIds,
      pendingDeletedRefPaths,
      isTemplatePendingDelete,
      contentType: isGeneratedTemplateMode ? 'template' : 'document',
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
      onSyncReferencesToMetadata: handleSyncReferencesToMetadata,
      onComposeComplete: useCallback(async (
        generatedContent: string,
        requestToken: number,
        signal: AbortSignal,
        context?: { suggestedPath?: string },
      ) => {
        const isRequestActive = () => composeRequestLifecycle.isRequestActive(requestToken);
        if (isCreateMode) {
          // 새문서: 태그/요약 제안 + 문서명/경로 제안
          markRecommendationLoading();
          const [metadataResult, titlePathResult] = await Promise.allSettled([
            autoRecommendMetadata(generatedContent, { signal, isRequestActive, contentType: isGeneratedTemplateMode ? 'template' : 'document' }),
            docAssistApi.recommendTitleAndPath({ currentContent: generatedContent, contentType: isGeneratedTemplateMode ? 'template' : 'document' }, { signal }),
          ]);

          if (!isRequestActive() || signal.aborted) return;

          if (metadataResult.status === 'fulfilled') {
            applyMetadataRecommendation(metadataResult.value, 'suggest');
          }

          if (titlePathResult.status === 'fulfilled') {
            const res = titlePathResult.value;
            if (res.success && res.data) {
              const resolved = resolveTitlePathRecommendation(res.data, {
                fallbackContent: generatedContent,
              });
              consumeTitlePathRecommendation(resolved, 'suggest');
              if (!resolved.path) {
                if (res.data.suggestedFileName) {
                  const nextPath = `drafts/${res.data.suggestedFileName}`;
                  setCreatePath(nextPath);
                } else if (context?.suggestedPath) {
                  setCreatePath(context.suggestedPath);
                }
              }
            } else if (context?.suggestedPath) {
              setCreatePath(context.suggestedPath);
              markRecommendationError();
            } else {
              markRecommendationError();
            }
          } else if (context?.suggestedPath) {
            setCreatePath(context.suggestedPath);
            markRecommendationError();
          } else {
            markRecommendationError();
          }
        } else {
          // 기존문서: 태그/요약 제안만
          const recommendation = await autoRecommendMetadata(generatedContent, { signal, isRequestActive, contentType: isGeneratedTemplateMode ? 'template' : 'document' });
          if (!isRequestActive() || signal.aborted) return;
          applyMetadataRecommendation(recommendation, 'suggest');
        }
      }, [applyMetadataRecommendation, autoRecommendMetadata, composeRequestLifecycle, consumeTitlePathRecommendation, isCreateMode, isGeneratedTemplateMode, markRecommendationError, markRecommendationLoading, setCreatePath]),
    },
  });

  const isEditorMode = mode === 'editor' || mode === 'create';
  const collaborationPath = currentDocumentPath || createPath || null;
  const collaborationMode = isEditorMode ? 'edit' : 'view';
  const {
    snapshot: collaborationSnapshot,
    takeover: takeoverCollaborationLock,
    refresh: refreshCollaborationState,
    retryPublish: retryCollaborationPublish,
  } = useDocumentCollaboration(collaborationPath, collaborationMode);
  const currentMetadataSnapshot = useMemo(
    () => buildDocumentMetadataDiffSnapshot(documentMetadata),
    [documentMetadata]
  );
  const metadataDiffOriginalText = useMemo(
    () => stringifyDocumentMetadataDiffSnapshot(originalMetaSnapshot ?? buildDocumentMetadataDiffSnapshot(null)),
    [originalMetaSnapshot]
  );
  const metadataDiffCurrentText = useMemo(
    () => stringifyDocumentMetadataDiffSnapshot(currentMetadataSnapshot),
    [currentMetadataSnapshot]
  );
  // 템플릿 전환(isConvertingToTemplate)도 문서 작성(isComposing)과 동일한 로딩 인프라를 공유
  const isAnyAiGenerating = isComposing || isConvertingToTemplate;
  const panelInfoLoading = isCreateMode && isAnyAiGenerating;
  const panelTagsLoading = isAnyAiGenerating || isAutoSuggestingTags;
  const panelSummaryLoading = isAnyAiGenerating || isAutoSuggestingSummary;
  const diffViewerNode = surfaceMode === 'diff' ? (
    <SplitDiffViewer
      originalText={diffTarget === 'content' ? content : metadataDiffOriginalText}
      currentText={diffTarget === 'content'
        ? (diffDraftContent ?? currentDraftContent)
        : (diffMetadataSnapshotText ?? metadataDiffCurrentText)}
      language={diffTarget === 'content' ? 'markdown' : 'json'}
      className="h-full"
    />
  ) : null;
  const conflictDiffViewerNode = surfaceMode === 'conflict' && saveConflict ? (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-amber-200 bg-white">
      <div className="grid shrink-0 grid-cols-2 border-b border-ssoo-content-border bg-amber-50/70 text-caption font-medium text-ssoo-primary/80">
        <div className="border-r border-ssoo-content-border px-4 py-2">최신 저장본</div>
        <div className="px-4 py-2">현재 초안</div>
      </div>
      <SplitDiffViewer
        originalText={saveConflict.latestContent}
        currentText={saveConflict.currentContent}
        language="markdown"
        className="min-h-0 flex-1"
      />
    </div>
  ) : null;
  const isCompareSurface = surfaceMode === 'diff' || surfaceMode === 'conflict';

  const handleHistoryChange = useCallback((nextCanUndo: boolean, nextCanRedo: boolean) => {
    setCanUndo(nextCanUndo);
    setCanRedo(nextCanRedo);
  }, []);

  const handleExitDiffMode = useCallback(() => {
    setSurfaceMode('edit');
    setDiffTarget('content');
  }, []);

  const handleDiffToggle = useCallback(() => {
    if (surfaceMode === 'diff') {
      handleExitDiffMode();
      return;
    }

    const draftContent = getCurrentDraftContent();
    setDiffDraftContent(draftContent);
    setDiffMetadataSnapshotText(metadataDiffCurrentText);
    setSurfaceMode('diff');
    setDiffTarget('content');
  }, [getCurrentDraftContent, handleExitDiffMode, metadataDiffCurrentText, surfaceMode]);

  const handleReopenConflictDiff = useCallback(() => {
    if (!saveConflict) return;
    setDiffTarget('content');
    setSurfaceMode('conflict');
  }, [saveConflict]);

  const handleDismissConflictNotice = useCallback(() => {
    setSaveConflict(null);
    setSurfaceMode('edit');
    setDiffTarget('content');
  }, []);

  // 참조 파일 해제: 사용된 파일→confirm→소프트삭제, 미사용→즉시삭제
  const {
    handleRemoveSummaryFile,
    handleRestoreSummaryFile,
    handleRemoveTemplate,
    handleRestoreTemplate,
    handleRemoveTemplateReference,
    handleRestoreTemplateReference,
    handleClearAll,
    handleRetryRestoreFiles,
  } = useDocumentReferenceLifecycle({
    inlineSummaryFiles,
    setInlineSummaryFiles,
    usedSummaryFileIds,
    setPendingDeletedFileIds,
    inlineTemplate,
    setInlineTemplate,
    isTemplateUsed,
    isTemplatePendingDelete,
    setIsTemplatePendingDelete,
    templateReferenceDocuments,
    usedTemplateRefPaths,
    setPendingDeletedRefPaths,
    removeTemplateReference,
    setInlineRelevanceWarnings,
    failedRestoreFiles,
    setFailedRestoreFiles,
    setIsRetryingRestore,
    confirm,
  });

  // 소프트 삭제된 참조 파일/템플릿 키 (패널 첨부 섹션 삭제 표시 연동)
  const deletedReferenceKeys = useMemo(() => {
    if (pendingDeletedFileIds.size === 0 && !isTemplatePendingDelete && pendingDeletedRefPaths.size === 0) return undefined;
    const sourceFiles = documentMetadata?.sourceFiles ?? [];
    const keys = new Set<string>();

    for (const sf of sourceFiles) {
      if (sf.origin === 'reference') {
        const matched = inlineSummaryFiles.find((f) => f.name === sf.name);
        if (matched && pendingDeletedFileIds.has(matched.id)) {
          keys.add(sf.path || sf.name);
        }
      }
      if (sf.origin === 'template' && isTemplatePendingDelete) {
        keys.add(sf.path || sf.name);
      }
    }
    for (const path of pendingDeletedRefPaths) {
      keys.add(path);
    }
    return keys.size > 0 ? keys : undefined;
  }, [pendingDeletedFileIds, isTemplatePendingDelete, pendingDeletedRefPaths, documentMetadata?.sourceFiles, inlineSummaryFiles]);

  const contentSurfaceClassName = DOC_PAGE_SURFACE_PRESETS.document;

  const setAiSummaryPending = useNewDocStore((s) => s.setAiSummaryPending);

  const handleDownloadCurrentMarkdown = useCallback(() => {
    const fallbackName = documentMetadata?.title?.trim() || filePath?.split('/').pop()?.replace(/\.md$/, '') || '문서';
    downloadMarkdown(content, fallbackName);
  }, [content, documentMetadata?.title, filePath]);

  const handleDownloadCurrentPdf = useCallback(() => {
    if (!htmlContent.trim()) {
      toast.warning('출력할 문서 내용이 없습니다.');
      return;
    }
    const title = documentMetadata?.title?.trim() || filePath?.split('/').pop()?.replace(/\.md$/, '') || '문서';
    printHtmlContent(htmlContent, title);
  }, [documentMetadata?.title, filePath, htmlContent]);

  const headerViewerRightSlot = templateModeEnabled ? null : (
    <DocumentExportMenu
      onConvertToTemplate={startViewerTemplateFlow}
      onDownloadMarkdown={handleDownloadCurrentMarkdown}
      onDownloadPdf={handleDownloadCurrentPdf}
      loading={isCheckingReferenceTemplates}
      canConvertToTemplate={canManageTemplates}
    />
  );

  const {
    handleLauncherNewDoc,
    handleLauncherTemplate,
    handleLauncherAiSummary,
    handleLauncherClose,
  } = useDocumentLauncherActions({
    tabId,
    canWriteDocuments,
    canManageTemplates,
    canUseAssistant,
    updateTab,
    closeTab,
    setAiSummaryPending,
    setIsComposing,
  });

  // 런처 페이지: /doc/new
  if (createEntryType === 'launcher') {
    return (
      <NewDocumentLauncher
        onSelectNewDoc={handleLauncherNewDoc}
        onSelectTemplate={handleLauncherTemplate}
        onSelectAiSummary={handleLauncherAiSummary}
        onClose={handleLauncherClose}
        canWriteDocuments={canWriteDocuments}
        canManageTemplates={canManageTemplates}
        canUseAssistant={canUseAssistant}
      />
    );
  }

  const createDeniedMessage = createEntryType === 'doc' && !canWriteDocuments
    ? '문서를 작성할 권한이 없습니다.'
    : createEntryType === 'template' && !canManageTemplates
      ? '템플릿을 관리할 권한이 없습니다.'
      : createEntryType === 'ai-summary' && (!canWriteDocuments || !canUseAssistant)
        ? 'AI 요약을 사용할 권한이 없습니다.'
        : null;

  if (createDeniedMessage) {
    return (
      <main className="h-full flex items-center justify-center bg-ssoo-content-bg/30">
        <ErrorState error={createDeniedMessage} />
      </main>
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

  const documentAclNotice = !isCreateMode && canWriteDocuments
    ? documentAclRole === 'viewer'
      ? '이 문서는 viewer 권한으로 열려 편집이 제한됩니다.'
      : documentAclRole === 'editor'
        ? '이 문서는 editor 권한으로 열려 메타데이터 변경과 삭제가 제한됩니다.'
        : null
    : null;

  return (
    <main
      className={cn(
        'h-full overflow-hidden',
        isEditorMode ? PAGE_BACKGROUND_PRESETS.documentEditor : PAGE_BACKGROUND_PRESETS.documentViewer
      )}
    >
      <PageTemplate
        filePath={filePath || '새 문서.md'}
        mode={mode}
        breadcrumbRootIconVariant={isCreateMode ? 'editor' : 'folder'}
        breadcrumbLastSegmentLabel={documentMetadata?.title?.trim() || undefined}
        contentOrientation="portrait"
        contentMaxWidth={isCompareSurface ? null : undefined}
        contentSurfaceClassName={contentSurfaceClassName}
        panelMode={isCompareSurface ? 'hidden' : undefined}
        panelContent={(
          <DocumentPanel
            metadata={metadata}
            tags={tags}
            editable={(mode === 'editor' || mode === 'create') && canManageCurrentDocument}
            documentMetadata={documentMetadata}
            isLoading={isLoading}
            collaborationSnapshot={collaborationSnapshot}
            currentUserLoginId={currentUser?.loginId}
            onTakeoverLock={async () => {
              const confirmed = await confirm({
                title: '편집 잠금 takeover',
                description: `${collaborationSnapshot?.softLock?.displayName} 사용자의 soft lock을 가져오시겠습니까?`,
                confirmText: 'Takeover',
                cancelText: '취소',
              });
              if (!confirmed) return;
              const updated = await takeoverCollaborationLock();
              if (updated) {
                toast.success('편집 잠금을 takeover 했습니다.');
              } else {
                toast.error('편집 잠금 takeover 에 실패했습니다.');
              }
            }}
            onRefreshPublishState={async () => {
              const updated = await refreshCollaborationState();
              if (updated) {
                toast.success('publish 상태를 새로고침했습니다.');
              } else {
                toast.error('publish 상태 새로고침에 실패했습니다.');
              }
            }}
            onRetryPublish={async () => {
              const updated = await retryCollaborationPublish();
              if (updated) {
                toast.success('publish 재시도를 요청했습니다.');
              } else {
                toast.error('publish 재시도 요청에 실패했습니다.');
              }
            }}
            canManageStorage={canManageStorage}
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
            externalInfoLoading={panelInfoLoading}
            originalDocumentTitle={originalInfoDocumentTitle}
            originalFilePath={originalInfoFilePath}
            pathValidationMessage={pathValidationMessage || undefined}
            displayDocumentTitle={isCreateMode ? displaySuggestedTitle : undefined}
            pendingSuggestedTitle={pendingSuggestedInfoTitle}
            pendingSuggestedPath={pendingSuggestedInfoPath}
            pendingPathValidationMessage={pendingInfoPathValidationMessage || undefined}
            filePath={currentDocumentPath}
            templateModeEnabled={templateModeEnabled}
            isConvertingTemplate={isConvertingToTemplate}
            templateOriginType={templateOriginType}
            templateReferenceDocuments={templateReferenceDocuments}
            onRequestInfoRecommendation={canUseAssistant ? requestInfoRecommendation : undefined}
            onAcceptSuggestedTitle={handleAcceptSuggestedInfoTitle}
            onDismissSuggestedTitle={handleDismissSuggestedInfoTitle}
            onAcceptSuggestedPath={handleAcceptSuggestedInfoPath}
            onDismissSuggestedPath={handleDismissSuggestedInfoPath}
            getEditorContent={() => currentDraftContent}
            bodyLinks={liveBodyLinks}
            onScrollToBodyLink={handleScrollToBodyLink}
            onOpenLink={handleOpenLink}
            originalMetaSnapshot={originalMetaSnapshot}
            onOpenDocumentTab={(path) => openDocumentTab({ path })}
            externalSuggestedTags={pendingSuggestedTags}
            externalSuggestedTagsLoading={panelTagsLoading}
            onExternalSuggestedTagsConsumed={clearPendingSuggestedTags}
            externalAiSuggestion={pendingAiSuggestion}
            externalAiSuggestionLoading={panelSummaryLoading}
            onExternalAiSuggestionConsumed={clearPendingAiSuggestion}
            deletedReferenceKeys={deletedReferenceKeys}
            onImmediateFlush={flushPendingMetadata}
          />
        )}
        onEdit={canEditCurrentDocument ? handleEdit : undefined}
        onSave={canEditCurrentDocument ? handleSave : undefined}
        onCancel={canEditCurrentDocument ? handleCancel : undefined}
        onBack={isCompareSurface ? handleExitDiffMode : undefined}
        onDelete={!canManageCurrentDocument || isCreateMode ? undefined : handleDelete}
        saving={isSaving}
        saveDisabled={!canEditCurrentDocument || !hasUnsavedChanges}
        isPreview={surfaceMode !== 'edit'}
        headerViewerRightSlot={headerViewerRightSlot}
      >
        {(() => {
          const contentBody = (
            <>
              {isEditorMode && saveConflict && surfaceMode !== 'conflict' ? (
                <div className="mb-3 flex flex-wrap items-start gap-3 rounded-md border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">최신 저장본과 충돌했습니다.</p>
                      <p className="text-amber-950/80">
                        최신 저장본과 현재 초안 비교 화면을 열어 두었습니다. 내용을 확인한 뒤 병합해서 다시 저장하세요.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReopenConflictDiff}>
                      비교 다시 보기
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDismissConflictNotice}>
                      닫기
                    </Button>
                  </div>
                </div>
              ) : null}
              {documentAclNotice ? (
                <div className="mb-3 rounded-md border border-ssoo-primary/20 bg-ssoo-content-bg/60 px-4 py-3 text-sm text-ssoo-primary/80">
                  {documentAclNotice}
                </div>
              ) : null}
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
                handleAttachCurrentDocToAssistant={canUseAssistant ? handleAttachCurrentDocToAssistant : undefined}
                initialSearchQuery={highlightQuery}
                editorRef={editorRef}
                createPath={createPath}
                setCreatePath={setCreatePath}
                generatedFileName={isCreateMode ? generatedFileName : undefined}
                isPreview={surfaceMode === 'preview'}
                isComposing={isComposing}
                isTemplateGenerating={isConvertingToTemplate}
                currentDraftContent={currentTemplateDraftContent}
                streamingAutoScroll={isConvertingToTemplate || isComposing}
                onEditorContentChange={handleEditorContentChange}
                onLinkClick={handleViewerLinkClick}
                onImageClick={handleViewerImageClick}
                onHistoryChange={handleHistoryChange}
                onSaveConflict={handleSaveConflict}
              />
            </>
          );
          const inlineComposer = canUseAssistant ? (
            <InlineComposerPanel
              isEditorMode={isEditorMode}
              inlineInstruction={inlineInstruction}
              isComposing={isComposing || isRestoringReferences}
              setInlineInstruction={setInlineInstruction}
              handleInlineCompose={handleInlineCompose}
              inlineTemplate={inlineTemplate}
              inlineSummaryFiles={inlineSummaryFiles}
              inlineRelevanceWarnings={isRestoringReferences
                ? ['참조 파일/템플릿 내용을 복원하는 중입니다...']
                : inlineRelevanceWarnings}
              usedSummaryFileIds={usedSummaryFileIds}
              isTemplateUsed={isTemplateUsed}
              deletedFileIds={pendingDeletedFileIds.size > 0 ? pendingDeletedFileIds : undefined}
              isTemplateDeleted={isTemplatePendingDelete || undefined}
              handleInlineTemplateSelect={handleInlineTemplateSelect}
              setInlineTemplate={setInlineTemplate}
              setInlineSummaryFiles={setInlineSummaryFiles}
              setInlineRelevanceWarnings={setInlineRelevanceWarnings}
              onRemoveSummaryFile={handleRemoveSummaryFile}
              onRemoveTemplate={handleRemoveTemplate}
              onRestoreSummaryFile={handleRestoreSummaryFile}
              onRestoreTemplate={handleRestoreTemplate}
              onClearAll={handleClearAll}
              onAbort={abortCompose}
              hasFailedRestore={failedRestoreFiles.length > 0}
              isRetryingRestore={isRetryingRestore}
              onRetryRestore={handleRetryRestoreFiles}
              templateModeEnabled={templateModeEnabled}
              templateReferenceDocuments={templateReferenceDocuments}
              addTemplateReference={addTemplateReference}
              removeTemplateReference={removeTemplateReference}
              onRemoveTemplateReference={handleRemoveTemplateReference}
              onRestoreReference={handleRestoreTemplateReference}
              pendingDeletedRefPaths={pendingDeletedRefPaths.size > 0 ? pendingDeletedRefPaths : undefined}
            />
          ) : null;

          return isEditorMode ? (
            <SectionedShell
              variant="editor_with_footer"
              toolbar={(
                <div className="flex w-full items-center gap-1">
                  {surfaceMode === 'conflict' ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-amber-900">
                        <AlertTriangle className="h-4 w-4" />
                        <span>최신 저장본과 현재 초안을 비교 중입니다.</span>
                      </div>
                      <div className="flex-1" />
                      <Button variant="ghost" size="sm" onClick={handleDismissConflictNotice}>
                        알림 닫기
                      </Button>
                    </>
                  ) : surfaceMode === 'diff' ? (
                    <DiffTargetToggle
                      value={diffTarget}
                      onChange={setDiffTarget}
                    />
                  ) : (
                    <>
                      <PreviewToggleButton
                        mode={mode}
                        isPreview={surfaceMode !== 'edit'}
                        onToggle={() => {
                          setSurfaceMode((prev) => (prev === 'edit' ? 'preview' : 'edit'));
                        }}
                      />
                      {surfaceMode === 'edit' && (
                        <>
                          <Divider orientation="vertical" className="h-6 mx-1" />
                          <EditorToolbar
                            onCommand={(id) => editorRef.current?.applyCommand(id)}
                          />
                        </>
                      )}
                      {(hasUnsavedChanges || surfaceMode === 'edit') && (
                        <>
                          <div className="flex-1" />
                          {surfaceMode === 'edit' && (
                            <>
                              <SimpleTooltip content="되돌리기 (Ctrl+Z)">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!canUndo}
                                  onClick={() => editorRef.current?.undo()}
                                >
                                  <Undo2 className="h-4 w-4" />
                                </Button>
                              </SimpleTooltip>
                              <SimpleTooltip content="다시 적용 (Ctrl+Shift+Z)">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!canRedo}
                                  onClick={() => editorRef.current?.redo()}
                                >
                                  <Redo2 className="h-4 w-4" />
                                </Button>
                              </SimpleTooltip>
                              <Divider orientation="vertical" className="h-6 mx-1" />
                            </>
                          )}
                          {!isCreateMode && (
                            <DiffToggleButton
                              mode={mode}
                              active={false}
                              disabled={!hasUnsavedChanges}
                              onToggle={handleDiffToggle}
                            />
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              body={(
                <div className="relative h-full min-h-0 overflow-hidden">
                  {hasUnsavedChanges && (
                    <span className="absolute top-2 right-4 z-10 rounded-full bg-destructive/15 px-2 py-0.5 text-badge text-destructive/60 pointer-events-none select-none">
                      수정됨
                    </span>
                  )}
                  <div
                    className={cn(
                      'h-full min-h-0',
                      isCompareSurface && 'absolute inset-0 opacity-0 pointer-events-none'
                    )}
                  >
                    {contentBody}
                  </div>
                  {isCompareSurface ? (
                    <div className="absolute inset-0">
                      {surfaceMode === 'conflict' ? conflictDiffViewerNode : diffViewerNode}
                    </div>
                  ) : null}
                </div>
              )}
               footer={surfaceMode === 'edit' ? inlineComposer ?? undefined : undefined}
             />
          ) : (
            contentBody
          );
        })()}
      </PageTemplate>

      <TemplatePickerDialog
        open={isTemplatePickerOpen}
        onOpenChange={handleTemplatePickerClose}
        templates={referenceTemplates}
        title="이 문서로 만들어진 템플릿"
        description="기존 템플릿을 미리 보거나, 현재 문서를 기준으로 새 AI 템플릿을 생성할 수 있습니다."
        confirmLabel="AI 템플릿 작성"
        onSelectTemplate={handleTemplateSelected}
        onConfirm={handleAiConvertRequested}
        onCancel={() => toggleTemplateMode(false)}
      />

      <TemplatePickerDialog
        open={isViewerTemplatePickerOpen}
        onOpenChange={(open) => { if (!open) closeViewerTemplatePicker(); }}
        templates={viewerReferenceTemplates}
        title="이 문서로 만들어진 템플릿"
        description="기존 템플릿을 읽기 전용으로 확인하거나, 현재 문서를 참조한 새 템플릿을 만들 수 있습니다."
        confirmLabel="새 템플릿 생성"
        onSelectTemplate={openViewerTemplatePreview}
        onConfirm={createReferencedTemplate}
        onCancel={closeViewerTemplatePicker}
      />

      <TemplatePreviewDialog
        template={previewTemplate}
        onClose={returnFromPreviewToPicker}
      />

      {/* 이미지 미리보기 모달 (사이드카용) */}
      <ImagePreviewDialog
        open={imagePreview !== null}
        onOpenChange={(open) => { if (!open) setImagePreview(null); }}
        src={imagePreview?.src ?? ''}
        alt={imagePreview?.alt}
      />

      {/* 이미지 라이트박스 (뷰어 본문 이미지 클릭용 — 바로 전체화면) */}
      <ImageLightbox
        open={lightboxImage !== null}
        onClose={() => setLightboxImage(null)}
        src={lightboxImage?.src ?? ''}
        alt={lightboxImage?.alt}
      />
    </main>
  );
}
