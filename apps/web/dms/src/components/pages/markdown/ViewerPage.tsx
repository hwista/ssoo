'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTabStore, useEditorStore, useConfirmStore, useFileStore, useAssistantStore } from '@/stores';
import { useCurrentTabId } from '@/contexts/TabInstanceContext';
import { fileApi } from '@/lib/utils/apiClient';
import { DocPageTemplate } from '@/components/templates';
import { Viewer } from '@/components/common/viewer';
import { Editor } from '@/components/common/editor';
import { type TocItem } from '@/components/common/page';
import { markdownToHtmlSync } from '@/lib/markdownConverter';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import type { DocumentMetadata } from '@/types';
import { ErrorState, LoadingState } from '@/components/common/StateDisplay';

/**
 * 페이지 모드
 * - viewer: 문서 읽기
 * - editor: 기존 문서 편집
 * - create: 새 문서 작성
 */
type PageMode = 'viewer' | 'editor' | 'create';

/**
 * 마크다운 문서 뷰어/에디터 페이지
 * 
 * Phase 8 업데이트:
 * - 에디터 모드: 새 Editor 컴포넌트 (Viewer 패턴)
 * - 생성 모드: /wiki/new 경로에서 새 문서 작성
 * - 공통 레이아웃: DocPageTemplate (Breadcrumb + Header + Sidecar)
 * - 뷰어 모드: Viewer 슬롯 삽입
 * 
 * PMS 패턴:
 * - SidebarFileTree는 openTab()만 호출
 * - 이 페이지 컴포넌트가 자체적으로 데이터 로드
 */
