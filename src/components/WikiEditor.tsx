'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Dialog, DialogSurface, DialogBody, DialogTitle } from '@/components/ui/dialog';
import { Eye, Save, Edit, X, Copy, Type, FileText } from 'lucide-react';
import { BlockEditor, BlockEditorRef } from '@/components/editor';
import { htmlToMarkdown, markdownToHtmlSync } from '@/lib/markdownConverter';
import { useTreeStore } from '@/stores/tree-store';
import { useWikiEditorStore } from '@/stores/wiki-editor-store';
import { useToast } from '@/lib/toast';
import { logger } from '@/lib/utils/errorUtils';
import { isMarkdownFile } from '@/lib/utils/fileUtils';
import { WikiEditorProps } from '@/types/components';
import { useEditor } from '@/hooks/useEditor';

const WikiEditor: React.FC<WikiEditorProps> = ({ className = '' }) => {
  const { selectedFile } = useTreeStore();
  const { showSuccess, showError: showErrorToast } = useToast();
  
  // showNotification 래퍼 (기존 인터페이스 유지)
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (type === 'success') showSuccess('알림', message);
    else if (type === 'error') showErrorToast('오류', message);
    else showSuccess('정보', message);
  };
  
  // Editor Store에서 상태 가져오기
  const {
    content,
    isEditing,
    setIsEditing,
    fileMetadata,
    saveFile: storeSaveFile,
    saveFileKeepEditing: storeSaveFileKeepEditing,
    refreshFileMetadata,
  } = useWikiEditorStore();

  // 훅 기반 에디터 상태
  const {
    content: editorContent,
    updateContent,
    resetContent,
    hasUnsavedChanges,
    isAutoSaveEnabled: autoSaveEnabled,
    setAutoSaveEnabled,
    lastSaveTime,
    autoSaveCountdown,
    isSaving,
  save,
    markAsSaved
  } = useEditor(content, {
    onSave: async (c: string) => {
      if (!selectedFile) return;
      await storeSaveFile(selectedFile, c);
    },
    onAutoSave: async (c: string) => {
      if (!selectedFile) return;
      await storeSaveFileKeepEditing(selectedFile, c);
      await refreshFileMetadata(selectedFile);
      showNotification('자동 저장 완료', 'success');
    }
  });

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editorMode, setEditorMode] = useState<'block' | 'markdown'>('block');
  const [htmlContent, setHtmlContent] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blockEditorRef = useRef<BlockEditorRef>(null);

  // 파일 내용 변경 시 에디터 리셋
  useEffect(() => {
    resetContent(content);
    setHtmlContent(content ? markdownToHtmlSync(content) : '');
  }, [content, resetContent]);

  // BlockEditor 콘텐츠 변경 핸들러
  const handleBlockEditorChange = useCallback((html: string) => {
    setHtmlContent(html);
    updateContent(htmlToMarkdown(html));
  }, [updateContent]);

  // 에디터 모드 전환
  const handleEditorModeChange = useCallback((mode: 'block' | 'markdown') => {
    if (mode === 'block' && editorMode === 'markdown') {
      setHtmlContent(markdownToHtmlSync(editorContent));
    } else if (mode === 'markdown' && editorMode === 'block') {
      updateContent(htmlToMarkdown(htmlContent));
    }
    setEditorMode(mode);
  }, [editorMode, editorContent, htmlContent, updateContent]);

  // 상태 변화 로깅
  useEffect(() => {
    console.log('📊 WikiEditor 상태 변화:', { 
      isEditing, 
      selectedFile, 
      hasContent: !!content,
      setIsEditingType: typeof setIsEditing 
    });
  }, [isEditing, selectedFile, content, setIsEditing]);

  // 파일 내용이 변경될 때 로컬 상태 동기화
  useEffect(() => {
    console.log('📄 파일 로드(훅):', { selectedFile, length: content.length });
  }, [content, selectedFile]);

  // 선택된 파일이 변경될 때 편집 모드 해제
  useEffect(() => {
    if (selectedFile) {
      setIsEditing(false);
      // hasUnsavedChanges는 이제 useEditor 훅에서 관리되므로 여기서 설정할 필요 없음
    }
  }, [selectedFile, setIsEditing]);

  // 파일 저장 함수 (편집 모드 종료)
  const saveFile = useCallback(async () => {
    if (!selectedFile) {
      showNotification('저장 실패: 선택된 파일이 없습니다', 'error');
      return;
    }
    try {
      await save();
      setIsEditing(false);
      showNotification('저장 완료', 'success');
    } catch (e) {
      logger.error('파일 저장 실패', e);
    }
  }, [selectedFile, save, setIsEditing, showNotification]);

  // 자동 저장 함수 (30초 간격, 편집 모드 유지, 카운트다운 포함)
  // (스케줄러 간소화) useEditor 내부 타이머에 의존, 별도 scheduleAutosave 제거

  // 임시 저장 함수 (편집 모드 유지)
  const tempSave = useCallback(async () => {
    if (!selectedFile) {
      showNotification('저장 실패: 선택된 파일이 없습니다', 'error');
      return;
    }
    try {
      await storeSaveFileKeepEditing(selectedFile, editorContent);
      markAsSaved();
      await refreshFileMetadata(selectedFile);
      showNotification('임시 저장 완료 (편집 계속)', 'success');
      logger.info('임시 저장 성공 (편집 모드 유지)', { selectedFile });
    } catch (error) {
      logger.error('임시 저장 중 오류', error);
      showNotification('임시 저장 실패', 'error');
    }
  }, [selectedFile, editorContent, storeSaveFileKeepEditing, markAsSaved, refreshFileMetadata, showNotification]);

  // 내용 변경 핸들러
  const handleContentChange = useCallback((newContent: string) => {
    updateContent(newContent);
  }, [updateContent]);


  // 편집 모드 토글
  const toggleEditMode = useCallback(() => {
    if (isEditing && hasUnsavedChanges) {
      if (confirm('저장하지 않은 변경사항이 있습니다. 정말로 편집을 취소하시겠습니까?')) {
        resetContent(content);
        setHtmlContent(markdownToHtmlSync(content));
        setIsEditing(false);
      }
    } else {
      setIsEditing(!isEditing);
      if (!isEditing) {
        setTimeout(() => {
          editorMode === 'block' ? blockEditorRef.current?.focus() : textareaRef.current?.focus();
        }, 100);
      }
    }
  }, [isEditing, hasUnsavedChanges, content, setIsEditing, resetContent, editorMode]);

  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing && hasUnsavedChanges) saveFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        toggleEditMode();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, hasUnsavedChanges, saveFile, toggleEditMode]);

  // 브라우저 종료 시 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '저장하지 않은 변경사항이 있습니다.';
        return '저장하지 않은 변경사항이 있습니다.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  if (!selectedFile) {
    return (
      <Card className="p-8 min-h-[200px] flex flex-col items-center justify-center">
        <span className="text-lg font-semibold">파일을 선택해주세요</span>
        <span className="text-sm text-gray-500">왼쪽 사이드바에서 파일을 클릭하여 내용을 확인하고 편집할 수 있습니다.</span>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 에디터 헤더 - 3분할 레이아웃으로 Breadcrumb, 파일명, 버튼 분리 */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {/* 좌측: 파일 경로 Breadcrumb */}
       {/* <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Breadcrumb>
            {selectedFile.split('/').map((segment, idx) => (
              <BreadcrumbItem key={idx}>{segment}</BreadcrumbItem>
            ))}
          </Breadcrumb>
        </div>*/}
        {/* 중앙: 파일명 및 상태 */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <span className="text-xl font-semibold inline-block max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap">
            {selectedFile.split('/').pop()}
          </span>
          {hasUnsavedChanges && (
            <span className="ml-2 text-xs text-amber-600 bg-amber-50 rounded px-2 py-0.5">수정됨</span>
          )}
          {isSaving && (
            <span className="ml-2 text-xs text-blue-600 bg-blue-50 rounded px-2 py-0.5">저장 중...</span>
          )}
        </div>
        {/* 우측: 버튼 영역 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditing && (
            <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
              <SimpleTooltip content="블록 에디터">
                <Button variant={editorMode === 'block' ? 'default' : 'ghost'} size="sm" onClick={() => handleEditorModeChange('block')}>
                  <FileText className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip content="마크다운">
                <Button variant={editorMode === 'markdown' ? 'default' : 'ghost'} size="sm" onClick={() => handleEditorModeChange('markdown')}>
                  <Type className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
            </div>
          )}
          {isEditing && (
            <>
              <SimpleTooltip content="미리보기">
                <Button variant="ghost" onClick={() => setShowPreviewModal(true)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip content="임시저장">
                <Button variant="secondary" onClick={tempSave} disabled={isSaving}>
                  <Copy className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip content="저장">
                <Button variant="default" onClick={() => saveFile()} disabled={isSaving}>
                  <Save className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip content="편집 취소">
                <Button variant="ghost" className="text-red-600" onClick={() => { if (hasUnsavedChanges) { if (confirm('변경사항을 취소하시겠습니까?')) { resetContent(content); setHtmlContent(markdownToHtmlSync(content)); setIsEditing(false); } } else { setIsEditing(false); } }}>
                  <X className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
            </>
          )}
          {!isEditing && (
            <SimpleTooltip content="편집">
              <Button variant="default" onClick={() => toggleEditMode()} disabled={isSaving}>
                <Edit className="h-4 w-4" />
              </Button>
            </SimpleTooltip>
          )}
        </div>
      </div>

      {/* 에디터 본문 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {editorMode === 'block' ? (
              <BlockEditor
                ref={blockEditorRef}
                content={htmlContent}
                onChange={handleBlockEditorChange}
                onSave={saveFile}
                editable={true}
                placeholder='/를 입력하여 블록 추가'
                className="flex-1"
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={editorContent}
                onChange={(e) => handleContentChange(e.target.value)}
                style={{ flex: 1, width: '100%', padding: 16, fontFamily: 'monospace', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none', resize: 'none', background: '#fff' }}
                placeholder="마크다운 내용을 입력하세요..."
                spellCheck={false}
              />
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {isMarkdownFile(selectedFile) ? (
              <Card className="m-4 p-4">
                <div className="prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{editorContent || content}</ReactMarkdown>
                </div>
              </Card>
            ) : (
              <Card className="m-4 p-4">
                <pre style={{ fontFamily: 'monospace', fontSize: 14, whiteSpace: 'pre-wrap', margin: 0 }}>{editorContent || content}</pre>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* 스테이터스바 - 읽기 모드와 편집 모드 공통 */}
      {selectedFile && (
        <Card className="p-3 border-t border-gray-200 text-xs text-gray-500 rounded-none">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* 왼쪽: 기본 파일 정보 (공통) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span>라인: {editorContent.split('\n').length}</span>
              <span>문자: {editorContent.length}</span>
              {fileMetadata.createdAt && (
                <span>생성: {fileMetadata.createdAt.toLocaleDateString()} {fileMetadata.createdAt.toLocaleTimeString()}</span>
              )}
              {lastSaveTime && (
                <span>마지막 저장: {lastSaveTime.toLocaleDateString()} {lastSaveTime.toLocaleTimeString()}</span>
              )}
            </div>
            {/* 편집 모드일 때만 추가 정보 표시 */}
            {isEditing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span>모드: {editorMode === 'block' ? '블록' : '마크다운'}</span>
                <span>자동저장</span>
                <Button variant={autoSaveEnabled ? 'default' : 'outline'} size="sm" onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}>{autoSaveEnabled ? 'ON' : 'OFF'}</Button>
                {autoSaveEnabled && autoSaveCountdown > 0 && (
                  <span className="text-blue-600">{autoSaveCountdown}초</span>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 미리보기 모달 */}
      {showPreviewModal && (
        <Dialog open={showPreviewModal} onOpenChange={(open) => setShowPreviewModal(open)}>
          <DialogSurface>
            <DialogBody className="relative w-full max-w-[600px] min-w-[320px] max-h-[70vh] min-h-[200px] p-6 bg-white rounded-2xl shadow-2xl mx-auto flex flex-col justify-center">
              <Button
                variant="ghost"
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-4 right-4 w-9 h-9 text-xl z-10"
                aria-label="닫기"
              >✖</Button>
              <DialogTitle className="text-center font-semibold text-lg mb-4">
                👁️ 미리보기 - {selectedFile?.split('/').pop()}
              </DialogTitle>
              <div className="overflow-y-auto max-h-[50vh] min-h-[120px] p-2 bg-gray-50 rounded-lg">
                {isMarkdownFile(selectedFile || '') ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{editorContent}</ReactMarkdown>
                ) : (
                  <pre style={{ fontFamily: 'monospace', fontSize: 14, whiteSpace: 'pre-wrap', margin: 0 }}>{editorContent}</pre>
                )}
              </div>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      )}

    </div>
  );
};

export default WikiEditor;
