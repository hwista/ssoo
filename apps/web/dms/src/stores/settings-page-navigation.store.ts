'use client';

import { create } from 'zustand';
import type { PreferredSettingsViewMode, SettingsScope, SettingsViewMode } from '@/types/settings';
import { isUserScopeTransition, registerUserScopedReset } from '@/lib/user-scope';
import { useTabStore } from './tab.store';

const DEFAULT_SECTION_BY_SCOPE: Record<SettingsScope, string> = {
  system: 'git',
  personal: 'identity',
};

const SETTINGS_TAB_PATH_PREFIX = '/settings/';

function parseSettingsTabPath(path: string | null | undefined): { scope: SettingsScope; sectionId: string } | null {
  if (!path?.startsWith(SETTINGS_TAB_PATH_PREFIX)) {
    return null;
  }

  const [, , scope, sectionId] = path.split('/');
  if ((scope !== 'system' && scope !== 'personal') || !sectionId) {
    return null;
  }

  return { scope, sectionId };
}

interface SettingsPageNavigationState {
  isActive: boolean;
  activeScope: SettingsScope;
  activeSectionId: string;
  activeViewMode: SettingsViewMode;
  lastSectionByScope: Record<SettingsScope, string>;
  preferredScope: SettingsScope;
  preferredViewMode: PreferredSettingsViewMode;
  preferredShowDiff: boolean;
}

interface SettingsPageNavigationActions {
  enterSettings: (scope?: SettingsScope) => void;
  exitSettings: () => void;
  openSection: (scope: SettingsScope, sectionId: string) => void;
  setScope: (scope: SettingsScope) => void;
  setSection: (sectionId: string) => void;
  setViewMode: (mode: SettingsViewMode) => void;
  applyWorkspacePreferences: (preferences: {
    defaultSettingsScope: SettingsScope;
    defaultSettingsView: PreferredSettingsViewMode;
    showDiffByDefault: boolean;
  }) => void;
}

export const useSettingsPageNavigationStore = create<SettingsPageNavigationState & SettingsPageNavigationActions>((set, get) => ({
  isActive: false,
  activeScope: 'system',
  activeSectionId: DEFAULT_SECTION_BY_SCOPE.system,
  activeViewMode: 'structured',
  lastSectionByScope: { ...DEFAULT_SECTION_BY_SCOPE },
  preferredScope: 'system',
  preferredViewMode: 'structured',
  preferredShowDiff: false,

  enterSettings: (scope) => {
    const nextScope = scope ?? get().preferredScope;
    const nextSectionId = get().lastSectionByScope[nextScope] ?? DEFAULT_SECTION_BY_SCOPE[nextScope];
    set({
      isActive: true,
      activeScope: nextScope,
      activeSectionId: nextSectionId,
      activeViewMode: get().preferredShowDiff ? 'diff' : get().preferredViewMode,
    });
  },

  exitSettings: () => {
    set({ isActive: false });
  },

  openSection: (scope, sectionId) => {
    set((state) => ({
      isActive: true,
      activeScope: scope,
      activeSectionId: sectionId,
      lastSectionByScope: {
        ...state.lastSectionByScope,
        [scope]: sectionId,
      },
    }));
  },

  setScope: (scope) => {
    set((state) => ({
      activeScope: scope,
      activeSectionId: state.lastSectionByScope[scope] ?? DEFAULT_SECTION_BY_SCOPE[scope],
    }));
  },

  setSection: (sectionId) => {
    set((state) => ({
      activeSectionId: sectionId,
      lastSectionByScope: {
        ...state.lastSectionByScope,
        [state.activeScope]: sectionId,
      },
    }));
  },

  setViewMode: (mode) => {
    set({ activeViewMode: mode });
  },

  applyWorkspacePreferences: (preferences) => {
    set({
      preferredScope: preferences.defaultSettingsScope,
      preferredViewMode: preferences.defaultSettingsView,
      preferredShowDiff: preferences.showDiffByDefault,
    });
  },
}));

useTabStore.subscribe((tabState, previousTabState) => {
  if (tabState.activeTabId === previousTabState.activeTabId && tabState.tabs === previousTabState.tabs) {
    return;
  }

  const activeTab = tabState.tabs.find((tab) => tab.id === tabState.activeTabId);
  const settingsTarget = parseSettingsTabPath(activeTab?.path);
  const navigation = useSettingsPageNavigationStore.getState();

  if (settingsTarget) {
    if (
      navigation.isActive
      && navigation.activeScope === settingsTarget.scope
      && navigation.activeSectionId === settingsTarget.sectionId
    ) {
      return;
    }

    useSettingsPageNavigationStore.setState((state) => ({
      isActive: true,
      activeScope: settingsTarget.scope,
      activeSectionId: settingsTarget.sectionId,
      lastSectionByScope: {
        ...state.lastSectionByScope,
        [settingsTarget.scope]: settingsTarget.sectionId,
      },
    }));
    return;
  }

  if (activeTab?.path === '/settings') {
    if (!navigation.isActive) {
      useSettingsPageNavigationStore.setState({ isActive: true });
    }
    return;
  }

  if (navigation.isActive) {
    useSettingsPageNavigationStore.setState({ isActive: false });
  }
});

// 사용자 변경 시 설정 모드와 내부 선택 상태 초기화 (cross-user 잔존 방지)
registerUserScopedReset((next, prev) => {
  if (isUserScopeTransition(next, prev)) {
    useSettingsPageNavigationStore.setState({
      isActive: false,
      activeScope: 'system',
      activeSectionId: DEFAULT_SECTION_BY_SCOPE.system,
      activeViewMode: 'structured',
      lastSectionByScope: { ...DEFAULT_SECTION_BY_SCOPE },
    });
  }
});
