'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, Button, Text, Input, Dialog, DialogSurface, DialogBody, DialogTitle, Breadcrumb, BreadcrumbItem, Tooltip } from '@fluentui/react-components';
import { Eye24Regular, Save24Regular, Edit24Regular, Dismiss24Regular, SaveCopy24Regular } from '@fluentui/react-icons';
import MarkdownToolbar from '@/components/MarkdownToolbar';
import LinkModal from '@/components/LinkModal';
import ImageModal from '@/components/ImageModal';
import { useWikiContext } from '@/contexts/WikiContext';
import { useTreeDataContext } from '@/contexts/TreeDataContext';
import { logger } from '@/utils/errorUtils';
import { isMarkdownFile } from '@/utils/fileUtils';
import { WikiEditorProps } from '@/types/components';
import { useEditor } from '@/hooks/useEditor';

const WikiEditor: React.FC<WikiEditorProps> = ({ className = '' }) => {
  const { selectedFile } = useTreeDataContext();
  const {
    content,
    isEditing,
    setIsEditing,
    saveFile: contextSaveFile,
    saveFileKeepEditing: contextSaveFileKeepEditing,
    showNotification,
    fileMetadata,
    refreshFileMetadata
  } = useWikiContext();

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
      await contextSaveFile(selectedFile, c);
    },
    onAutoSave: async (c: string) => {
      if (!selectedFile) return;
      await contextSaveFileKeepEditing(selectedFile, c);
      await refreshFileMetadata(selectedFile);
      showNotification('자동 저장 완료', 'success');
    }
  });

  const [showPreviewModal, setShowPreviewModal] = useState(false); // 미리보기 모달 상태
  
  // 모달 상태
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 파일 내용 변경 시 에디터 리셋
  useEffect(() => {
    resetContent(content);
  }, [content, resetContent]);

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
      await contextSaveFileKeepEditing(selectedFile, editorContent);
      markAsSaved();
      await refreshFileMetadata(selectedFile);
      showNotification('임시 저장 완료 (편집 계속)', 'success');
      logger.info('임시 저장 성공 (편집 모드 유지)', { selectedFile });
    } catch (error) {
      logger.error('임시 저장 중 오류', error);
      showNotification('임시 저장 실패', 'error');
    }
  }, [selectedFile, editorContent, contextSaveFileKeepEditing, markAsSaved, refreshFileMetadata, showNotification]);

  // 내용 변경 핸들러
  const handleContentChange = useCallback((newContent: string) => {
    updateContent(newContent);
  }, [updateContent]);

  // 링크 삽입 핸들러
  const handleInsertLink = useCallback(() => {
    setShowLinkModal(true);
  }, []);

  // 이미지 삽입 핸들러  
  const handleInsertImage = useCallback(() => {
    setShowImageModal(true);
  }, []);

  // 링크 삽입 완료 핸들러
  const handleLinkInsert = useCallback((text: string, url: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
  const beforeText = editorContent.substring(0, start);
  const afterText = editorContent.substring(end);
    
    const linkMarkdown = `[${text}](${url})`;
    const newContent = beforeText + linkMarkdown + afterText;
    
    handleContentChange(newContent);
    
    // 커서 위치 조정
    setTimeout(() => {
      const newPosition = start + linkMarkdown.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  }, [editorContent, handleContentChange]);

  // 이미지 삽입 완료 핸들러
  const handleImageInsert = useCallback((alt: string, url: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
  const beforeText = editorContent.substring(0, start);
  const afterText = editorContent.substring(end);
    
    const imageMarkdown = `![${alt}](${url})`;
    const newContent = beforeText + imageMarkdown + afterText;
    
    handleContentChange(newContent);
    
    // 커서 위치 조정
    setTimeout(() => {
      const newPosition = start + imageMarkdown.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  }, [editorContent, handleContentChange]);

  // 자동저장 토글 변경 시 즉시 카운트다운 시작
  useEffect(() => {
    // 변경 감지시 자동 저장 스케줄 (간소화 버전)
    if (autoSaveEnabled && hasUnsavedChanges && isEditing) {
      // 30초 카운트다운은 훅에서 관리
    }
  }, [autoSaveEnabled, hasUnsavedChanges, isEditing]);

  // 편집 모드 토글
  const toggleEditMode = useCallback(() => {
    console.log('🔄 toggleEditMode 호출됨', { isEditing, hasUnsavedChanges });
    
    if (isEditing && hasUnsavedChanges) {
      // 저장하지 않은 변경사항이 있으면 확인
      if (confirm('저장하지 않은 변경사항이 있습니다. 정말로 편집을 취소하시겠습니까?')) {
        console.log('📝 편집 취소 확인됨');
  resetContent(content); // 원래 내용으로 되돌리기 및 히스토리 리셋
        setIsEditing(false);
      }
    } else {
      console.log('🔄 편집 모드 토글:', !isEditing);
      setIsEditing(!isEditing);
      
      // 편집 모드로 전환 시 textarea에 포커스
      if (!isEditing) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      }
    }
  }, [isEditing, hasUnsavedChanges, content, setIsEditing, resetContent]);

  // 키보드 단축키 처리
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) {
          saveFile();
        }
      } else if (e.key === 'e') {
        e.preventDefault();
        toggleEditMode();
      }
    }
  }, [hasUnsavedChanges, saveFile, toggleEditMode]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      // useEditor가 내부적으로 타이머를 관리하므로 여기서는 별도 정리 불필요
    };
  }, []);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      // cleanup placeholder
    };
  }, []);

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
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
                <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={() => { if (hasUnsavedChanges) { if (confirm('저장하지 않은 변경사항이 있습니다. 정말로 편집을 취소하시겠습니까?')) { resetContent(content); setIsEditing(false); } } else { setIsEditing(false); } }} style={{ color: '#dc2626' }} />
              </Tooltip>
            </>
          )}
          {!isEditing && (
            <Tooltip content="편집" relationship="label">
              <Button appearance="primary" icon={<Edit24Regular />} onClick={() => { toggleEditMode(); }} disabled={isSaving} />
            </Tooltip>
          )}
        </div>
      </div>

      {/* 에디터 본문 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* 마크다운 툴바 */}
            <MarkdownToolbar
              textareaRef={textareaRef}
              onContentChange={handleContentChange}
              onInsertLink={handleInsertLink}
              onInsertImage={handleInsertImage}
            />
            {/* 텍스트 에디터 */}
            <textarea
              ref={textareaRef}
              value={editorContent}
              onChange={(e) => handleContentChange(e.target.value)}
              style={{ flex: 1, width: '100%', padding: 16, fontFamily: 'monospace', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none', resize: 'none', background: '#fff' }}
              placeholder="내용을 입력하세요..."
              spellCheck={false}
            />
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
                <Text>자동저장(30초)</Text>
                <Button appearance={autoSaveEnabled ? 'primary' : 'outline'} onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}>{autoSaveEnabled ? 'ON' : 'OFF'}</Button>
                {autoSaveEnabled && autoSaveCountdown > 0 && (
                  <Text style={{ color: '#2563eb' }}>{autoSaveCountdown}초 후 자동저장</Text>
                )}
                {autoSaveEnabled && autoSaveCountdown === 0 && hasUnsavedChanges && (
                  <Text style={{ color: '#059669' }}>자동저장 대기중</Text>
                )}
                <Text>Ctrl+S: 저장 | Ctrl+E: 편집 모드 토글</Text>
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

      {/* 링크 삽입 모달 */}
      <LinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onInsert={handleLinkInsert}
      />
      {/* 이미지 삽입 모달 */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={handleImageInsert}
      />
    </div>
  );
};

export default WikiEditor;
