'use client';

import * as React from 'react';
import { SsooAppFrame } from '@ssoo/web-shell';
import { useAuthStore, useLayoutStore, useSettingsShellStore, useSettingsStore, useSidebarStore } from '@/stores';
import { LAYOUT_SIZES } from '@/lib/constants/layout';
import { Sidebar } from './sidebar';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';
import { SettingsShellContent, SettingsShellHeader, SettingsShellSidebar } from './settings/Shell';

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
  const isSettingsShellActive = useSettingsShellStore((state) => state.isActive);
  const applyWorkspacePreferences = useSettingsShellStore((state) => state.applyWorkspacePreferences);
  const settingsConfig = useSettingsStore((state) => state.config);
  const isSettingsLoaded = useSettingsStore((state) => state.isLoaded);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  React.useEffect(() => {
    if (!currentUserId || isSettingsLoaded) return;
    void loadSettings();
  }, [currentUserId, isSettingsLoaded, loadSettings]);

  React.useEffect(() => {
    const workspace = settingsConfig?.personal.workspace;
    if (!workspace) return;
    applyWorkspacePreferences(workspace);
  }, [applyWorkspacePreferences, settingsConfig]);

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
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8">
          <h1 className="heading-1 mb-2">모바일 버전 준비 중</h1>
          <p className="text-gray-600">데스크톱에서 접속해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <SsooAppFrame
      mode="document"
      sidebarMode="collapsible"
      sidebarExpanded={sidebarOpen}
      sidebarWidth={LAYOUT_SIZES.sidebar.expandedWidth}
      collapsedSidebarWidth={LAYOUT_SIZES.sidebar.collapsedWidth}
      sidebarSlot={
        isSettingsShellActive ? (
          <SettingsShellSidebar
            isCollapsed={!sidebarOpen}
            onToggleCollapse={toggleSidebar}
          />
        ) : (
          <Sidebar
            key={`dms-sidebar-${currentUserId ?? 'anonymous'}-${fileTreeResetEpoch}`}
            isCollapsed={!sidebarOpen}
            onToggleCollapse={toggleSidebar}
          />
        )
      }
      contentClassName="bg-background"
      headerSlot={isSettingsShellActive ? <SettingsShellHeader /> : <Header />}
      tabBarSlot={isSettingsShellActive ? undefined : <TabBar />}
      contentSlot={isSettingsShellActive ? <SettingsShellContent /> : <ContentArea />}
    />
  );
}
