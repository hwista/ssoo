'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Content } from './Content';
import { useEditor } from '@/hooks/useEditor';
import { useEditorStore, useTabStore } from '@/stores';
import { htmlToMarkdown, markdownToHtmlSync } from '@/lib/markdownConverter';
import { useToast } from '@/lib/toast';

// 문서 본문 최대 너비 (Viewer와 동일)
export const DOCUMENT_WIDTH = 975;

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
 * 문서 편집기 (옵시디언 스타일 라이브 프리뷰)
 * - 본문: BlockEditor + LivePreview 확장
 * - 커서 위치 블록에 마크다운 문법 표시
 * - 다른 블록은 WYSIWYG 렌더링 유지
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
    // 에디터 상태 공유용
    setEditorHandlers,
    clearEditorHandlers,
    setHasUnsavedChanges: setStoreHasUnsavedChanges,
    setIsAutoSaveEnabled: setStoreIsAutoSaveEnabled,
    setAutoSaveCountdown: setStoreAutoSaveCountdown,
    setLastSaveTime: setStoreLastSaveTime,
    setIsSaving: setStoreIsSaving,
  } = useEditorStore();

  // 탭 스토어 (새 문서 저장 시 탭 업데이트용)
  const { activeTabId, updateTab, closeTab, openTab } = useTabStore();
  
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

  // =====================
  // Store에 에디터 상태 동기화
  // =====================
  React.useEffect(() => {
    setStoreHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setStoreHasUnsavedChanges]);

  React.useEffect(() => {
    setStoreIsAutoSaveEnabled(isAutoSaveEnabled);
  }, [isAutoSaveEnabled, setStoreIsAutoSaveEnabled]);

  React.useEffect(() => {
    setStoreAutoSaveCountdown(autoSaveCountdown);
  }, [autoSaveCountdown, setStoreAutoSaveCountdown]);

  React.useEffect(() => {
    setStoreLastSaveTime(lastSaveTime);
  }, [lastSaveTime, setStoreLastSaveTime]);

  React.useEffect(() => {
    setStoreIsSaving(isSaving);
  }, [isSaving, setStoreIsSaving]);

  // 파일 내용 변경 시 에디터 리셋
  React.useEffect(() => {
    resetContent(content);
    setHtmlContent(content ? markdownToHtmlSync(content) : '');
  }, [content, resetContent]);

  // =====================
  // 콘텐츠 변경 핸들러
  // =====================
  const handleBlockEditorChange = React.useCallback((html: string) => {
    setHtmlContent(html);
    updateContent(htmlToMarkdown(html));
  }, [updateContent]);

  // 새 문서 작성 모드 여부
  const isCreateMode = !currentFilePath && isEditing;

  // =====================
  // 저장 핸들러
  // =====================
  const handleSave = React.useCallback(async () => {
    if (isCreateMode) {
      // 새 문서 저장 - 파일 경로 입력 다이얼로그
      const newFileName = prompt('파일 이름을 입력하세요 (예: docs/새문서.md)');
      if (!newFileName) return;
      
      try {
        await storeSaveFile(newFileName, editorContent);
        setIsEditing(false);
        showSuccess('생성 완료', '새 문서가 생성되었습니다.');
        
        // 탭 경로 업데이트: /wiki/new → /doc/{newFileName}
        if (activeTabId) {
          const newPath = `/doc/${encodeURIComponent(newFileName)}`;
          const title = newFileName.split('/').pop() || newFileName;
          updateTab(activeTabId, { path: newPath, title });
        }
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
  }, [isCreateMode, currentFilePath, editorContent, storeSaveFile, save, setIsEditing, showSuccess, showError, activeTabId, updateTab]);

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
    
    // 새 문서 작성 취소 시 탭 닫기
    if (isCreateMode && activeTabId) {
      closeTab(activeTabId);
      return;
    }
    
    resetContent(content);
    setHtmlContent(markdownToHtmlSync(content));
    setIsEditing(false);
  }, [hasUnsavedChanges, content, resetContent, setIsEditing, isCreateMode, activeTabId, closeTab]);

  // =====================
  // 자동저장 토글 핸들러
  // =====================
  const handleAutoSaveToggle = React.useCallback(() => {
    setAutoSaveEnabled(!isAutoSaveEnabled);
  }, [isAutoSaveEnabled, setAutoSaveEnabled]);

  // =====================
  // Store에 핸들러 등록 (Header에서 사용)
  // Ref를 사용하여 핸들러 변경 시 Store를 업데이트하지 않음
  // =====================
  const handlersRef = React.useRef({
    save: handleSave,
    tempSave: handleTempSave,
    cancel: handleCancel,
    autoSaveToggle: handleAutoSaveToggle,
  });

  // 핸들러가 변경되면 ref 업데이트 (Store 업데이트 없음)
  React.useEffect(() => {
    handlersRef.current = {
      save: handleSave,
      tempSave: handleTempSave,
      cancel: handleCancel,
      autoSaveToggle: handleAutoSaveToggle,
    };
  }, [handleSave, handleTempSave, handleCancel, handleAutoSaveToggle]);

  // 마운트 시 한 번만 Store에 핸들러 등록
  React.useEffect(() => {
    setEditorHandlers({
      save: () => handlersRef.current.save(),
      tempSave: () => handlersRef.current.tempSave(),
      cancel: () => handlersRef.current.cancel(),
      autoSaveToggle: () => handlersRef.current.autoSaveToggle(),
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

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 본문 - 라이브 프리뷰 에디터 */}
      <Content
        htmlContent={htmlContent}
        onBlockEditorChange={handleBlockEditorChange}
        maxWidth={DOCUMENT_WIDTH}
      />
    </div>
  );
}
