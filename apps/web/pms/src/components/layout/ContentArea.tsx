'use client';

import { Suspense, lazy } from 'react';
import { useTabStore } from '@/stores';
import { LoadingState } from '@/components/common/StateDisplay';
import { TabContext } from '@/hooks/useCurrentTab';

// 페이지 컴포넌트 동적 import (named export 사용)
const pageComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  '/home': lazy(() => import('@/components/pages/home/DashboardPage').then(m => ({ default: m.HomeDashboardPage }))),
  '/request': lazy(() => import('@/components/pages/request/ListPage').then(m => ({ default: m.RequestListPage }))),
  '/request/create': lazy(() => import('@/components/pages/request/CreatePage').then(m => ({ default: m.RequestCreatePage }))),
  '/proposal': lazy(() => import('@/components/pages/proposal/ListPage').then(m => ({ default: m.ProposalListPage }))),
  '/execution': lazy(() => import('@/components/pages/execution/ListPage').then(m => ({ default: m.ExecutionListPage }))),
  '/transition': lazy(() => import('@/components/pages/transition/ListPage').then(m => ({ default: m.TransitionListPage }))),
  '/project/detail': lazy(() => import('@/components/pages/project/DetailPage').then(m => ({ default: m.ProjectDetailPage }))),
};

/**
 * 메인 콘텐츠 영역 (Keep-Alive MDI)
 * 
 * - 모든 열린 탭의 컴포넌트를 동시에 마운트
 * - 비활성 탭은 CSS display:none으로 숨김 (DOM 유지)
 * - 탭 전환 시 unmount/remount 없이 상태 보존
 *   → 스크롤 위치, 폼 입력, 페이지네이션, 검색 필터 유지
 */
export function ContentArea() {
  const { tabs, activeTabId } = useTabStore();

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">탭을 선택하세요.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      {tabs.map((tab) => {
        if (!tab.path) return null;

        const PageComponent = pageComponents[tab.path];
        const isActive = tab.id === activeTabId;

        // 등록되지 않은 페이지 컴포넌트인 경우
        if (!PageComponent) {
          return (
            <div
              key={tab.id}
              className={`absolute inset-0 overflow-auto bg-white ${isActive ? '' : 'hidden'}`}
            >
              <div className="p-6">
                <h1 className="heading-1 text-gray-800 mb-4">
                  {tab.title}
                </h1>
                <p className="text-gray-500">
                  페이지 준비 중: {tab.path}
                </p>
              </div>
            </div>
          );
        }

        return (
          <div
            key={tab.id}
            className={`absolute inset-0 overflow-auto bg-white ${isActive ? '' : 'hidden'}`}
          >
            <TabContext.Provider value={tab}>
              <Suspense fallback={<LoadingState message="페이지 로딩 중..." fullHeight />}>
                <PageComponent />
              </Suspense>
            </TabContext.Provider>
          </div>
        );
      })}
    </div>
  );
}
