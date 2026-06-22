'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SsooAppFrame,
  SsooContentAreaState,
  getSsooGlobalSearchQueryFromPath,
  getSsooGlobalSearchTitle,
} from '@ssoo/web-shell';
import { useAuthStore, useLayoutStore, useSettingsPageNavigationStore, useSettingsStore, useSidebarStore, useTabStore } from '@/stores';
import { parseSettingsTabPath } from '@/components/pages/settings/_utils/settingsNavigation';
import { Sidebar } from './sidebar';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';

/**
 * DMS 메인 앱 레이아웃
 * - Desktop: Sidebar + Header + TabBar + Content
 * - Mobile: 별도 UI (추후 개발)
 * - Sidebar: 공통 toggle + collapsed hover expand
 *
 * Note: 브라우저 공개 진입점은 `/` 하나만 사용하며,
 * 내부 탭 기반 화면 전환은 ContentArea가 담당한다.
 */
export function AppLayout() {
  const sidebarAutoExpandSections = React.useMemo(() => ['bookmarks', 'openTabs', 'changes'] as const, []);
  const { deviceType } = useLayoutStore();
  const { sidebarOpen, toggleSidebar, setExpandedSections } = useSidebarStore();
  const fileTreeResetEpoch = useSidebarStore((state) => state.fileTreeResetEpoch);
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const applyWorkspacePreferences = useSettingsPageNavigationStore((state) => state.applyWorkspacePreferences);
  const isSettingsModeActive = useSettingsPageNavigationStore((state) => state.isActive);
  const openSettingsSection = useSettingsPageNavigationStore((state) => state.openSection);
  const exitSettings = useSettingsPageNavigationStore((state) => state.exitSettings);
  const activeTabPath = useTabStore((state) => {
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);
    return activeTab?.path ?? null;
  });
  const openTab = useTabStore((state) => state.openTab);
  const updateTab = useTabStore((state) => state.updateTab);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRoutePath = React.useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);
  const settingsConfig = useSettingsStore((state) => state.config);
  const isSettingsLoaded = useSettingsStore((state) => state.isLoaded);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  React.useEffect(() => {
    if (!currentUserId || isSettingsLoaded) return;
    void loadSettings();
  }, [currentUserId, isSettingsLoaded, loadSettings]);

  React.useEffect(() => {
    if (!currentRoutePath.startsWith(SSOO_GLOBAL_SEARCH_APP_PATH)) {
      return;
    }

    const query = getSsooGlobalSearchQueryFromPath(currentRoutePath);
    const tabId = openTab({
      id: 'global-search',
      title: getSsooGlobalSearchTitle(query),
      path: currentRoutePath,
      icon: 'Search',
      closable: true,
      activate: true,
    });
    if (tabId) {
      updateTab(tabId, {
        title: getSsooGlobalSearchTitle(query),
        path: currentRoutePath,
        icon: 'Search',
      });
    }
  }, [currentRoutePath, openTab, updateTab]);

  React.useEffect(() => {
    const workspace = settingsConfig?.personal.workspace;
    if (!workspace) return;
    applyWorkspacePreferences(workspace);
  }, [applyWorkspacePreferences, settingsConfig]);

  React.useLayoutEffect(() => {
    if (isSettingsModeActive || !activeTabPath) return;
    const settingsTabTarget = parseSettingsTabPath(activeTabPath);
    if (!settingsTabTarget) return;
    openSettingsSection(settingsTabTarget.scope, settingsTabTarget.sectionId);
  }, [activeTabPath, isSettingsModeActive, openSettingsSection]);

  React.useLayoutEffect(() => {
    if (!isSettingsModeActive) return;
    if (activeTabPath && parseSettingsTabPath(activeTabPath)) return;
    exitSettings();
  }, [activeTabPath, exitSettings, isSettingsModeActive]);

  React.useEffect(() => {
    const sections = settingsConfig?.personal.sidebar?.sections;
    if (!sections) return;

    const nextExpandedSections = sidebarAutoExpandSections.filter((section) => sections[section]);

    setExpandedSections([...nextExpandedSections]);
  }, [setExpandedSections, settingsConfig, sidebarAutoExpandSections]);

  // 사용자 변경 시 client-side state 일괄 cleanup 은 `lib/user-scope` 의 registry 가 처리.
  // 각 store 가 자체 등록 → useAuthStore 변경을 zustand subscribe 가 감지 → 모든 listener emit.
  // AppLayout 이 직접 selector/effect 를 보유하지 않음 — 새 store 추가 시 그 store 파일 안에서
  // registerUserScopedReset 한 번 호출로 자동 합류.

  // 모바일은 별도 UI (추후 개발)
  if (deviceType === 'mobile') {
    return (
      <SsooAppFrame
        mode="content-only"
        contentSlot={(
          <SsooContentAreaState
            title="모바일 버전 준비 중"
            description="데스크톱에서 접속해주세요."
          />
        )}
      />
    );
  }

  return (
    <SsooAppFrame
      mode="document"
      sidebarMode="collapsible"
      sidebarExpanded={sidebarOpen}
      sidebarSlot={
        <Sidebar
          key={`dms-sidebar-${isSettingsModeActive ? 'settings' : 'workspace'}-${currentUserId ?? 'anonymous'}-${fileTreeResetEpoch}`}
          variant={isSettingsModeActive ? 'settings' : 'workspace'}
          isCollapsed={!sidebarOpen}
          onToggleCollapse={toggleSidebar}
        />
      }
      headerSlot={<Header variant={isSettingsModeActive ? 'settings' : 'workspace'} />}
      tabBarSlot={<TabBar />}
      contentSlot={<ContentArea />}
    />
  );
}
