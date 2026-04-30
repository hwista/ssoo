'use client';

import * as React from 'react';
import { ShellFrame } from '@ssoo/web-shell';
import { ChevronRight } from 'lucide-react';
import { useAuthStore, useLayoutStore, useSidebarStore, useTabStore } from '@/stores';
import { LAYOUT_SIZES } from '@/lib/constants/layout';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Header } from './Header';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';
import { SettingsShellContent, SettingsShellHeader, SettingsShellSidebar } from './settings/Shell';
import { useSettingsShellStore, useSettingsStore } from '@/stores';

// 본문 영역 최소 너비 (Viewer와 동일)
const DOCUMENT_MIN_WIDTH = 975;

/**
 * DMS 메인 앱 레이아웃
 * - Desktop: Sidebar + Header + TabBar + Content
 * - Mobile: 별도 UI (추후 개발)
 * - Compact Mode: 사이드바 접힘 + 오버레이
 *
 * Note: 브라우저 공개 진입점은 `/` 하나만 사용하며,
 * 내부 탭 기반 화면 전환은 ContentArea가 담당한다.
 */
export function AppLayout() {
  const sidebarSections = React.useMemo(() => ['bookmarks', 'openTabs', 'fileTree', 'changes'] as const, []);
  const { deviceType } = useLayoutStore();
  const { isCompactMode, sidebarOpen, setCompactMode, toggleSidebar, setSidebarOpen, setExpandedSections } = useSidebarStore();
  const isSettingsShellActive = useSettingsShellStore((state) => state.isActive);
  const applyWorkspacePreferences = useSettingsShellStore((state) => state.applyWorkspacePreferences);
  const settingsConfig = useSettingsStore((state) => state.config);
  const isSettingsLoaded = useSettingsStore((state) => state.isLoaded);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  // 창 크기에 따른 컴팩트 모드 자동 전환
  React.useEffect(() => {
    const checkCompactMode = () => {
      // 사이드바를 제외한 가용 너비 계산
      const availableWidth = window.innerWidth - LAYOUT_SIZES.sidebar.expandedWidth;
      // 본문 최소 너비보다 작으면 컴팩트 모드
      const shouldBeCompact = availableWidth < DOCUMENT_MIN_WIDTH;
      setCompactMode(shouldBeCompact);
    };

    checkCompactMode();
    window.addEventListener('resize', checkCompactMode);
    return () => window.removeEventListener('resize', checkCompactMode);
  }, [setCompactMode]);

  React.useEffect(() => {
    if (isSettingsLoaded) return;
    void loadSettings();
  }, [isSettingsLoaded, loadSettings]);

  React.useEffect(() => {
    const workspace = settingsConfig?.personal.workspace;
    if (!workspace) return;
    applyWorkspacePreferences(workspace);
  }, [applyWorkspacePreferences, settingsConfig]);

  React.useEffect(() => {
    const sections = settingsConfig?.personal.sidebar?.sections;
    if (!sections) return;

    const nextExpandedSections = sidebarSections.filter((section) => sections[section]);

    setExpandedSections([...nextExpandedSections]);
  }, [setExpandedSections, settingsConfig, sidebarSections]);

  // 로그인 사용자 변경 시 이전 사용자의 탭을 초기화 (zustand persist 가 user-scope 가 아니라
  // 다른 계정으로 로그인해도 이전 사용자의 탭이 그대로 보이는 문제 해결).
  // ownerUserId 는 persist 에 보존되므로 새로고침 후 다른 계정 로그인 시점에도 비교 가능.
  const currentUserId = useAuthStore((state) => state.user?.userId);
  const tabOwnerUserId = useTabStore((state) => state.ownerUserId);
  const closeAllTabs = useTabStore((state) => state.closeAllTabs);
  const setTabOwnerUserId = useTabStore((state) => state.setOwnerUserId);
  React.useEffect(() => {
    if (!currentUserId) return;
    if (tabOwnerUserId && tabOwnerUserId !== currentUserId) {
      closeAllTabs();
    }
    if (tabOwnerUserId !== currentUserId) {
      setTabOwnerUserId(currentUserId);
    }
  }, [currentUserId, tabOwnerUserId, closeAllTabs, setTabOwnerUserId]);

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
    <ShellFrame
      sidebar={
        isSettingsShellActive ? (
          <SettingsShellSidebar
            isCompactMode={isCompactMode}
            isOpen={!isCompactMode || sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        ) : (
          <Sidebar
            isCompactMode={isCompactMode}
            isOpen={!isCompactMode || sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )
      }
      overlay={
        isCompactMode && sidebarOpen ? (
          <div className="fixed inset-0 z-20 bg-black/20 transition-opacity" onClick={() => setSidebarOpen(false)} />
        ) : undefined
      }
      floatingStart={
        isCompactMode && !sidebarOpen ? (
          <button
            onClick={toggleSidebar}
            className={cn(
              'fixed left-0 top-1/2 z-30 flex h-12 w-5 -translate-y-1/2 items-center justify-center rounded-r-md',
              'border border-l-0 border-ssoo-content-border bg-ssoo-content-bg shadow-sm transition-all duration-300 ease-in-out',
              'hover:bg-ssoo-content-border/50'
            )}
            aria-label="사이드바 펼치기"
          >
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        ) : undefined
      }
      mainOffset={isCompactMode ? 0 : LAYOUT_SIZES.sidebar.expandedWidth}
    >
      {isSettingsShellActive ? (
        <>
          <SettingsShellHeader />
          <SettingsShellContent />
        </>
      ) : (
        <>
          <Header />
          <TabBar />
          <ContentArea />
        </>
      )}
    </ShellFrame>
  );
}
