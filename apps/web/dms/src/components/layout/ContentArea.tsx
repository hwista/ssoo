'use client';

import { lazy, Suspense, type ComponentType } from 'react';
import { useTabStore, HOME_TAB } from '@/stores';
import { LoadingState } from '@/components/common/StateDisplay';
import { AiChatPage } from '@/components/pages/ai/ChatPage';
import { TabInstanceProvider } from './tab-instance/TabInstanceContext';

/**
 * 페이지 컴포넌트 매핑
 * - React.lazy로 동적 import
 * - 코드 분할로 초기 로딩 최적화
 */
function lazyWithChunkRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const loaded = await importer();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('dms_chunk_retry_once');
      }
      return loaded;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChunkError = /ChunkLoadError|Loading chunk .* failed/i.test(message);

      if (isChunkError && typeof window !== 'undefined') {
        const retried = window.sessionStorage.getItem('dms_chunk_retry_once');
        if (!retried) {
          window.sessionStorage.setItem('dms_chunk_retry_once', '1');
          window.location.reload();
          return new Promise(() => {
            // page reload until settled
          });
        }
      }

      throw error;
    }
  });
}

const pageComponents = {
  home: lazyWithChunkRetry(() => import('@/components/pages/home/DashboardPage').then(m => ({ default: m.DashboardPage }))),
  markdown: lazyWithChunkRetry(() => import('@/components/pages/markdown/DocumentPage').then(m => ({ default: m.DocumentPage }))),
  aiChat: AiChatPage,
  aiSearch: lazyWithChunkRetry(() => import('@/components/pages/ai/SearchPage').then(m => ({ default: m.AiSearchPage }))),
  settings: lazyWithChunkRetry(() => import('@/components/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage }))),
};

/**
 * 로딩 컴포넌트
 */
function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <LoadingState message="로딩 중..." fullHeight />
    </div>
  );
}

/**
 * 탭 경로에서 페이지 타입 결정
 */
function getPageType(tab: { id: string; path: string } | undefined): keyof typeof pageComponents | null {
  if (!tab) return null;
  
  if (tab.id === HOME_TAB.id) return 'home';
  if (tab.path.startsWith('/doc/')) return 'markdown';
  if (tab.path.startsWith('/wiki/new')) return 'markdown';
  if (tab.path.startsWith('/ai/chat')) return 'aiChat';
  if (tab.path.startsWith('/ai/search')) return 'aiSearch';
  if (tab.path === '/settings') return 'settings';
  
  return null;
}

/**
 * DMS 콘텐츠 영역 (Keep-Alive MDI)
 * 
 * - 모든 열린 탭의 컴포넌트를 동시에 마운트
 * - 비활성 탭은 CSS display:none으로 숨김 (DOM 유지)
 * - TabInstanceProvider로 각 페이지에 자신의 tabId 주입
 * - 탭 전환 시 unmount/remount 없이 상태 보존
 *   → 스크롤 위치, 에디터 내용, 채팅 기록, 검색 결과 유지
 */
export function ContentArea() {
  const { activeTabId, tabs } = useTabStore();

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">탭을 선택해주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      {tabs.map((tab) => {
        const pageType = getPageType(tab);
        const isActive = tab.id === activeTabId;

        // 알 수 없는 페이지 타입
        if (!pageType) {
          return (
            <div
              key={tab.id}
              className={`absolute inset-0 flex items-center justify-center bg-white ${isActive ? '' : 'hidden'}`}
            >
              <p className="text-gray-500">
                알 수 없는 페이지입니다. (경로: {tab.path})
              </p>
            </div>
          );
        }

        const PageComponent = pageComponents[pageType];

        return (
          <div
            key={tab.id}
            className={`absolute inset-0 overflow-hidden ${isActive ? '' : 'hidden'}`}
          >
            <TabInstanceProvider tabId={tab.id}>
              <Suspense fallback={<LoadingFallback />}>
                <PageComponent />
              </Suspense>
            </TabInstanceProvider>
          </div>
        );
      })}
    </div>
  );
}
