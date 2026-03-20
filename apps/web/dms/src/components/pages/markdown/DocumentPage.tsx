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
import { extractMarkdownLinks } from '@/lib/utils/extractMarkdownLinks';
import { useBodyLinks } from '@/hooks/useBodyLinks';
import { useRequestLifecycle } from '@/hooks/useRequestLifecycle';
import { useOpenDocumentTab } from '@/hooks/useOpenDocumentTab';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import { resolveDocPath } from '@/lib/utils/linkUtils';
import type { DocumentMetadata, SourceFileMeta } from '@/types';
import {
  type InlineSummaryFileItem,
} from '@/components/common/assistant/reference/Picker';
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import type { TemplateItem } from '@/types/template';
import { cn } from '@/lib/utils';
import { Divider } from '@/components/ui/divider';
import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { LoadingState } from '@/components/common/StateDisplay';
import { SplitDiffViewer } from '@/components/common/diff/SplitDiffViewer';
import { DocumentSidecar } from './_components/DocumentSidecar';
import { DiffTargetToggle, DiffToggleButton, PreviewToggleButton, TemplateSaveControls } from './_components/EditorModeControls';
import { InlineComposerPanel, DocumentPageContent } from './_components/DocumentPagePanels';
import { NewDocumentLauncher } from './_components/NewDocumentLauncher';
import { useDocumentPageComposeActions } from './useDocumentPageComposeActions';
import { resolveTitlePathRecommendation, type RecommendationStatus } from '@/lib/utils/titlePathRecommendation';
import {
  buildDocumentSidecarDiffSnapshot,
  buildDocumentSidecarMetadata,
  buildMarkdownToc,
  deriveDefaultTemplateName,
  getDocumentFilePath,
  stringifyDocumentSidecarDiffSnapshot,
  type DocumentSidecarDiffSnapshot,
} from './documentPageUtils';

