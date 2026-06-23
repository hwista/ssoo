'use client';

import { lazy, Suspense, type ComponentType, useEffect } from 'react';
import { useSettingsPageNavigationStore, useSettingsStore, useTabStore, HOME_TAB } from '@/stores';
import type { TabItem } from '@/types/tab';
import { AiChatPage } from '@/components/pages/ai/ChatPage';
import {
  getSettingsTabOptions,
  parseSettingsTabPath,
} from '@/components/pages/settings/_utils/settingsNavigation';
import { TabInstanceProvider } from './tab-instance/TabInstanceContext';
import { useTabInstanceId } from './tab-instance/TabInstanceContext';
import {
  SSOO_CONTENT_PAGE_ADAPTER_NAMES,
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SsooContentAreaEmptyState,
  SsooContentAreaState,
  SsooRegisteredMdiContentArea,
  createSsooContentPageAdapterElement,
  defineSsooMdiPageRegistry,
} from '@ssoo/web-shell';
import {
  createSsooUserSurfaceRouteContentPageElement,
  parseSsooUserSurfaceRoute,
} from '@ssoo/web-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const DMS_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.dmsPageTemplate;
const GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.globalSearchPage;
const ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME = SSOO_CONTENT_PAGE_ADAPTER_NAMES.routeHandoffPage;

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
  globalSearch: lazyWithChunkRetry(() => import('@/components/pages/global-search/GlobalSearchPage').then(m => ({ default: m.DmsGlobalSearchPage }))),
  myAccessRequests: LegacyAccessRequestsRedirect,
  legacySettings: LegacySettingsRedirect,
  settings: lazyWithChunkRetry(() => import('@/components/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage }))),
};

/**
 * 로딩 컴포넌트
 */
function LoadingFallback() {
  return (
    <SsooContentAreaState variant="loading" tone="default">로딩 중...</SsooContentAreaState>
  );
}

function LegacyAccessRequestsRedirect() {
  const tabId = useTabInstanceId();
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const enterSettings = useSettingsPageNavigationStore((state) => state.enterSettings);
  const openSection = useSettingsPageNavigationStore((state) => state.openSection);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    if (activeTabId !== tabId) {
      return;
    }

    void (async () => {
      await loadSettings();
      const settingsAccess = useSettingsStore.getState().access;
      if (settingsAccess?.canManageSystem) {
        openSection('system', 'documentAccess');
        openTab(getSettingsTabOptions('system', 'documentAccess'));
      } else {
        enterSettings('personal');
        const settingsNavigation = useSettingsPageNavigationStore.getState();
        openTab(getSettingsTabOptions(settingsNavigation.activeScope, settingsNavigation.activeSectionId));
      }
      closeTab(tabId);
    })();
  }, [activeTabId, closeTab, enterSettings, loadSettings, openSection, openTab, tabId]);

  return (
    <SsooContentAreaState variant="loading" tone="default">
      권한 요청/승인 화면으로 이동 중...
    </SsooContentAreaState>
  );
}

function LegacySettingsRedirect() {
  const tabId = useTabInstanceId();
  const activeTabId = useTabStore((state) => state.activeTabId);
  const openTab = useTabStore((state) => state.openTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const enterSettings = useSettingsPageNavigationStore((state) => state.enterSettings);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    if (activeTabId !== tabId) {
      return;
    }

    void (async () => {
      await loadSettings();
      const settingsAccess = useSettingsStore.getState().access;
      enterSettings(settingsAccess?.canManageSystem ? undefined : 'personal');
      const settingsNavigation = useSettingsPageNavigationStore.getState();
      openTab(getSettingsTabOptions(settingsNavigation.activeScope, settingsNavigation.activeSectionId));
      closeTab(tabId);
    })();
  }, [activeTabId, closeTab, enterSettings, loadSettings, openTab, tabId]);

  return (
    <SsooContentAreaState variant="loading" tone="default">
      설정 화면으로 이동 중...
    </SsooContentAreaState>
  );
}

