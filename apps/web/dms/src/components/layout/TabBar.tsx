'use client';

import { useSettingsPageNavigationStore, useTabStore, HOME_TAB } from '@/stores';
import { useAssistantPanelStore, useConfirmStore } from '@/stores';
import { useEditorMultiStore } from '@/stores/editor-core.store';
import { SsooMdiTabBar } from '@ssoo/web-shell';
import { X, Minimize2, ChevronLeft, ChevronRight, Home, FileText, Bot, Search, Sparkles, FileSearch, Settings, FilePenLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { isSettingsTabPath } from '@/components/pages/settings/_utils/settingsNavigation';

/**
 * DMS 탭바 컴포넌트
 * - 열린 문서 탭 목록 표시
 * - 탭 활성화, 닫기
 * - 스크롤 네비게이션
 * - 드래그로 탭 순서 변경
 */
export function TabBar() {
  const { tabs, activeTabId, activateTab, closeTab, reorderTabs } = useTabStore();
  const exitSettings = useSettingsPageNavigationStore((state) => state.exitSettings);
  const openPanel = useAssistantPanelStore((state) => state.openPanel);
  const { confirm } = useConfirmStore();
  const editors = useEditorMultiStore((state) => state.editors);

  // 탭 아이콘 결정 (tab.icon 필드 기반)
  const TAB_ICON_MAP: Record<string, LucideIcon> = {
    Home,
    Bot,
    Search,
    FileSearch,
    Sparkles,
    FileText,
    Settings,
  };

  const getTabIcon = (tab: typeof tabs[0]): LucideIcon => {
    if (tab.id === HOME_TAB.id) return Home;
    if (tab.icon && TAB_ICON_MAP[tab.icon]) return TAB_ICON_MAP[tab.icon];
    return FileText;
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <SsooMdiTabBar
      tabs={tabs}
      activeTabId={activeTabId}
      homeTabId={HOME_TAB.id}
      leftControlIconSlot={<ChevronLeft />}
      rightControlIconSlot={<ChevronRight />}
      getTabIcon={(tab) => {
        if (tab.isEditing) {
          return <FilePenLine />;
        }
        const IconComponent = getTabIcon(tab);
        return <IconComponent />;
      }}
      getTabIconTone={(tab) => (tab.isEditing ? 'editing' : 'default')}
      getTabModified={(tab) => Boolean(editors[tab.id]?.hasUnsavedChanges)}
      getTabStatusTone={(tab) => (
        tab.isEditing
          ? (editors[tab.id]?.hasUnsavedChanges ? 'danger' : 'primary')
          : 'transparent'
      )}
      getTabActionIcon={(tab) => (
        tab.closable
          ? (tab.path.startsWith('/ai/chat') ? <Minimize2 /> : <X />)
          : null
      )}
      onActivateTab={(tab) => activateTab(tab.id)}
      onActionTab={async (tab, event) => {
        event.stopPropagation();
        if (tab.path.startsWith('/ai/chat')) {
          closeTab(tab.id);
          openPanel();
          return;
        }
        if (editors[tab.id]?.hasUnsavedChanges) {
          const confirmed = await confirm({
            title: '변경사항 폐기',
            description: '저장하지 않은 변경사항이 있습니다. 정말로 진행하시겠습니까?',
            confirmText: '확인',
            cancelText: '돌아가기',
          });
          if (!confirmed) return;
        }
        const isClosingActiveSettingsTab = tab.id === activeTabId && isSettingsTabPath(tab.path);
        const settingsTabs = tabs.filter((candidate) => isSettingsTabPath(candidate.path));
        const remainingSettingsTabs = settingsTabs.filter((candidate) => candidate.id !== tab.id);
        const closedSettingsIndex = settingsTabs.findIndex((candidate) => candidate.id === tab.id);
        const nextSettingsTab = remainingSettingsTabs[Math.min(closedSettingsIndex, remainingSettingsTabs.length - 1)];

        closeTab(tab.id);

        if (isClosingActiveSettingsTab) {
          if (nextSettingsTab) {
            activateTab(nextSettingsTab.id);
          } else {
            exitSettings();
            activateTab(HOME_TAB.id);
          }
        }
      }}
      onReorderTabs={(fromIndex, toIndex) => {
        const fromTab = tabs[fromIndex];
        const toTab = tabs[toIndex];
        if (!fromTab || !toTab) return;
        reorderTabs(fromIndex, toIndex);
      }}
    />
  );
}
