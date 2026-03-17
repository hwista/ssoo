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
import { useOpenDocumentTab } from '@/hooks/useOpenDocumentTab';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import { resolveWikiDocPath } from './_components/editor/block-editor/blockEditorCommands';
import type { DocumentMetadata, SourceFileMeta } from '@/types';
import {
  type InlineSummaryFileItem,
} from '@/components/common/assistant/reference/Picker';
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog';
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
  const [liveEditorContent, setLiveEditorContent] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);

  // AI 작성에 사용된 참조 파일/템플릿 추적
  const [usedSummaryFileIds, setUsedSummaryFileIds] = useState<Set<string>>(new Set());
  const [isTemplateUsed, setIsTemplateUsed] = useState(false);

  // 첨부파일 deferred upload: 파일 선택 시 File 객체를 저장, 문서 저장 시 업로드
  const pendingAttachmentsRef = useRef<Map<string, File>>(new Map());

  const handleEditorContentChange = useCallback((editorContent: string) => {
    setLiveEditorContent(editorContent);
  }, []);

  /** 편집 진입 시 메타데이터 스냅샷 (변경 하이라이트용) */
  const [originalMetaSnapshot, setOriginalMetaSnapshot] = useState<{
    tags: string[];
    summary: string;
    sourceLinks: string[];
    comments: string[];
    attachmentPaths: string[];
  } | null>(null);

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
    setOriginalMetaSnapshot({ tags: [], summary: '', sourceLinks: [], comments: [], attachmentPaths: [] });

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

  const liveBodyLinks = useBodyLinks(liveEditorContent ?? content);

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
    setOriginalMetaSnapshot({
      tags: documentMetadata?.tags ?? [],
      summary: documentMetadata?.summary ?? '',
      sourceLinks: documentMetadata?.sourceLinks ?? [],
      comments: (documentMetadata?.comments ?? []).map((c) => c.id),
      attachmentPaths: (documentMetadata?.sourceFiles ?? []).map((a) => a.path || a.name),
    });
    setMode('editor');
    setIsEditing(true);

    // 기존 참조/템플릿을 Chips에 복원
    const sourceFiles = documentMetadata?.sourceFiles ?? [];
    const refFiles = sourceFiles.filter((f) => f.origin === 'reference');
    const templateFile = sourceFiles.find((f) => f.origin === 'template');

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

      // 서버에서 참조 파일 내용 비동기 복원
      void (async () => {
        const results = await Promise.all(
          refFiles.map(async (f) => {
            if (!f.path || f.path.startsWith('__pending__')) return null;
            try {
              const res = await fetch(`/api/file/serve-attachment?path=${encodeURIComponent(f.path)}`);
              if (res.ok) {
                const text = await res.text();
                return { name: f.name, textContent: text.slice(0, 12000) };
              }
            } catch { /* ignore fetch errors */ }
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
      })();
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

      // 서버에서 템플릿 내용 비동기 복원
      if (templateFile.path && !templateFile.path.startsWith('__pending__')) {
        void (async () => {
          try {
            const res = await fetch(`/api/file?path=${encodeURIComponent(templateFile.path!)}`);
            if (res.ok) {
              const data = await res.json();
              const tplContent = typeof data?.content === 'string' ? data.content : '';
              if (tplContent) {
                setInlineTemplate((prev) => prev ? { ...prev, content: tplContent } : prev);
              }
            }
          } catch { /* ignore */ }
        })();
      }
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
    const docPath = resolveWikiDocPath(url, filePath);
    if (docPath) {
      openDocumentTab({ path: docPath });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [filePath, openDocumentTab]);

  const handleSave = useCallback(async () => {
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

    editorHandlers?.save();
  }, [editorHandlers, content, setLocalDocumentMetadata, documentMetadata]);

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
      onSyncReferencesToSidecar: handleSyncReferencesToSidecar,
    },
  });

  const isEditorMode = mode === 'editor' || mode === 'create';

  // 참조 파일/템플릿을 sidecar에서도 제거하는 헬퍼
  const removeReferenceFromSidecar = useCallback((name: string) => {
    const currentFiles = documentMetadata?.sourceFiles ?? [];
    setLocalDocumentMetadata({
      sourceFiles: currentFiles.filter((f) => f.name !== name),
    });
  }, [documentMetadata, setLocalDocumentMetadata]);

  // Chips에서 사용된 참조 파일 해제 시 컨펌
  const handleRemoveSummaryFileWithConfirm = useCallback(async (id: string) => {
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
      removeReferenceFromSidecar(file.name);
      setUsedSummaryFileIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }

    setInlineSummaryFiles((prev) => prev.filter((item) => item.id !== id));
  }, [inlineSummaryFiles, usedSummaryFileIds, confirm, removeReferenceFromSidecar]);

  // Chips에서 사용된 템플릿 해제 시 컨펌
  const handleRemoveTemplateWithConfirm = useCallback(async () => {
    if (isTemplateUsed && inlineTemplate) {
      const confirmed = await confirm({
        title: '템플릿 해제',
        description: `'${inlineTemplate.name}' 템플릿은 문서 작성에 사용되었습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?`,
        confirmText: '해제',
        cancelText: '취소',
      });
      if (!confirmed) return;
      removeReferenceFromSidecar(inlineTemplate.name);
      setIsTemplateUsed(false);
    }
    setInlineTemplate(null);
  }, [isTemplateUsed, inlineTemplate, confirm, removeReferenceFromSidecar]);

  // 전체 해제
  const handleClearAllWithConfirm = useCallback(async () => {
    const hasUsed = usedSummaryFileIds.size > 0 || isTemplateUsed;
    if (hasUsed) {
      const confirmed = await confirm({
        title: '전체 컨텍스트 해제',
        description: '사용된 참조 파일/템플릿이 포함되어 있습니다. 해제하면 참조 이력이 남지 않습니다. 계속하시겠습니까?',
        confirmText: '전체 해제',
        cancelText: '취소',
      });
      if (!confirmed) return;

      // sidecar에서 모든 참조/템플릿 제거
      const currentFiles = documentMetadata?.sourceFiles ?? [];
      setLocalDocumentMetadata({
        sourceFiles: currentFiles.filter((f) => f.origin !== 'reference' && f.origin !== 'template'),
      });
      setUsedSummaryFileIds(new Set());
      setIsTemplateUsed(false);
    }
    setInlineTemplate(null);
    setInlineSummaryFiles([]);
    setInlineRelevanceWarnings([]);
  }, [usedSummaryFileIds, isTemplateUsed, confirm, documentMetadata, setLocalDocumentMetadata]);

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
            bodyLinks={liveBodyLinks}
            onScrollToBodyLink={handleScrollToBodyLink}
            onOpenLink={handleOpenLink}
            currentFilePath={filePath}
            originalMetaSnapshot={originalMetaSnapshot}
            onOpenDocumentTab={(path) => openDocumentTab({ path })}
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
              onEditorContentChange={handleEditorContentChange}
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
              usedSummaryFileIds={usedSummaryFileIds}
              isTemplateUsed={isTemplateUsed}
              handleInlineTemplateSelect={handleInlineTemplateSelect}
              setInlineTemplate={setInlineTemplate}
              setInlineSummaryFiles={setInlineSummaryFiles}
              setInlineRelevanceWarnings={setInlineRelevanceWarnings}
              onRemoveSummaryFileWithConfirm={handleRemoveSummaryFileWithConfirm}
              onRemoveTemplateWithConfirm={handleRemoveTemplateWithConfirm}
              onClearAllWithConfirm={handleClearAllWithConfirm}
            />
          );

          return isEditorMode ? (
            <SectionedShell
              variant="editor_with_footer"
              toolbar={(
                <EditorToolbar
                  disabled={isPreview}
                  onCommand={(id) => editorRef.current?.applyCommand(id)}
                />
              )}
              body={(
                <div className="relative h-full min-h-0 overflow-hidden">
                  {hasUnsavedChanges && (
                    <span className="absolute top-2 right-4 z-10 rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive/60 pointer-events-none select-none">
                      수정됨
                    </span>
                  )}
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

      {/* 이미지 미리보기 모달 */}
      <ImagePreviewDialog
        open={imagePreview !== null}
        onOpenChange={(open) => { if (!open) setImagePreview(null); }}
        src={imagePreview?.src ?? ''}
        alt={imagePreview?.alt}
      />
    </main>
  );
}
