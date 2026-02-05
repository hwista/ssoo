'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Toolbar } from './Toolbar';
import { Content } from './Content';
import { useEditor } from '@/hooks/useEditor';
import { useEditorStore } from '@/stores';
import { htmlToMarkdown, markdownToHtmlSync } from '@/lib/markdownConverter';
import { useToast } from '@/lib/toast';

// 문서 본문 최대 너비 (Viewer와 동일)
export const DOCUMENT_WIDTH = 975;

/**
 * Editor Mode
 */
export type EditorMode = 'block' | 'markdown';

/**
 * Editor Props
 * Viewer 패턴과 동일한 구조
 */
export interface EditorProps {
  /** 추가 className */
  className?: string;
}

/**
 * Editor 컴포넌트
 * 
 * 문서 편집기 (Viewer 패턴 적용)
 * - 상단 툴바: 에디터 모드 전환, 저장, 취소
 * - 본문: BlockEditor 또는 Markdown textarea
 * 
 * @example
 * ```tsx
 * <Editor className="h-full" />
 * ```
 */
export function Editor({ className }: EditorProps) {
  const { showSuccess, showError } = useToast();
  
  // Store에서 상태 가져오기
  const {
    content,
    currentFilePath,
    isEditing,
    setIsEditing,
    fileMetadata,
    saveFile: storeSaveFile,
    saveFileKeepEditing: storeSaveFileKeepEditing,
    refreshFileMetadata,
  } = useEditorStore();

  // 에디터 모드 (block | markdown)
  const [editorMode, setEditorMode] = React.useState<EditorMode>('block');
  
  // HTML 콘텐츠 (BlockEditor용)
  const [htmlContent, setHtmlContent] = React.useState('');

  // useEditor 훅 (자동저장, Undo/Redo 등)
  const {
    content: editorContent,
    updateContent,
    resetContent,
    hasUnsavedChanges,
    isAutoSaveEnabled,
    setAutoSaveEnabled,
    lastSaveTime,
    autoSaveCountdown,
    isSaving,
    save,
    markAsSaved,
  } = useEditor(content, {
    onSave: async (c: string) => {
      if (!currentFilePath) return;
      await storeSaveFile(currentFilePath, c);
    },
    onAutoSave: async (c: string) => {
      if (!currentFilePath) return;
      await storeSaveFileKeepEditing(currentFilePath, c);
      await refreshFileMetadata(currentFilePath);
      showSuccess('자동 저장', '자동 저장이 완료되었습니다.');
    },
  });

  // 파일 내용 변경 시 에디터 리셋
  React.useEffect(() => {
    resetContent(content);
    setHtmlContent(content ? markdownToHtmlSync(content) : '');
  }, [content, resetContent]);

  // =====================
  // 모드 전환 핸들러
  // =====================
  const handleModeChange = React.useCallback((mode: EditorMode) => {
    if (mode === 'block' && editorMode === 'markdown') {
      // Markdown → Block: HTML로 변환
      setHtmlContent(markdownToHtmlSync(editorContent));
    } else if (mode === 'markdown' && editorMode === 'block') {
      // Block → Markdown: Markdown으로 변환
      updateContent(htmlToMarkdown(htmlContent));
    }
    setEditorMode(mode);
  }, [editorMode, editorContent, htmlContent, updateContent]);

  // =====================
  // 콘텐츠 변경 핸들러
  // =====================
  const handleBlockEditorChange = React.useCallback((html: string) => {
    setHtmlContent(html);
    updateContent(htmlToMarkdown(html));
  }, [updateContent]);

  const handleMarkdownChange = React.useCallback((markdown: string) => {
    updateContent(markdown);
  }, [updateContent]);

  // 새 문서 작성 모드 여부
  const isCreateMode = !currentFilePath && isEditing;

  // =====================
  // 저장 핸들러
  // =====================
  const handleSave = React.useCallback(async () => {
    if (isCreateMode) {
      // TODO: 새 문서 저장 - 파일 경로 입력 다이얼로그 필요
      const newFileName = prompt('파일 이름을 입력하세요 (예: docs/새문서.md)');
      if (!newFileName) return;
      
      try {
        await storeSaveFile(newFileName, editorContent);
        setIsEditing(false);
        showSuccess('생성 완료', '새 문서가 생성되었습니다.');
        // TODO: 탭 경로 업데이트
      } catch (error) {
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
    } catch (error) {
      showError('저장 실패', '파일 저장 중 오류가 발생했습니다.');
    }
  }, [isCreateMode, currentFilePath, editorContent, storeSaveFile, save, setIsEditing, showSuccess, showError]);

  // 임시 저장 (편집 모드 유지)
  const handleTempSave = React.useCallback(async () => {
    if (isCreateMode) {
      showError('임시 저장 불가', '새 문서는 먼저 저장해야 합니다.');
      return;
    }
    if (!currentFilePath) {
      showError('저장 실패', '선택된 파일이 없습니다.');
      return;
    }
    try {
      await storeSaveFileKeepEditing(currentFilePath, editorContent);
      markAsSaved();
      await refreshFileMetadata(currentFilePath);
      showSuccess('임시 저장', '임시 저장이 완료되었습니다.');
    } catch (error) {
      showError('저장 실패', '임시 저장 중 오류가 발생했습니다.');
    }
  }, [currentFilePath, editorContent, storeSaveFileKeepEditing, markAsSaved, refreshFileMetadata, showSuccess, showError]);

  // =====================
  // 취소 핸들러
  // =====================
  const handleCancel = React.useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 정말로 취소하시겠습니까?')) {
        return;
      }
    }
    resetContent(content);
    setHtmlContent(markdownToHtmlSync(content));
    setIsEditing(false);
  }, [hasUnsavedChanges, content, resetContent, setIsEditing]);

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

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 툴바 */}
      <Toolbar
        maxWidth={DOCUMENT_WIDTH}
        mode={editorMode}
        onModeChange={handleModeChange}
        onSave={handleSave}
        onTempSave={handleTempSave}
        onCancel={handleCancel}
        saving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        isAutoSaveEnabled={isAutoSaveEnabled}
        onAutoSaveToggle={() => setAutoSaveEnabled(!isAutoSaveEnabled)}
        autoSaveCountdown={autoSaveCountdown}
        lastSaveTime={lastSaveTime}
        lineCount={editorContent.split('\n').length}
        charCount={editorContent.length}
      />

      {/* 본문 */}
      <Content
        mode={editorMode}
        htmlContent={htmlContent}
        markdownContent={editorContent}
        onBlockEditorChange={handleBlockEditorChange}
        onMarkdownChange={handleMarkdownChange}
        maxWidth={DOCUMENT_WIDTH}
      />
    </div>
  );
}