type PageMode = 'viewer' | 'editor' | 'create';
type EditorSurfaceMode = 'edit' | 'preview' | 'diff';
type DiffTarget = 'content' | 'metadata';

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
  const openDocumentTab = useOpenDocumentTab();

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
    flushPendingMetadata,
    setCurrentFilePath,
    refreshFileMetadata,
  } = useEditorStore();

  const [mode, setMode] = useState<PageMode>('viewer');
  const [inlineInstruction, setInlineInstruction] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [createPath, setCreatePath] = useState('drafts/new-doc.md');
  const [displayCreatePath, setDisplayCreatePath] = useState('');
  const [displaySuggestedTitle, setDisplaySuggestedTitle] = useState('');
  const [pendingSuggestedInfoTitle, setPendingSuggestedInfoTitle] = useState<string | null>(null);
  const [pendingSuggestedInfoPath, setPendingSuggestedInfoPath] = useState<string | null>(null);
  const [pendingInfoPathValidationMessage, setPendingInfoPathValidationMessage] = useState('');
  const [titleRecommendationStatus, setTitleRecommendationStatus] = useState<RecommendationStatus>('idle');
  const [pathRecommendationStatus, setPathRecommendationStatus] = useState<RecommendationStatus>('idle');
  const [pathValidationMessage, setPathValidationMessage] = useState('');
  const [, setIsRecommendingPath] = useState(false);
  const [inlineTemplate, setInlineTemplate] = useState<TemplateItem | null>(null);
  const [inlineSummaryFiles, setInlineSummaryFiles] = useState<InlineSummaryFileItem[]>([]);
  const [inlineRelevanceWarnings, setInlineRelevanceWarnings] = useState<string[]>([]);
  const [surfaceMode, setSurfaceMode] = useState<EditorSurfaceMode>('edit');
  const [diffTarget, setDiffTarget] = useState<DiffTarget>('content');
  const [diffDraftContent, setDiffDraftContent] = useState<string | null>(null);
  const [diffMetadataSnapshotText, setDiffMetadataSnapshotText] = useState<string | null>(null);
  const [saveAsTemplateOnly, setSaveAsTemplateOnly] = useState(false);
  const [templateSaveDraft, setTemplateSaveDraft] = useState<TemplateSaveDraft>({
    name: '',
    description: '',
    scope: 'personal',
  });
  const editorRef = useRef<EditorRef | null>(null);
  const [liveEditorContent, setLiveEditorContent] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  // AI 작성에 사용된 참조 파일/템플릿 추적
  const [usedSummaryFileIds, setUsedSummaryFileIds] = useState<Set<string>>(new Set());
  const [isTemplateUsed, setIsTemplateUsed] = useState(false);
  const [isRestoringReferences, setIsRestoringReferences] = useState(false);

  // 참조 파일/템플릿 소프트 삭제 (되돌리기 가능)
  const [pendingDeletedFileIds, setPendingDeletedFileIds] = useState<Set<string>>(new Set());
  const [isTemplatePendingDelete, setIsTemplatePendingDelete] = useState(false);

  // 참조 파일 복원 실패 추적 (재시도용)
  const [failedRestoreFiles, setFailedRestoreFiles] = useState<Array<{ id: string; name: string; path: string }>>([]);
  const [isRetryingRestore, setIsRetryingRestore] = useState(false);

  // AI 자동 추천 상태 (compose 후 sidecar에 주입)
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
  const [originalMetaSnapshot, setOriginalMetaSnapshot] = useState<DocumentSidecarDiffSnapshot | null>(null);

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
    if (mode !== 'create') {
      setMode(isEditing ? 'editor' : 'viewer');
    }
  }, [isEditing, mode]);

  useEffect(() => {
    if (mode === 'viewer') {
      setSurfaceMode('edit');
      setSaveAsTemplateOnly(false);
    }
  }, [mode]);

  // 뷰어 모드에서 documentMetadata 로드 시 diff 스냅샷 초기화
  // (snapshot이 null이면 파일명으로 폴백되어 제목 하이라이트 오작동)
  useEffect(() => {
    if (mode === 'viewer' && documentMetadata && !originalMetaSnapshot) {
      setOriginalMetaSnapshot(buildDocumentSidecarDiffSnapshot(documentMetadata));
    }
  }, [mode, documentMetadata, originalMetaSnapshot]);

  useEffect(() => {
    if (mode !== 'editor' && mode !== 'create') {
      setSurfaceMode('edit');
      setDiffTarget('content');
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
    setDisplayCreatePath('');
    setDisplaySuggestedTitle('');
    setPendingSuggestedInfoTitle(null);
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');
    setTitleRecommendationStatus('idle');
    setPathRecommendationStatus('idle');
    setPathValidationMessage('');
    setOriginalMetaSnapshot(buildDocumentSidecarDiffSnapshot(null));
    setSurfaceMode('edit');
    setDiffTarget('content');

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
      setDisplayCreatePath('');
      setDisplaySuggestedTitle('');
      setPendingSuggestedInfoTitle(null);
      setPendingSuggestedInfoPath(null);
      setPendingInfoPathValidationMessage('');
      setTitleRecommendationStatus('idle');
      setPathRecommendationStatus('idle');
      setPathValidationMessage('');
    }
  }, [filePath, isCreateMode, loadFile, setIsEditing]);

  // AI 요약 자동 실행: 진입 시 pending 파일을 소비하고 본문 기반으로 compose 호출
  useEffect(() => {
    if (createEntryType !== 'ai-summary' || aiSummaryConsumedRef.current) return;
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
            setTitleRecommendationStatus('loading');
            setPathRecommendationStatus('loading');
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
              setDisplaySuggestedTitle('');
              setDisplayCreatePath('');
              setPendingSuggestedInfoTitle(null);
              setPendingSuggestedInfoPath(null);
              setPendingInfoPathValidationMessage('');
              setPathValidationMessage('');
              setTitleRecommendationStatus('error');
              setPathRecommendationStatus('error');
            } else {
              setDisplaySuggestedTitle('');
              setDisplayCreatePath('');
              setPendingSuggestedInfoTitle(null);
              setPendingSuggestedInfoPath(null);
              setPendingInfoPathValidationMessage('');
              setPathValidationMessage('');
              setTitleRecommendationStatus('error');
              setPathRecommendationStatus('error');
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

  const currentDraftContent = editorHandlers?.getMarkdown?.()
    ?? editorRef.current?.getMarkdown()
    ?? liveEditorContent
    ?? content;
  const getCurrentDraftContent = useCallback(() => (
    editorHandlers?.getMarkdown?.()
    ?? editorRef.current?.getMarkdown()
    ?? liveEditorContent
    ?? content
  ), [content, editorHandlers, liveEditorContent]);
  const liveBodyLinks = useBodyLinks(currentDraftContent);
  const currentSidecarFilePath = isCreateMode ? displayCreatePath : (pendingFileMove ?? filePath ?? '');
  const originalInfoDocumentTitle = isCreateMode
    ? ''
    : (originalMetaSnapshot?.title || filePath?.split('/').pop()?.replace(/\.md$/, '') || '');
  const originalInfoFilePath = isCreateMode ? '' : (filePath ?? '');

  const applySuggestedInfoTitle = useCallback((title: string) => {
    setDisplaySuggestedTitle(title);
    setLocalDocumentMetadata({ title });
  }, [setLocalDocumentMetadata]);

  const applySuggestedInfoPath = useCallback((path: string) => {
    setDisplayCreatePath(path);
    setCreatePath(path);
  }, [setCreatePath]);

  const consumeTitlePathRecommendation = useCallback((
    resolved: ReturnType<typeof resolveTitlePathRecommendation>,
    mode: 'suggest' | 'auto',
  ) => {
    setTitleRecommendationStatus(resolved.titleStatus);
    setPathRecommendationStatus(resolved.pathStatus);

    if (mode === 'auto') {
      setPendingSuggestedInfoTitle(null);
      setPendingSuggestedInfoPath(null);
      setPendingInfoPathValidationMessage('');
      setPathValidationMessage(resolved.pathValidationMessage ?? '');
      if (resolved.title) {
        applySuggestedInfoTitle(resolved.title);
      }
      if (resolved.path) {
        applySuggestedInfoPath(resolved.path);
      }
      return;
    }

    setPathValidationMessage('');
    setPendingSuggestedInfoTitle(resolved.title || null);
    setPendingSuggestedInfoPath(resolved.path || null);
    setPendingInfoPathValidationMessage(resolved.path ? '' : (resolved.pathValidationMessage ?? ''));
  }, [applySuggestedInfoPath, applySuggestedInfoTitle]);

  const requestInfoRecommendation = useCallback(async () => {
    const draftContent = getCurrentDraftContent();
    if (!draftContent.trim()) return;

    setTitleRecommendationStatus('loading');
    setPathRecommendationStatus('loading');
    setPendingSuggestedInfoTitle(null);
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');

    try {
      const res = await docAssistApi.recommendTitleAndPath({ currentContent: draftContent });
      if (res.success && res.data) {
        const resolved = resolveTitlePathRecommendation(res.data, {
          fallbackContent: draftContent,
        });
        consumeTitlePathRecommendation(resolved, 'suggest');
      } else {
        setTitleRecommendationStatus('error');
        setPathRecommendationStatus('error');
      }
    } catch {
      setTitleRecommendationStatus('error');
      setPathRecommendationStatus('error');
    }
  }, [consumeTitlePathRecommendation, getCurrentDraftContent]);

  const handleAcceptSuggestedInfoTitle = useCallback(() => {
    if (!pendingSuggestedInfoTitle) return;
    applySuggestedInfoTitle(pendingSuggestedInfoTitle);
    setPendingSuggestedInfoTitle(null);
  }, [applySuggestedInfoTitle, pendingSuggestedInfoTitle]);

  const handleDismissSuggestedInfoTitle = useCallback(() => {
    setPendingSuggestedInfoTitle(null);
  }, []);

  const handleAcceptSuggestedInfoPath = useCallback(() => {
    if (!pendingSuggestedInfoPath) return;
    if (isCreateMode) {
      applySuggestedInfoPath(pendingSuggestedInfoPath);
    } else {
      if (filePath && pendingSuggestedInfoPath !== filePath) {
        setPendingFileMove(pendingSuggestedInfoPath);
        setHasUnsavedChanges(true);
      }
    }
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');
  }, [applySuggestedInfoPath, filePath, isCreateMode, pendingSuggestedInfoPath, setHasUnsavedChanges]);

  const handleDismissSuggestedInfoPath = useCallback(() => {
    setPendingSuggestedInfoPath(null);
    setPendingInfoPathValidationMessage('');
  }, []);

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
    setOriginalMetaSnapshot(buildDocumentSidecarDiffSnapshot(documentMetadata));
    setMode('editor');
    setIsEditing(true);
    setSurfaceMode('edit');
    setDiffTarget('content');

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
        type: f.type,
        size: f.size,
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
              const res = await fetch(
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
        visibility: 'personal',
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
  }, [setIsEditing, documentMetadata]);

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

  // 참조 파일/템플릿을 sidecar에서도 제거하는 헬퍼
  const removeReferenceFromSidecar = useCallback((name: string) => {
    const currentFiles = documentMetadata?.sourceFiles ?? [];
    setLocalDocumentMetadata({
      sourceFiles: currentFiles.filter((f) => f.name !== name),
    });
  }, [documentMetadata, setLocalDocumentMetadata]);

  const handleSave = useCallback(async () => {
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
      // sidecar에서도 제거
      const currentFiles = documentMetadata?.sourceFiles ?? [];
      const nameSet = new Set(deletedNames);
      setLocalDocumentMetadata({
        sourceFiles: currentFiles.filter((f) => !nameSet.has(f.name)),
      });
      setPendingDeletedFileIds(new Set());
    }
    if (isTemplatePendingDelete && inlineTemplate) {
      removeReferenceFromSidecar(inlineTemplate.name);
      setInlineTemplate(null);
      setIsTemplateUsed(false);
      setIsTemplatePendingDelete(false);
    }

    // 저장 직전 본문 링크를 sidecar에 영속화
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

        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch(uploadUrl, { method: 'POST', body: formData });
          const data = await res.json();
          if (res.ok && data.success) {
            const idx = updatedFiles.findIndex((f) => f.path === tempPath);
            if (idx >= 0) {
              updatedFiles[idx] = { ...updatedFiles[idx], path: data.path, status: 'published' };
            }
          }
        } catch {
          // 업로드 실패 시 해당 파일은 pending 상태로 유지
        }
        pending.delete(tempPath);
      }
      setLocalDocumentMetadata({ sourceFiles: updatedFiles });
    }

    await editorHandlers?.save();

    // 저장 성공 후 diff 스냅샷을 현재 메타데이터로 갱신 (하이라이트 초기화)
    setOriginalMetaSnapshot(buildDocumentSidecarDiffSnapshot(documentMetadata));

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
  }, [pendingDeletedFileIds, inlineSummaryFiles, isTemplatePendingDelete, inlineTemplate, removeReferenceFromSidecar, documentMetadata, setLocalDocumentMetadata, editorHandlers, content, pendingFileMove, filePath, tabId, updateTab, setCurrentFilePath, refreshFileMetadata, refreshFileTree]);

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
  }, [editorHandlers, setIsEditing]);

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
    options?: { signal?: AbortSignal; isRequestActive?: () => boolean },
  ): Promise<MetadataRecommendationResult | null> => {
    if (!editorContent.trim()) return null;

    setIsAutoSuggestingTags(true);
    setIsAutoSuggestingSummary(true);

    const tagPromise = docAssistApi.compose({
      instruction: '다음 문서를 대표하는 핵심 태그를 5개 이내로 추출하세요. 태그만 쉼표로 구분하여 반환하세요. 다른 설명 없이 태그만 출력하세요.',
      currentContent: editorContent,
    }, { signal: options?.signal }).finally(() => {
      setIsAutoSuggestingTags(false);
    });

    const summaryPromise = docAssistApi.compose({
      instruction: '다음 문서의 핵심 내용을 2~3문장으로 요약하세요. 요약문만 출력하세요.',
      currentContent: editorContent,
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

  const handleFileMove = useCallback((newPath: string) => {
    if (!filePath || newPath === filePath) return;
    setPendingFileMove(newPath);
    setHasUnsavedChanges(true);
  }, [filePath, setHasUnsavedChanges]);

  const handleRetry = useCallback(() => {
    if (filePath) loadFile(filePath);
  }, [filePath, loadFile]);

  // AI 작성 후 사용된 참조 파일/템플릿을 sidecar sourceFiles에 동기화
  const handleSyncReferencesToSidecar = useCallback((
    files: SourceFileMeta[],
    rawFiles?: Map<string, File>,
  ) => {
    const currentFiles = documentMetadata?.sourceFiles ?? [];
    const existingKeys = new Set(currentFiles.map((f) => f.name));

    const newFiles = files.filter((f) => !existingKeys.has(f.name));
    if (newFiles.length === 0) return;

    setLocalDocumentMetadata({ sourceFiles: [...currentFiles, ...newFiles] });
    setHasUnsavedChanges(true);

    // 사용된 파일 ID 추적
    for (const f of files) {
      if (f.origin === 'reference') {
        // inlineSummaryFiles에서 이름으로 매칭하여 id 찾기
        const matched = inlineSummaryFiles.find((sf) => sf.name === f.name);
        if (matched) {
          setUsedSummaryFileIds((prev) => new Set(prev).add(matched.id));
        }
      } else if (f.origin === 'template') {
        setIsTemplateUsed(true);
      }
    }

    // 참조 파일의 File 객체를 pending에 등록 (저장 시 업로드)
    if (rawFiles) {
      for (const [tempPath, file] of rawFiles.entries()) {
        pendingAttachmentsRef.current.set(tempPath, file);
      }
    }
  }, [documentMetadata, inlineSummaryFiles, setLocalDocumentMetadata, setHasUnsavedChanges]);

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
      onComposeComplete: useCallback(async (
        generatedContent: string,
        requestToken: number,
        signal: AbortSignal,
        context?: { suggestedPath?: string },
      ) => {
        const isRequestActive = () => composeRequestLifecycle.isRequestActive(requestToken);
        if (isCreateMode) {
          // 새문서: 태그/요약 제안 + 문서명/경로 제안
          setTitleRecommendationStatus('loading');
          setPathRecommendationStatus('loading');
          const [metadataResult, titlePathResult] = await Promise.allSettled([
            autoRecommendMetadata(generatedContent, { signal, isRequestActive }),
            docAssistApi.recommendTitleAndPath({ currentContent: generatedContent }, { signal }),
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
              setDisplaySuggestedTitle('');
              setDisplayCreatePath('');
              setPendingSuggestedInfoTitle(null);
              setPendingSuggestedInfoPath(null);
              setPendingInfoPathValidationMessage('');
              setPathValidationMessage('');
              setTitleRecommendationStatus('error');
              setPathRecommendationStatus('error');
            } else {
              setDisplaySuggestedTitle('');
              setDisplayCreatePath('');
              setPendingSuggestedInfoTitle(null);
              setPendingSuggestedInfoPath(null);
              setPendingInfoPathValidationMessage('');
              setPathValidationMessage('');
              setTitleRecommendationStatus('error');
              setPathRecommendationStatus('error');
            }
          } else if (context?.suggestedPath) {
            setCreatePath(context.suggestedPath);
            setDisplaySuggestedTitle('');
            setDisplayCreatePath('');
            setPendingSuggestedInfoTitle(null);
            setPendingSuggestedInfoPath(null);
            setPendingInfoPathValidationMessage('');
            setPathValidationMessage('');
            setTitleRecommendationStatus('error');
            setPathRecommendationStatus('error');
          } else {
            setDisplaySuggestedTitle('');
            setDisplayCreatePath('');
            setPendingSuggestedInfoTitle(null);
            setPendingSuggestedInfoPath(null);
            setPendingInfoPathValidationMessage('');
            setPathValidationMessage('');
            setTitleRecommendationStatus('error');
            setPathRecommendationStatus('error');
          }
        } else {
          // 기존문서: 태그/요약 제안만
          const recommendation = await autoRecommendMetadata(generatedContent, { signal, isRequestActive });
          if (!isRequestActive() || signal.aborted) return;
          applyMetadataRecommendation(recommendation, 'suggest');
        }
      }, [applyMetadataRecommendation, autoRecommendMetadata, composeRequestLifecycle, consumeTitlePathRecommendation, isCreateMode, setCreatePath]),
    },
  });

  const isEditorMode = mode === 'editor' || mode === 'create';
  const currentMetadataSnapshot = useMemo(
    () => buildDocumentSidecarDiffSnapshot(documentMetadata),
    [documentMetadata]
  );
  const metadataDiffOriginalText = useMemo(
    () => stringifyDocumentSidecarDiffSnapshot(originalMetaSnapshot ?? buildDocumentSidecarDiffSnapshot(null)),
    [originalMetaSnapshot]
  );
  const metadataDiffCurrentText = useMemo(
    () => stringifyDocumentSidecarDiffSnapshot(currentMetadataSnapshot),
    [currentMetadataSnapshot]
  );
  const sidecarInfoLoading = isCreateMode && isComposing;
  const sidecarTagsLoading = isComposing || isAutoSuggestingTags;
  const sidecarSummaryLoading = isComposing || isAutoSuggestingSummary;
  const diffViewerNode = surfaceMode === 'diff' ? (
    <SplitDiffViewer
      originalText={diffTarget === 'content' ? content : metadataDiffOriginalText}
      currentText={diffTarget === 'content'
        ? (diffDraftContent ?? currentDraftContent)
        : (diffMetadataSnapshotText ?? metadataDiffCurrentText)}
      originalTitle="이전"
      currentTitle="현재"
      language={diffTarget === 'content' ? 'markdown' : 'json'}
      className="h-full"
    />
  ) : null;

  const handleDiffToggle = useCallback(() => {
    if (surfaceMode === 'diff') {
      setSurfaceMode('edit');
      setDiffTarget('content');
      return;
    }

    const draftContent = getCurrentDraftContent();
    setLiveEditorContent(draftContent);
    setDiffDraftContent(draftContent);
    setDiffMetadataSnapshotText(metadataDiffCurrentText);
    setSurfaceMode('diff');
    setDiffTarget('content');
  }, [getCurrentDraftContent, metadataDiffCurrentText, surfaceMode]);

  // 참조 파일 해제: 사용된 파일→confirm→소프트삭제, 미사용→즉시삭제
  const handleRemoveSummaryFile = useCallback(async (id: string) => {
    const file = inlineSummaryFiles.find((f) => f.id === id);
    if (!file) return;

    const isUsed = usedSummaryFileIds.has(id);
    if (isUsed) {
      const confirmed = await confirm({
        title: '참조 파일 해제',
        description: `'${file.name}' 파일은 문서 작성에 사용되었습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?`,
        confirmText: '해제',
        cancelText: '취소',
      });
      if (!confirmed) return;
      // 소프트 삭제 (되돌리기 가능)
      setPendingDeletedFileIds((prev) => new Set(prev).add(id));
    } else {
      // 미사용 항목 즉시 삭제
      setInlineSummaryFiles((prev) => prev.filter((item) => item.id !== id));
    }
  }, [inlineSummaryFiles, usedSummaryFileIds, confirm]);

  // 참조 파일 복원 (소프트 삭제 취소)
  const handleRestoreSummaryFile = useCallback((id: string) => {
    setPendingDeletedFileIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // 템플릿 해제: 사용된→confirm→소프트삭제, 미사용→즉시삭제
  const handleRemoveTemplate = useCallback(async () => {
    if (isTemplateUsed && inlineTemplate) {
      const confirmed = await confirm({
        title: '템플릿 해제',
        description: `'${inlineTemplate.name}' 템플릿은 문서 작성에 사용되었습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?`,
        confirmText: '해제',
        cancelText: '취소',
      });
      if (!confirmed) return;
      // 소프트 삭제 (되돌리기 가능)
      setIsTemplatePendingDelete(true);
    } else {
      // 미사용 항목 즉시 삭제
      setInlineTemplate(null);
    }
  }, [isTemplateUsed, inlineTemplate, confirm]);

  // 템플릿 복원 (소프트 삭제 취소)
  const handleRestoreTemplate = useCallback(() => {
    setIsTemplatePendingDelete(false);
  }, []);

  // 참조 파일 복원 재시도
  const handleRetryRestoreFiles = useCallback(async () => {
    if (failedRestoreFiles.length === 0) return;
    setIsRetryingRestore(true);
    const stillFailed: Array<{ id: string; name: string; path: string }> = [];
    const fetched: Array<{ name: string; textContent: string }> = [];

    await Promise.all(
      failedRestoreFiles.map(async (f) => {
        if (!f.path || f.path.startsWith('__pending__')) {
          stillFailed.push(f);
          return;
        }
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(
            `/api/file/serve-attachment?path=${encodeURIComponent(f.path)}`,
            { signal: controller.signal },
          );
          clearTimeout(timeout);
          if (res.ok) {
            const text = await res.text();
            if (text.trim().length > 0) {
              fetched.push({ name: f.name, textContent: text.slice(0, 12000) });
              return;
            }
          }
          stillFailed.push(f);
        } catch {
          stillFailed.push(f);
        }
      }),
    );

    if (fetched.length > 0) {
      setInlineSummaryFiles((prev) =>
        prev.map((item) => {
          const match = fetched.find((c) => c.name === item.name);
          return match ? { ...item, textContent: match.textContent } : item;
        }),
      );
    }

    setFailedRestoreFiles(stillFailed);
    // 경고 메시지 갱신
    setInlineRelevanceWarnings((prev) => {
      const filtered = prev.filter((w) => !w.startsWith('참조 파일 복원 실패:'));
      if (stillFailed.length > 0) {
        filtered.push(
          `참조 파일 복원 실패: ${stillFailed.map((f) => f.name).join(', ')}. AI 작성 시 해당 파일 내용이 반영되지 않을 수 있습니다.`,
        );
      }
      return filtered;
    });
    setIsRetryingRestore(false);
  }, [failedRestoreFiles]);

  // 전체 해제: 사용된 항목→confirm→소프트삭제, 미사용→즉시삭제
  const handleClearAll = useCallback(async () => {
    const hasUsed = usedSummaryFileIds.size > 0 || isTemplateUsed;
    if (hasUsed) {
      const confirmed = await confirm({
        title: '전체 컨텍스트 해제',
        description: '사용된 참조 파일/템플릿이 포함되어 있습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?',
        confirmText: '전체 해제',
        cancelText: '취소',
      });
      if (!confirmed) return;
    }

    // 사용된 항목 → 소프트 삭제
    const usedFileIds = inlineSummaryFiles
      .filter((f) => usedSummaryFileIds.has(f.id))
      .map((f) => f.id);
    if (usedFileIds.length > 0) {
      setPendingDeletedFileIds((prev) => {
        const next = new Set(prev);
        for (const id of usedFileIds) next.add(id);
        return next;
      });
    }
    if (isTemplateUsed && inlineTemplate) {
      setIsTemplatePendingDelete(true);
    }

    // 미사용 항목 → 즉시 삭제
    setInlineSummaryFiles((prev) => prev.filter((f) => usedSummaryFileIds.has(f.id)));
    if (!isTemplateUsed) {
      setInlineTemplate(null);
    }
    setInlineRelevanceWarnings([]);
  }, [usedSummaryFileIds, isTemplateUsed, inlineTemplate, inlineSummaryFiles, confirm]);

  // 소프트 삭제된 참조 파일/템플릿의 sidecar 키 (사이드카 첨부 섹션 삭제 표시 연동)
  const deletedReferenceKeys = useMemo(() => {
    if (pendingDeletedFileIds.size === 0 && !isTemplatePendingDelete) return undefined;
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
    return keys.size > 0 ? keys : undefined;
  }, [pendingDeletedFileIds, isTemplatePendingDelete, documentMetadata?.sourceFiles, inlineSummaryFiles]);

  const contentSurfaceClassName = DOC_PAGE_SURFACE_PRESETS.document;
  const headerEditorRightSlot = (
    <TemplateSaveControls
      mode={mode}
      saveAsTemplateOnly={saveAsTemplateOnly}
      setSaveAsTemplateOnly={setSaveAsTemplateOnly}
    />
  );



  const setAiSummaryPending = useNewDocStore((s) => s.setAiSummaryPending);

  const handleLauncherNewDoc = useCallback(() => {
    if (!tabId) return;
    updateTab(tabId, { path: '/doc/new-doc', title: '새 문서' });
  }, [tabId, updateTab]);

  const handleLauncherTemplate = useCallback(() => {
    if (!tabId) return;
    updateTab(tabId, { path: '/doc/new-template', title: '새 템플릿' });
  }, [tabId, updateTab]);

  const handleLauncherAiSummary = useCallback((files: InlineSummaryFileItem[]) => {
    if (!tabId || files.length === 0) return;
    setAiSummaryPending({ summaryFiles: files });
    setIsComposing(true);
    updateTab(tabId, { path: '/doc/new-ai-summary', title: 'AI 요약' });
  }, [tabId, updateTab, setAiSummaryPending]);

  const handleLauncherClose = useCallback(() => {
    if (!tabId) return;
    closeTab(tabId);
  }, [tabId, closeTab]);

  // 런처 페이지: /doc/new
  if (createEntryType === 'launcher') {
    return (
      <NewDocumentLauncher
        onSelectNewDoc={handleLauncherNewDoc}
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
        breadcrumbLastSegmentLabel={documentMetadata?.title?.trim() || undefined}
        contentOrientation="portrait"
        contentMaxWidth={surfaceMode === 'diff' ? null : undefined}
        contentSurfaceClassName={contentSurfaceClassName}
        sidecarMode={surfaceMode === 'diff' ? 'hidden' : undefined}
        sidecarContent={(
          <DocumentSidecar
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
            externalSuggestedTagsLoading={sidecarTagsLoading}
            onExternalSuggestedTagsConsumed={clearPendingSuggestedTags}
            externalAiSuggestion={pendingAiSuggestion}
            externalAiSuggestionLoading={sidecarSummaryLoading}
            onExternalAiSuggestionConsumed={clearPendingAiSuggestion}
            deletedReferenceKeys={deletedReferenceKeys}
            onImmediateFlush={flushPendingMetadata}
          />
        )}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={isCreateMode ? undefined : handleDelete}
        saving={isSaving}
        saveDisabled={!hasUnsavedChanges}
        isPreview={surfaceMode !== 'edit'}
        headerEditorRightSlot={headerEditorRightSlot}
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
              isPreview={surfaceMode === 'preview'}
              isComposing={isComposing}
              saveAsTemplateOnly={saveAsTemplateOnly}
              templateSaveDraft={templateSaveDraft}
              setSaveAsTemplateOnly={setSaveAsTemplateOnly}
              onEditorContentChange={handleEditorContentChange}
              onLinkClick={handleViewerLinkClick}
              onImageClick={handleViewerImageClick}
            />
          );
          const inlineComposer = (
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
            />
          );

          return isEditorMode ? (
            <SectionedShell
              variant="editor_with_footer"
              toolbar={(
                <div className="flex w-full items-center gap-1">
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
                  {(hasUnsavedChanges || surfaceMode === 'diff') && (
                    <>
                      <div className="flex-1" />
                      {surfaceMode === 'edit' && (
                        <>
                          <SimpleTooltip content="되돌리기 (Ctrl+Z)">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editorRef.current?.undo()}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </SimpleTooltip>
                          <SimpleTooltip content="다시 적용 (Ctrl+Shift+Z)">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editorRef.current?.redo()}
                            >
                              <Redo2 className="h-4 w-4" />
                            </Button>
                          </SimpleTooltip>
                          <Divider orientation="vertical" className="h-6 mx-1" />
                        </>
                      )}
                      {surfaceMode === 'diff' && (
                        <DiffTargetToggle
                          value={diffTarget}
                          onChange={setDiffTarget}
                        />
                      )}
                      <DiffToggleButton
                        mode={mode}
                        active={surfaceMode === 'diff'}
                        onToggle={handleDiffToggle}
                      />
                    </>
                  )}
                </div>
              )}
              body={(
                <div className="relative h-full min-h-0 overflow-hidden">
                  {hasUnsavedChanges && (
                    <span className="absolute top-2 right-4 z-10 rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive/60 pointer-events-none select-none">
                      수정됨
                    </span>
                  )}
                  <div
                    className={cn(
                      'h-full min-h-0',
                      surfaceMode === 'diff' && 'absolute inset-0 opacity-0 pointer-events-none'
                    )}
                  >
                    {contentBody}
                  </div>
                  {surfaceMode === 'diff' ? (
                    <div className="absolute inset-0">
                      {diffViewerNode}
                    </div>
                  ) : null}
                </div>
              )}
              footer={surfaceMode === 'edit' ? inlineComposer : undefined}
            />
          ) : (
            contentBody
          );
        })()}
      </PageTemplate>

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
