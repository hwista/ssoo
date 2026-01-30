'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTabStore, useEditorStore } from '@/stores';
import { DocPageTemplate } from '@/components/templates';
import { Viewer, type TocItem } from '@/components/common/page';
import { markdownToHtmlSync } from '@/lib/markdownConverter';
import { MarkdownEditor } from '@/components/editor';

/**
 * Wiki 문서 뷰어/에디터 페이지
 * 
 * Phase 7 업데이트:
 * - 공통 레이아웃: DocPageTemplate (Breadcrumb + Header + Sidecar)
 * - 뷰어 모드: Viewer 슬롯 삽입
 * - 에디터 모드: WikiEditor 슬롯 삽입
 * 
 * PMS 패턴:
 * - SidebarFileTree는 openTab()만 호출
 * - 이 페이지 컴포넌트가 자체적으로 데이터 로드
 */
export function WikiViewerPage() {
  const { activeTabId, tabs } = useTabStore();
  const { loadFile, isLoading, error, content, isEditing, setIsEditing, fileMetadata } = useEditorStore();
  
  // 에디터 모드 상태 (로컬)
  const [mode, setMode] = useState<'viewer' | 'editor'>('viewer');

  // Store의 isEditing과 동기화
  useEffect(() => {
    setMode(isEditing ? 'editor' : 'viewer');
  }, [isEditing]);

  // 활성 탭 찾기
  const activeTab = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTabId);
  }, [tabs, activeTabId]);

  // 탭 경로에서 파일 경로 추출 (/doc/path/to/file.md → path/to/file.md)
  const filePath = useMemo(() => {
    if (!activeTab?.path) return null;
    
    // /doc/ 접두사 제거
    const path = activeTab.path.replace(/^\/doc\//, '');
    
    // URL 디코딩
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }, [activeTab?.path]);

  // 파일 경로가 변경되면 파일 로드 + 뷰어 모드로 전환
  useEffect(() => {
    if (filePath) {
      console.log('📂 WikiViewerPage: 파일 로드 시작', { filePath });
      loadFile(filePath);
      setMode('viewer');
      setIsEditing(false);
    }
  }, [filePath, loadFile, setIsEditing]);

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
    return {
      author: 'admin', // TODO: 실제 작성자 정보
      createdAt: fileMetadata.createdAt || undefined,
      updatedAt: fileMetadata.modifiedAt || undefined,
      lineCount: content ? content.split('\n').length : 0,
      charCount: content ? content.length : 0,
    };
  }, [content, fileMetadata]);

  // 액션 핸들러
  const handleEdit = useCallback(() => {
    setMode('editor');
    setIsEditing(true);
  }, [setIsEditing]);

  const handleDelete = useCallback(() => {
    // TODO: 삭제 확인 모달 + 삭제 로직
    if (confirm(`'${filePath}'를 삭제하시겠습니까?`)) {
      console.log('삭제:', filePath);
    }
  }, [filePath]);

  const handleSearch = useCallback((query: string) => {
    // TODO: 문서 내 검색 하이라이트
    console.log('검색:', query);
  }, []);

  const handleTocClick = useCallback((id: string) => {
    // 해당 헤딩으로 스크롤
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handlePathClick = useCallback((path: string) => {
    // TODO: 해당 폴더로 트리 이동
    console.log('폴더 이동:', path);
  }, []);

  // 저장 핸들러 (에디터 모드용)
  const handleSave = useCallback(() => {
    // TODO: 저장 로직
    console.log('저장');
  }, []);

  // 취소 핸들러 (에디터 → 뷰어)
  const handleCancel = useCallback(() => {
    setMode('viewer');
    setIsEditing(false);
  }, [setIsEditing]);

  // 파일 경로가 없을 때
  if (!filePath) {
    return (
      <main className="flex-1 flex items-center justify-center bg-ssoo-content-bg/30">
        <p className="text-ssoo-primary/70">사이드바에서 파일을 선택해주세요.</p>
      </main>
    );
  }

  // 공통 템플릿 + 슬롯 구조
  return (
    <main className="flex-1 overflow-hidden bg-ssoo-content-bg/30">
      <DocPageTemplate
        filePath={filePath}
        mode={mode}
        metadata={metadata}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onPathClick={handlePathClick}
        loading={isLoading}
        error={error}
        onRetry={() => filePath && loadFile(filePath)}
      >
        {/* 슬롯: 뷰어 또는 에디터 */}
        {mode === 'viewer' ? (
          <Viewer 
            content={htmlContent} 
            toc={toc}
            onTocClick={handleTocClick}
            onSearch={handleSearch}
          />
        ) : (
          <MarkdownEditor className="h-full" />
        )}
      </DocPageTemplate>
    </main>
  );
}

export default WikiViewerPage;
