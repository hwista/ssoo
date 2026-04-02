'use client';

import { create } from 'zustand';
import type { PreferredSettingsViewMode, SettingsScope, SettingsViewMode } from '@/types/settings';

const DEFAULT_SECTION_BY_SCOPE: Record<SettingsScope, string> = {
  system: 'git',
  personal: 'identity',
};

interface SettingsShellState {
  isActive: boolean;
  activeScope: SettingsScope;
  activeSectionId: string;
  activeViewMode: SettingsViewMode;
  lastSectionByScope: Record<SettingsScope, string>;
  preferredScope: SettingsScope;
  preferredViewMode: PreferredSettingsViewMode;
  preferredShowDiff: boolean;
}

interface SettingsShellActions {
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

export const useSettingsShellStore = create<SettingsShellState & SettingsShellActions>((set, get) => ({
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