function renderDmsPageComponent(pageType: keyof typeof pageComponents, tabId: string) {
  const PageComponent = pageComponents[pageType];

  return (
    <TabInstanceProvider tabId={tabId}>
      <Suspense fallback={<LoadingFallback />}>
        <PageComponent />
      </Suspense>
    </TabInstanceProvider>
  );
}

function renderDmsContentPageComponent(pageType: keyof typeof pageComponents, tabId: string) {
  return createSsooContentPageAdapterElement({
    adapterName: DMS_CONTENT_PAGE_ADAPTER_NAME,
    children: renderDmsPageComponent(pageType, tabId),
  });
}

function renderDmsGlobalSearchContentPageComponent(tabId: string) {
  return createSsooContentPageAdapterElement({
    adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME,
    children: renderDmsPageComponent('globalSearch', tabId),
  });
}

function renderDmsUserSurfaceContentPage(
  tab: TabItem,
  openTab: ReturnType<typeof useTabStore.getState>['openTab'],
) {
  return createSsooUserSurfaceRouteContentPageElement({
    path: tab.path,
    title: tab.title,
    apiBaseUrl: API_BASE_URL,
    onOpenProfileTab: openTab,
    wrapChildren: (children) => (
      <TabInstanceProvider tabId={tab.id}>
        {children}
      </TabInstanceProvider>
    ),
  });
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
  const openTab = useTabStore((state) => state.openTab);
  const pageRoutes = defineSsooMdiPageRegistry<TabItem>([
    {
      key: 'user-surface',
      kind: 'contentPage',
      template: 'SsooContentPageTemplate',
      match: (tab) => Boolean(parseSsooUserSurfaceRoute(tab.path)),
      render: ({ tab }) => renderDmsUserSurfaceContentPage(tab, openTab),
    },
    {
      key: 'document-page',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: DMS_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => tab.path.startsWith('/doc/') || tab.path.startsWith('/doc/new'),
      render: ({ tabId }) => renderDmsContentPageComponent('markdown', tabId),
    },
    {
      key: 'settings-page',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: DMS_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => Boolean(parseSettingsTabPath(tab.path)),
      render: ({ tabId }) => renderDmsContentPageComponent('settings', tabId),
    },
    {
      key: 'ai-chat-page',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: DMS_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => tab.path.startsWith('/ai/chat'),
      render: ({ tabId }) => renderDmsContentPageComponent('aiChat', tabId),
    },
    {
      key: 'legacy-access-requests-handoff',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => tab.path.startsWith('/access-requests/me'),
      render: ({ tabId }) => createSsooContentPageAdapterElement({
        adapterName: ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME,
        children: renderDmsPageComponent('myAccessRequests', tabId),
      }),
    },
    {
      key: 'legacy-settings-handoff',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => tab.path === '/settings',
      render: ({ tabId }) => createSsooContentPageAdapterElement({
        adapterName: ROUTE_HANDOFF_CONTENT_PAGE_ADAPTER_NAME,
        children: renderDmsPageComponent('legacySettings', tabId),
      }),
    },
    {
      key: 'dms-home-page',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: DMS_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => tab.id === HOME_TAB.id,
      render: ({ tabId }) => renderDmsContentPageComponent('home', tabId),
    },
    {
      key: 'global-search-page',
      kind: 'contentPage',
      template: 'domainAdapter',
      adapterName: GLOBAL_SEARCH_CONTENT_PAGE_ADAPTER_NAME,
      match: (tab) => tab.path.startsWith(SSOO_GLOBAL_SEARCH_APP_PATH),
      render: ({ tabId }) => renderDmsGlobalSearchContentPageComponent(tabId),
    },
  ]);

  if (tabs.length === 0) {
    return (
      <SsooContentAreaEmptyState tone="default">탭을 선택해주세요.</SsooContentAreaEmptyState>
    );
  }

  return (
    <SsooRegisteredMdiContentArea
      tabs={tabs}
      activeTabId={activeTabId}
      getTabId={(tab) => tab.id}
      routes={pageRoutes}
      unknownRouteSlot={(tab) => (
        <SsooContentAreaState
          title="알 수 없는 페이지입니다."
          description={`경로: ${tab.path}`}
        />
      )}
    />
  );
}
