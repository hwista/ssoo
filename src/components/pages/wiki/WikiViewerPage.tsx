'use client';

import { useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useTabStore } from '@/stores';
import { useWikiEditorStore } from '@/stores/wiki-editor-store';
import WikiEditor from '@/components/WikiEditor';

/**
 * Wiki 문서 뷰어/에디터 페이지
 * 
 * 핵심 역할:
 * 1. 활성 탭의 path에서 파일 경로 추출
 * 2. 마운트 시 자동으로 loadFile() 호출
 * 3. WikiEditor 컴포넌트 렌더링
 * 
 * PMS 패턴:
 * - SidebarFileTree는 openTab()만 호출
 * - 이 페이지 컴포넌트가 자체적으로 데이터 로드
 */
export function WikiViewerPage() {
  const { activeTabId, tabs } = useTabStore();
  const { loadFile, isLoading, error, content } = useWikiEditorStore();

  // 활성 탭 찾기
  const activeTab = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTabId);
  }, [tabs, activeTabId]);

  // 탭 경로에서 파일 경로 추출 (/wiki/path/to/file.md → path/to/file.md)
  const filePath = useMemo(() => {
    if (!activeTab?.path) return null;
    
    // /wiki/ 접두사 제거
    const path = activeTab.path.replace(/^\/wiki\//, '');
    
    // URL 디코딩
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }, [activeTab?.path]);

  // 파일 경로가 변경되면 파일 로드
  useEffect(() => {
    if (filePath) {
      console.log('📂 WikiViewerPage: 파일 로드 시작', { filePath });
      loadFile(filePath);
    }
  }, [filePath, loadFile]);

  // 로딩 상태
  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-white">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>문서 로딩 중...</span>
        </div>
      </main>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center p-6">
          <p className="text-red-500 mb-2">파일을 불러올 수 없습니다</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-2">경로: {filePath}</p>
        </div>
      </main>
    );
  }

  // 파일 경로가 없을 때
  if (!filePath) {
    return (
      <main className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">사이드바에서 파일을 선택해주세요.</p>
      </main>
    );
  }

  // 에디터 렌더링
  return (
    <main className="flex-1 overflow-auto bg-white">
      <WikiEditor className="h-full" />
    </main>
  );
}

export default WikiViewerPage;
