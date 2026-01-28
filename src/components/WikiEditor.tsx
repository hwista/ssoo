'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, Button, Text, Dialog, DialogSurface, DialogBody, DialogTitle, Tooltip } from '@fluentui/react-components';
import { Eye24Regular, Save24Regular, Edit24Regular, Dismiss24Regular, SaveCopy24Regular, TextT24Regular, Document24Regular } from '@fluentui/react-icons';
import { BlockEditor, BlockEditorRef } from '@/components/editor';
import { htmlToMarkdown, markdownToHtmlSync } from '@/lib/markdownConverter';
import { useWikiContext } from '@/contexts/WikiContext';
import { useTreeStore } from '@/stores/tree-store';
import { useWikiEditorStore } from '@/stores/wiki-editor-store';
import { logger } from '@/lib/utils/errorUtils';
import { isMarkdownFile } from '@/lib/utils/fileUtils';
import { WikiEditorProps } from '@/types/components';
import { useEditor } from '@/hooks/useEditor';

const WikiEditor: React.FC<WikiEditorProps> = ({ className = '' }) => {
  const { selectedFile } = useTreeStore();
  const { showNotification } = useWikiContext();
  
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
      <Card style={{ padding: 32, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text size={400} weight="semibold">파일을 선택해주세요</Text>
        <Text size={300}>왼쪽 사이드바에서 파일을 클릭하여 내용을 확인하고 편집할 수 있습니다.</Text>
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
          <Text size={600} weight="semibold" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
            {selectedFile.split('/').pop()}
          </Text>
          {hasUnsavedChanges && (
            <Text size={200} style={{ marginLeft: 8, color: '#d97706', background: '#fff7ed', borderRadius: 4, padding: '2px 8px' }}>수정됨</Text>
          )}
          {isSaving && (
            <Text size={200} style={{ marginLeft: 8, color: '#2563eb', background: '#eff6ff', borderRadius: 4, padding: '2px 8px' }}>저장 중...</Text>
          )}
        </div>
        {/* 우측: 버튼 영역 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditing && (
            <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
              <Tooltip content="블록 에디터" relationship="label">
                <Button appearance={editorMode === 'block' ? 'primary' : 'subtle'} size="small" icon={<Document24Regular />} onClick={() => handleEditorModeChange('block')} />
              </Tooltip>
              <Tooltip content="마크다운" relationship="label">
                <Button appearance={editorMode === 'markdown' ? 'primary' : 'subtle'} size="small" icon={<TextT24Regular />} onClick={() => handleEditorModeChange('markdown')} />
              </Tooltip>
            </div>
          )}
          {isEditing && (
            <>
              <Tooltip content="미리보기" relationship="label">
                <Button appearance="subtle" icon={<Eye24Regular />} onClick={() => setShowPreviewModal(true)} />
              </Tooltip>
              <Tooltip content="임시저장" relationship="label">
                <Button appearance="secondary" icon={<SaveCopy24Regular />} onClick={tempSave} disabled={isSaving} />
              </Tooltip>
              <Tooltip content="저장" relationship="label">
                <Button appearance="primary" icon={<Save24Regular />} onClick={() => saveFile()} disabled={isSaving} />
              </Tooltip>
              <Tooltip content="편집 취소" relationship="label">
                <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={() => { if (hasUnsavedChanges) { if (confirm('변경사항을 취소하시겠습니까?')) { resetContent(content); setHtmlContent(markdownToHtmlSync(content)); setIsEditing(false); } } else { setIsEditing(false); } }} style={{ color: '#dc2626' }} />
              </Tooltip>
            </>
          )}
          {!isEditing && (
            <Tooltip content="편집" relationship="label">
              <Button appearance="primary" icon={<Edit24Regular />} onClick={() => toggleEditMode()} disabled={isSaving} />
            </Tooltip>
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
              <Card style={{ margin: 16, padding: 16 }}>
                <div className="prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{editorContent || content}</ReactMarkdown>
                </div>
              </Card>
            ) : (
              <Card style={{ margin: 16, padding: 16 }}>
                <pre style={{ fontFamily: 'monospace', fontSize: 14, whiteSpace: 'pre-wrap', margin: 0 }}>{editorContent || content}</pre>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* 스테이터스바 - 읽기 모드와 편집 모드 공통 */}
      {selectedFile && (
        <Card style={{ padding: 12, borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280', borderRadius: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* 왼쪽: 기본 파일 정보 (공통) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Text>라인: {editorContent.split('\n').length}</Text>
              <Text>문자: {editorContent.length}</Text>
              {fileMetadata.createdAt && (
                <Text>생성: {fileMetadata.createdAt.toLocaleDateString()} {fileMetadata.createdAt.toLocaleTimeString()}</Text>
              )}
              {lastSaveTime && (
                <Text>마지막 저장: {lastSaveTime.toLocaleDateString()} {lastSaveTime.toLocaleTimeString()}</Text>
              )}
            </div>
            {/* 편집 모드일 때만 추가 정보 표시 */}
            {isEditing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Text>모드: {editorMode === 'block' ? '블록' : '마크다운'}</Text>
                <Text>자동저장</Text>
                <Button appearance={autoSaveEnabled ? 'primary' : 'outline'} size="small" onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}>{autoSaveEnabled ? 'ON' : 'OFF'}</Button>
                {autoSaveEnabled && autoSaveCountdown > 0 && (
                  <Text style={{ color: '#2563eb' }}>{autoSaveCountdown}초</Text>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 미리보기 모달 */}
      {showPreviewModal && (
        <Dialog open={showPreviewModal} onOpenChange={(_, data) => setShowPreviewModal(data.open)}>
          <DialogSurface>
            <DialogBody style={{ position: 'relative', width: '100%', maxWidth: 600, minWidth: 320, maxHeight: '70vh', minHeight: 200, padding: 24, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Button
                appearance="subtle"
                onClick={() => setShowPreviewModal(false)}
                style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, fontSize: 20, zIndex: 2 }}
                aria-label="닫기"
              >✖</Button>
              <DialogTitle style={{ textAlign: 'center', fontWeight: 600, fontSize: 18, marginBottom: 16 }}>
                👁️ 미리보기 - {selectedFile?.split('/').pop()}
              </DialogTitle>
              <div style={{ overflowY: 'auto', maxHeight: '50vh', minHeight: 120, padding: 8, background: '#fafafa', borderRadius: 8 }}>
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
