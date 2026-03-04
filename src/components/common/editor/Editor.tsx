'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Content } from './Content';
import { type BlockEditorRef } from './BlockEditor';
import { EditorToolbar, type ToolbarCommandId } from './Toolbar';
import { SectionedShell } from '@/components/common/page';
import { DOCUMENT_WIDTHS } from '@/components/common/page';
import { useEditor } from '@/hooks/useEditor';
import { useEditorStore, useTabStore } from '@/stores';
import { useCurrentTabId } from '@/contexts/TabInstanceContext';
import { useConfirmStore } from '@/stores/confirm.store';
import { useToast } from '@/lib/toast';

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
  /** 생성 모드에서 실제 저장 경로가 결정될 때 */
  onCreatePathResolved?: (path: string) => void;
  /** 미리보기 모드 여부 */
  isPreview?: boolean;
  /** 툴바 표시 여부 (embedded 모드에서 외부 Shell toolbar 슬롯 주입 시 false) */
  showToolbar?: boolean;
}

export interface EditorRef {
  applyCommand: (id: ToolbarCommandId) => void;
  focus: () => void;
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
  onCreatePathResolved,
  isPreview = false,
  showToolbar = true,
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
    // 에디터 상태 공유용
    setEditorHandlers,
    clearEditorHandlers,
    setHasUnsavedChanges: setStoreHasUnsavedChanges,
    setIsSaving: setStoreIsSaving,
  } = useEditorStore();

  // 탭 ID (keep-alive context) + 탭 스토어 (새 문서 저장 시 탭 업데이트용)
  const tabId = useCurrentTabId();
  const { updateTab, closeTab } = useTabStore();
  
  // 확인 다이얼로그
  const { confirm } = useConfirmStore();

  // useEditor 훅 (Undo/Redo 등)
  const {
    content: editorContent,
    updateContent,
    resetContent,
    hasUnsavedChanges,
    isSaving,
    save,
  } = useEditor(content, {
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
  }), []);

  // 새 문서 작성 모드 여부
  const isCreateMode = !currentFilePath && isEditing;

  // =====================
  // 저장 핸들러
  // =====================
  const handleSave = React.useCallback(async () => {
    if (isCreateMode) {
      const pathHint = preferredCreatePath?.trim();
      const input = pathHint || prompt('파일 이름을 입력하세요 (예: docs/새문서.md)');
      const newFileName = input?.trim();
      if (!newFileName) return;
      const resolvedPath = newFileName.endsWith('.md') ? newFileName : `${newFileName}.md`;
      
      try {
        await storeSaveFile(resolvedPath, editorContent);
        setIsEditing(false);
        onCreatePathResolved?.(resolvedPath);
        showSuccess('생성 완료', '새 문서가 생성되었습니다.');
        
        // 탭 경로 업데이트: /wiki/new → /doc/{newFileName}
        if (tabId) {
          const newPath = `/doc/${encodeURIComponent(resolvedPath)}`;
          const title = resolvedPath.split('/').pop() || resolvedPath;
          updateTab(tabId, { path: newPath, title });
        }
      } catch {
        showError('생성 실패', '문서 생성 중 오류가 발생했습니다.');
      }
      return;
    }
    
    if (!currentFilePath) {
      showError('저장 실패', '선택된 파일이 없습니다.');
      return;
    }
    try {
      await save();
      setIsEditing(false);
      showSuccess('저장 완료', '파일이 저장되었습니다.');
    } catch {
      showError('저장 실패', '파일 저장 중 오류가 발생했습니다.');
    }
  }, [isCreateMode, currentFilePath, editorContent, preferredCreatePath, storeSaveFile, save, setIsEditing, onCreatePathResolved, showSuccess, showError, tabId, updateTab]);

  // =====================
  // 취소 핸들러
  // =====================
  const handleCancel = React.useCallback(async () => {
    if (hasUnsavedChanges || pendingMetadataUpdate) {
      const confirmed = await confirm({
        title: '변경사항 폐기',
        description: '저장하지 않은 변경사항이 있습니다. 정말로 취소하시겠습니까?',
        confirmText: '취소',
        cancelText: '돌아가기',
      });
      if (!confirmed) return;
    }
    
    // 새 문서 작성 취소 시 탭 닫기
    if (isCreateMode && tabId) {
      closeTab(tabId);
      return;
    }
    
    resetContent(content);
    // 보류 중인 메타데이터 변경사항 폐기 (서버에서 재로드)
    discardPendingMetadata();
    setIsEditing(false);
  }, [hasUnsavedChanges, pendingMetadataUpdate, confirm, content, resetContent, setIsEditing, isCreateMode, tabId, closeTab, discardPendingMetadata]);

  // =====================
  // Store에 핸들러 등록 (Header에서 사용)
  // Ref를 사용하여 핸들러 변경 시 Store를 업데이트하지 않음
  // =====================
  const handlersRef = React.useRef({
    save: handleSave,
    cancel: handleCancel,
    getSelection: () => blockEditorRef.current?.getSelection() ?? { from: 0, to: 0 },
    insertAt: (from: number, to: number, text: string) => blockEditorRef.current?.insertAt(from, to, text),
    setPendingInsert: (range: { from: number; to: number } | null) => blockEditorRef.current?.setPendingInsert(range),
  });

  // 핸들러가 변경되면 ref 업데이트 (Store 업데이트 없음)
  React.useEffect(() => {
    handlersRef.current = {
      save: handleSave,
      cancel: handleCancel,
      getSelection: () => blockEditorRef.current?.getSelection() ?? { from: 0, to: 0 },
      insertAt: (from: number, to: number, text: string) => blockEditorRef.current?.insertAt(from, to, text),
      setPendingInsert: (range: { from: number; to: number } | null) => blockEditorRef.current?.setPendingInsert(range),
    };
  }, [handleSave, handleCancel]);

  // 마운트 시 한 번만 Store에 핸들러 등록
  React.useEffect(() => {
    setEditorHandlers({
      save: () => handlersRef.current.save(),
      cancel: () => handlersRef.current.cancel(),
      getSelection: () => handlersRef.current.getSelection(),
      insertAt: (from, to, text) => handlersRef.current.insertAt(from, to, text),
      setPendingInsert: (range) => handlersRef.current.setPendingInsert(range),
    });
    
    return () => {
      clearEditorHandlers();
    };
  }, [setEditorHandlers, clearEditorHandlers]);

  // =====================
  // 키보드 단축키
  // =====================
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, handleSave]);

  // =====================
  // 브라우저 종료 경고
  // =====================
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '저장하지 않은 변경사항이 있습니다.';
        return '저장하지 않은 변경사항이 있습니다.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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
    <EditorToolbar
      disabled={isPreview}
      onCommand={handleToolbarCommand}
    />
  );
  const contentNode = (
    <Content
      markdownContent={editorContent}
      onBlockEditorChange={handleBlockEditorChange}
      maxWidth={resolvedMaxWidth}
      variant={variant}
      showSurface={showContentSurface}
      placeholder={isCreateMode ? '' : '/를 입력하여 블록 추가'}
      currentFilePath={currentFilePath}
      isPreview={isPreview}
      blockEditorRef={blockEditorRef}
      showToolbar={false}
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
      </div>
    );
  }

  return (
    <SectionedShell
      className={cn(
        'h-full min-h-0',
        className
      )}
      variant="editor_with_footer"
      toolbar={showToolbar ? toolbarNode : undefined}
      body={contentNode}
    />
  );
});

Editor.displayName = 'Editor';