export function ViewerPage() {
  const tabId = useCurrentTabId();
  const { tabs, closeTab } = useTabStore();
  const { confirm } = useConfirmStore();
  const { refreshFileTree } = useFileStore();
  const openAssistantPanel = useAssistantStore((state) => state.openPanel);
  const toggleAssistantReference = useAssistantStore((state) => state.toggleReference);
  const attachedReferences = useAssistantStore((state) => state.attachedReferences);
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
    // 에디터 상태 (Header에 전달)
    isSaving,
    editorHandlers,
    removeTabEditor,
  } = useEditorStore();
  
  // 에디터 모드 상태 (로컬)
  const [mode, setMode] = useState<PageMode>('viewer');

  // 탭 제거 시 에디터 상태 정리
  useEffect(() => {
    return () => {
      removeTabEditor();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Store의 isEditing과 동기화 (create 모드는 제외)
  useEffect(() => {
    if (mode !== 'create') {
      setMode(isEditing ? 'editor' : 'viewer');
    }
  }, [isEditing, mode]);

  // 이 탭 인스턴스 찾기 (keep-alive: activeTabId 대신 context의 tabId 사용)
  const activeTab = useMemo(() => {
    return tabs.find((tab) => tab.id === tabId);
  }, [tabs, tabId]);

  // 새 문서 작성 모드인지 확인
  const isCreateMode = useMemo(() => {
    return activeTab?.path === '/wiki/new';
  }, [activeTab?.path]);

  // 탭 경로에서 파일 경로 추출 (/doc/path/to/file.md → path/to/file.md)
  const filePath = useMemo(() => {
    if (!activeTab?.path) return null;
    
    // 새 문서 작성 모드
    if (activeTab.path === '/wiki/new') return null;
    
    // /doc/ 접두사 제거
    const path = activeTab.path.replace(/^\/doc\//, '');
    
    // URL 디코딩
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }, [activeTab?.path]);

  // 새 문서 작성 모드 진입
  useEffect(() => {
    if (isCreateMode) {
      reset(); // 에디터 상태 초기화
      setContent('# 새 문서\n\n내용을 입력하세요...');
      setMode('create');
      setIsEditing(true);
    }
  }, [isCreateMode, reset, setContent, setIsEditing]);

  // 파일 경로가 변경되면 파일 로드 + 뷰어 모드로 전환
  useEffect(() => {
    if (filePath && !isCreateMode) {
      loadFile(filePath);
      setMode('viewer');
      setIsEditing(false);
    }
  }, [filePath, isCreateMode, loadFile, setIsEditing]);

  // HTML 콘텐츠 변환 (뷰어용)
  const htmlContent = useMemo(() => {
    if (!content) return '';
    return markdownToHtmlSync(content);
  }, [content]);

  // 목차 추출 (헤딩 기반)
  const toc = useMemo((): TocItem[] => {
    if (!content) return [];
    
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items: TocItem[] = [];
    let match;
    let index = 0;
    
    while ((match = headingRegex.exec(content)) !== null) {
      items.push({
        id: `heading-${index++}`,
        level: match[1].length,
        text: match[2].trim(),
      });
    }
    
    return items;
  }, [content]);

  // 메타데이터 구성
  const metadata = useMemo(() => {
    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
    return {
      author: documentMetadata?.author || 'Unknown',
      createdAt: fileMetadata.createdAt || undefined,
      updatedAt: fileMetadata.modifiedAt || undefined,
      lineCount: content ? content.split('\n').length : 0,
      charCount: content ? content.length : 0,
      wordCount,
      attachments: documentMetadata?.sourceFiles || [],
    };
  }, [content, documentMetadata, fileMetadata]);

  const tags = useMemo(() => documentMetadata?.tags || [], [documentMetadata]);

  // 액션 핸들러
  const handleEdit = useCallback(() => {
    setMode('editor');
    setIsEditing(true);
  }, [setIsEditing]);

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
    // 해당 헤딩으로 스크롤
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handlePathClick = useCallback(() => {
    // TODO: 해당 폴더로 트리 이동
  }, []);

  // 히스토리 핸들러 (깃 연동 예정)
  const handleHistory = useCallback(() => {
    // TODO: 깃 히스토리 뷰어 연동
  }, []);

  // 저장 핸들러 (에디터 모드용) - Store의 핸들러 사용
  const handleSave = useCallback(() => {
    editorHandlers?.save();
  }, [editorHandlers]);

  // 취소 핸들러 (에디터/생성 → 뷰어) - Store의 핸들러 사용
  const handleCancel = useCallback(() => {
    if (editorHandlers) {
      editorHandlers.cancel();
    } else {
      setMode('viewer');
      setIsEditing(false);
    }
  }, [editorHandlers, setIsEditing]);

  // 메타데이터 변경 핸들러 (Sidecar → Store 로컬 업데이터, 저장 시 플러시)
  const handleMetadataChange = useCallback((update: Partial<DocumentMetadata>) => {
    setLocalDocumentMetadata(update);
  }, [setLocalDocumentMetadata]);

  const handleRetry = useCallback(() => {
    if (filePath) {
      loadFile(filePath);
    }
  }, [filePath, loadFile]);

  const contentBody = useMemo(() => {
    if (error) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <ErrorState error={error} onRetry={handleRetry} />
        </div>
      );
    }

    if (isLoading && !isCreateMode) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <LoadingState message="문서를 불러오는 중..." />
        </div>
      );
    }

    return mode === 'viewer' ? (
      <Viewer
        content={htmlContent}
        toc={toc}
        onTocClick={handleTocClick}
        onSearch={handleSearch}
        onAttachToAssistant={handleAttachCurrentDocToAssistant}
        variant="embedded"
        showContentSurface
      />
    ) : (
      <Editor className="h-full" variant="embedded" />
    );
  }, [error, handleRetry, htmlContent, isCreateMode, isLoading, mode, toc, handleTocClick, handleSearch, handleAttachCurrentDocToAssistant]);

  const contentSurfaceClassName = 'bg-transparent border-0';

  // 파일 경로가 없고, 생성 모드도 아닐 때
  if (!filePath && !isCreateMode) {
    return (
      <main className="h-full flex items-center justify-center bg-ssoo-content-bg/30">
        <p className="text-ssoo-primary/70">사이드바에서 파일을 선택해주세요.</p>
      </main>
    );
  }

  // 공통 템플릿 + 슬롯 구조
  return (
    <main className="h-full overflow-hidden bg-ssoo-content-bg/30">
      <DocPageTemplate
        filePath={filePath || '새 문서.md'}
        mode={mode === 'create' ? 'editor' : mode}
        contentOrientation="portrait"
        contentSurfaceClassName={contentSurfaceClassName}
        metadata={metadata}
        tags={tags}
        documentMetadata={documentMetadata}
        onMetadataChange={handleMetadataChange}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onHistory={handleHistory}
        onDelete={isCreateMode ? undefined : handleDelete}
        onPathClick={handlePathClick}
        saving={isSaving}
      >
        {contentBody}
      </DocPageTemplate>
    </main>
  );
}

export default ViewerPage;
