'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Content } from './Content';
import { type BlockEditorRef } from './block-editor/BlockEditor';
import { Toolbar, type ToolbarCommandId } from './Toolbar';
import { SectionedShell } from '@/components/templates/page-frame';
import { DOCUMENT_WIDTHS } from '@/components/templates/page-frame';
import { useEditorStore, useTabStore } from '@/stores';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import { useConfirmStore } from '@/stores/confirm.store';
import { useToast } from '@/lib/toast';
import type { TemplateScope } from '@/types/template';
import { useEditorPersistence } from './useEditorPersistence';
import { useEditorRuntimeEffects } from './useEditorRuntimeEffects';
import { useEditorInteractions } from './useEditorInteractions';
import { useEditorState } from './useEditorState';

// 문서 본문 최대 너비 (Viewer와 동일)
export const DOCUMENT_WIDTH = DOCUMENT_WIDTHS.portrait;

/**
 * Editor Props
 * Viewer 패턴과 동일한 구조
 */
export interface EditorProps {
  /** 추가 className */
  className?: string;
  /** 레이아웃 변형 */
  variant?: 'standalone' | 'embedded';
  /** 콘텐츠 표면 표시 여부 */
  showContentSurface?: boolean;
  /** 생성 모드에서 우선 사용할 파일 경로 */
  preferredCreatePath?: string;
  /** 새 문서용 자동 생성 파일명 */
  generatedFileName?: string;
  /** 생성 모드에서 실제 저장 경로가 결정될 때 */
  onCreatePathResolved?: (path: string) => void;
  /** 미리보기 모드 여부 */
  isPreview?: boolean;
  /** 툴바 표시 여부 (embedded 모드에서 외부 Shell toolbar 슬롯 주입 시 false) */
  showToolbar?: boolean;
  /** AI 삽입 대기 중 로딩 표시 여부 */
  isPendingInsertLoading?: boolean;
  /** 콘텐츠 변경 콜백 (실시간 동기화용) */
  onContentChange?: (content: string) => void;
  /** 위키 문서 대신 템플릿만 저장할지 여부 */
  templateSaveEnabled?: boolean;
  /** 템플릿 저장 메타데이터 */
  templateSaveDraft?: {
    name: string;
    description: string;
    scope: TemplateScope;
  };
  /** 템플릿 저장 완료 후 후처리 */
  onTemplateSaved?: () => void;
  /** undo/redo 가용성 변경 콜백 */
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export interface EditorRef {
  applyCommand: (id: ToolbarCommandId) => void;
  focus: () => void;
  /** 현재 에디터의 markdown 텍스트 반환 */
  getMarkdown: () => string;
  /** 업로드 대기 중인 이미지 (blob URL → File) */
  getPendingImages: () => Map<string, File>;
  /** 대기 중인 이미지 목록 초기화 (업로드 완료 후 호출) */
  clearPendingImages: () => void;
  undo: () => void;
  redo: () => void;
}

/**
 * Editor 컴포넌트
 * 
 * 문서 편집기
 * - markdown 문자열을 단일 소스로 유지
 * - 활성 블록은 raw markdown 편집, 비활성 블록은 html 렌더링
 * 
 * @example
 * ```tsx
 * <Editor className="h-full" />
 * ```
 */
export const Editor = React.forwardRef<EditorRef, EditorProps>(function Editor({
  className,
  variant = 'standalone',
  showContentSurface,
  preferredCreatePath,
  generatedFileName,
  onCreatePathResolved,
  isPreview = false,
  showToolbar = true,
  isPendingInsertLoading = false,
  onContentChange,
  templateSaveEnabled = false,
  templateSaveDraft,
  onTemplateSaved,
  onHistoryChange,
}: EditorProps, ref) {
  const { showSuccess, showError } = useToast();
  
  // Store에서 상태 가져오기
  const {
    content,
    currentFilePath,
    isEditing,
    setIsEditing,
    pendingMetadataUpdate,
    saveFile: storeSaveFile,
    discardPendingMetadata,
    setLocalDocumentMetadata,
    // 에디터 상태 공유용
    setEditorHandlers,
    clearEditorHandlers,
    setHasUnsavedChanges: setStoreHasUnsavedChanges,
    setIsSaving: setStoreIsSaving,
  } = useEditorStore();

  const interactions = useEditorInteractions(currentFilePath);

  // 탭 ID (keep-alive context) + 탭 스토어 (새 문서 저장 시 탭 업데이트용)
  const tabId = useTabInstanceId();
  const { updateTab, closeTab } = useTabStore();
  
  // 확인 다이얼로그
  const { confirm } = useConfirmStore();

  // useEditor 훅 (Undo/Redo 등)
  const {
    content: editorContent,
    originalContent,
    updateContent,
    resetContent,
    hasUnsavedChanges,
    isSaving,
    save,
  } = useEditorState(content, {
    onSave: async (c: string) => {
      if (!currentFilePath) return;
      await storeSaveFile(currentFilePath, c);
    },
  });

  // =====================
  // Store에 에디터 상태 동기화
  // =====================
  React.useEffect(() => {
    setStoreHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setStoreHasUnsavedChanges]);

  React.useEffect(() => {
    setStoreIsSaving(isSaving);
  }, [isSaving, setStoreIsSaving]);

  React.useEffect(() => {
    onContentChange?.(editorContent);
  }, [editorContent, onContentChange]);

  // 파일 내용 변경 시 에디터 리셋
  React.useEffect(() => {
    resetContent(content);
  }, [content, resetContent]);

  // =====================
  // 콘텐츠 변경 핸들러
  // =====================
  const handleBlockEditorChange = React.useCallback((markdown: string) => {
    updateContent(markdown);
  }, [updateContent]);
  const blockEditorRef = React.useRef<BlockEditorRef>(null);
  const lastResetContentRef = React.useRef<string | null>(null);
  const handleToolbarCommand = React.useCallback((id: ToolbarCommandId) => {
    blockEditorRef.current?.applyCommand(id);
  }, []);

  React.useImperativeHandle(ref, () => ({
    applyCommand: (id: ToolbarCommandId) => {
      blockEditorRef.current?.applyCommand(id);
    },
    focus: () => {
      blockEditorRef.current?.focus();
    },
    getMarkdown: () => editorContent,
    getPendingImages: () => new Map(interactions.pendingImagesRef.current),
    clearPendingImages: () => interactions.clearPendingImages(),
    undo: () => {
      blockEditorRef.current?.undo();
    },
    redo: () => {
      blockEditorRef.current?.redo();
    },
  }), [editorContent, interactions]);

  const isCreateMode = !currentFilePath && isEditing;
  // blob URL → 실제 경로 치환 (이미지 업로드 지연 처리)
  const transformBeforeSave = React.useCallback(async (markdown: string): Promise<string> => {
    const pending = interactions.pendingImagesRef.current;
    if (pending.size === 0) return markdown;

    let result = markdown;
    const entries = Array.from(pending.entries());

    for (const [blobUrl, file] of entries) {
      if (!result.includes(blobUrl)) {
        // 마크다운에서 이미 제거된 이미지는 업로드하지 않음
        pending.delete(blobUrl);
        URL.revokeObjectURL(blobUrl);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/file/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      const payload = data?.data ?? data;

      if (res.ok && payload?.path) {
        result = result.replaceAll(blobUrl, payload.path);
      }
      // 업로드 성공이든 실패든 pending에서 제거
      pending.delete(blobUrl);
      URL.revokeObjectURL(blobUrl);
    }

    return result;
  }, [interactions.pendingImagesRef]);

  const hasPendingImages = interactions.pendingImagesRef.current.size > 0;

  const { handleSave, handleCancel } = useEditorPersistence({
    state: {
      content,
      editorContent,
      currentFilePath,
      hasUnsavedChanges,
      pendingMetadataUpdate,
      isCreateMode,
      preferredCreatePath,
      generatedFileName,
      templateSaveEnabled,
      templateSaveDraft,
      tabId,
    },
    actions: {
      save,
      storeSaveFile,
      resetContent,
      discardPendingMetadata,
      setIsEditing,
      setMetadataTitle: (title: string) => setLocalDocumentMetadata({ title }),
      updateTab,
      closeTab,
      onCreatePathResolved,
      onTemplateSaved,
    },
    deps: {
      confirm,
      showSuccess,
      showError,
      requestCreatePath: interactions.requestCreatePath,
      requestSaveLocation: interactions.requestSaveLocation,
      transformBeforeSave: hasPendingImages ? transformBeforeSave : undefined,
    },
  });

  useEditorRuntimeEffects({
    content,
    hasUnsavedChanges,
    isSaving,
    resetContent,
    lastResetContentRef,
    blockEditorRef,
    handleSave,
    handleCancel,
    setStoreHasUnsavedChanges,
    setStoreIsSaving,
    setEditorHandlers,
    clearEditorHandlers,
  });

  // 파일이 없고, 편집 중도 아닐 때 (새 문서 작성 시에는 isEditing=true)
  if (!currentFilePath && !isEditing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ssoo-content-bg/30">
        <p className="text-ssoo-primary/70">파일을 선택해주세요.</p>
      </div>
    );
  }

  const resolvedMaxWidth = variant === 'standalone' ? DOCUMENT_WIDTH : undefined;
  const toolbarNode = (
    <Toolbar
      disabled={isPreview}
      onCommand={handleToolbarCommand}
    />
  );
  const contentNode = (
    <Content
      markdownContent={editorContent}
      originalContent={originalContent}
      onBlockEditorChange={handleBlockEditorChange}
      maxWidth={resolvedMaxWidth}
      variant={variant}
      showSurface={showContentSurface}
      placeholder={isCreateMode ? '' : '/를 입력하여 블록 추가'}
      currentFilePath={currentFilePath}
      isPreview={isPreview}
      isPendingInsertLoading={isPendingInsertLoading}
      blockEditorRef={blockEditorRef}
      showToolbar={false}
      requestImageUrl={interactions.requestImageUrl}
      requestLinkUrl={interactions.requestLinkUrl}
      openExternalHref={interactions.openExternalHref}
      onHistoryChange={onHistoryChange}
    />
  );

  if (variant === 'embedded') {
    return (
      <div className={cn('flex h-full min-h-0 flex-col', className)}>
        {showToolbar && (
          <div className="shrink-0">
            {toolbarNode}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-hidden">
          {contentNode}
        </div>
        {interactions.dialogs}
      </div>
    );
  }

  return (
    <>
      <SectionedShell
        className={cn(
          'h-full min-h-0',
          className
        )}
        variant="editor_with_footer"
        toolbar={showToolbar ? toolbarNode : undefined}
        body={contentNode}
      />
      {interactions.dialogs}
    </>
  );
});

Editor.displayName = 'Editor';
