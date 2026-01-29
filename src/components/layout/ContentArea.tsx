'use client';

import { lazy, Suspense, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useTabStore, HOME_TAB } from '@/stores';

/**
 * 페이지 컴포넌트 매핑 (PMS 패턴)
 * - React.lazy로 동적 import
 * - 코드 분할로 초기 로딩 최적화
 */
const pageComponents = {
  // Home 대시보드
  home: lazy(() => import('@/components/pages/wiki/WikiHomePage')),
  // AI 검색
  'ai-search': lazy(() => import('@/components/pages/ai/AISearchPage')),
  // 문서 뷰어/에디터
  wiki: lazy(() => import('@/components/pages/wiki/WikiViewerPage')),
};

/**
 * 로딩 컴포넌트
 */
function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>로딩 중...</span>
      </div>
    </div>
  );
}

/**
 * 탭 경로에서 페이지 타입 결정
 */
function getPageType(tab: { id: string; path: string } | undefined): keyof typeof pageComponents | null {
  if (!tab) return null;
  
  // Home 탭
  if (tab.id === HOME_TAB.id) {
    return 'home';
  }
  
  // AI 검색 탭
  if (tab.path.startsWith('/ai-search')) {
    return 'ai-search';
  }
  
  // 문서 탭 (/doc/...)
  if (tab.path.startsWith('/doc/')) {
    return 'wiki';
  }
  
  return null;
}

/**
 * DMS 콘텐츠 영역
 * 
 * PMS 패턴:
 * - pageComponents 매핑으로 동적 페이지 로딩
 * - Suspense로 로딩 상태 처리
 * - 각 페이지 컴포넌트가 자체적으로 데이터 로드
 */
export function ContentArea() {
  const { activeTabId, tabs } = useTabStore();
  
  // 활성 탭 찾기
  const activeTab = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTabId);
  }, [tabs, activeTabId]);

  // 페이지 타입 결정
  const pageType = getPageType(activeTab);

  // 탭이 없을 때
  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">탭을 선택해주세요.</p>
      </div>
    );
  }

  // 알 수 없는 페이지 타입
  if (!pageType) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">
          알 수 없는 페이지입니다. (경로: {activeTab.path})
        </p>
      </div>
    );
  }

  // 페이지 컴포넌트 선택
  const PageComponent = pageComponents[pageType];

  // Suspense로 동적 로딩
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageComponent />
    </Suspense>
  );
}
