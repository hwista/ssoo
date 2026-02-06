'use client';

import { Suspense, lazy } from 'react';
import { useTabStore } from '@/stores';
import { LoadingState } from '@/components/common/StateDisplay';

// 페이지 컴포넌트 동적 import (named export 사용)
const pageComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  '/home': lazy(() => import('@/components/pages/home/DashboardPage').then(m => ({ default: m.HomeDashboardPage }))),
  '/request': lazy(() => import('@/components/pages/request/ListPage').then(m => ({ default: m.RequestListPage }))),
  '/request/create': lazy(() => import('@/components/pages/request/CreatePage').then(m => ({ default: m.RequestCreatePage }))),
  '/proposal': lazy(() => import('@/components/pages/proposal/ListPage').then(m => ({ default: m.ProposalListPage }))),
  '/execution': lazy(() => import('@/components/pages/execution/ListPage').then(m => ({ default: m.ExecutionListPage }))),
  '/transition': lazy(() => import('@/components/pages/transition/ListPage').then(m => ({ default: m.TransitionListPage }))),
};

/**
 * 메인 콘텐츠 영역
 * - 탭 시스템 전용: URL 직접 접근 미지원
 * - 활성화된 탭의 컨텐츠 표시
 * - Home 탭이 항상 존재하므로 빈 상태는 발생하지 않음
 */
export function ContentArea() {
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // activeTab이 있으면 해당 페이지 컴포넌트를 렌더링
  if (activeTab && activeTab.path) {
    const PageComponent = pageComponents[activeTab.path];
    
    if (PageComponent) {
      return (
        <div className="flex-1 overflow-auto bg-white">
          <Suspense fallback={<LoadingState message="페이지 로딩 중..." fullHeight />}>
            <PageComponent />
          </Suspense>
        </div>
      );
    }
  }

  // activeTab이 없거나 path가 없는 경우 (정상적으로는 발생하지 않음)
  if (!activeTab || !activeTab.path) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">탭을 선택하세요.</p>
      </div>
    );
  }

  // 등록되지 않은 페이지 컴포넌트인 경우
  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="p-6">
        <h1 className="heading-1 text-gray-800 mb-4">
          {activeTab.title}
        </h1>
        <p className="text-gray-500">
          페이지 준비 중: {activeTab.path}
        </p>
      </div>
    </div>
  );
}
