'use client';

import type { OpenTabOptions } from '@/types/tab';
import type { SettingsScope } from '@/types/settings';
import {
  getSettingSection,
  SETTINGS_SCOPE_LABELS,
} from '../_config/settingsPageConfig';

export const SETTINGS_TAB_PATH_PREFIX = '/settings/';

export interface SettingsTabTarget {
  scope: SettingsScope;
  sectionId: string;
}

export function getSettingsTabId(scope: SettingsScope, sectionId: string) {
  return `settings-${scope}-${sectionId}`;
}

export function getSettingsTabPath(scope: SettingsScope, sectionId: string) {
  return `${SETTINGS_TAB_PATH_PREFIX}${scope}/${sectionId}`;
}

export function parseSettingsTabPath(path: string): SettingsTabTarget | null {
  if (!path.startsWith(SETTINGS_TAB_PATH_PREFIX)) {
    return null;
  }

  const [, , scope, sectionId] = path.split('/');
  if ((scope !== 'system' && scope !== 'personal') || !sectionId) {
    return null;
  }

  return { scope, sectionId };
}

export function isSettingsTabPath(path: string) {
  return path === '/settings' || parseSettingsTabPath(path) !== null;
}

export function getSettingsTabOptions(scope: SettingsScope, sectionId: string): OpenTabOptions {
  const section = getSettingSection(scope, sectionId);

  return {
    id: getSettingsTabId(scope, sectionId),
    title: section?.label ?? SETTINGS_SCOPE_LABELS[scope],
    path: getSettingsTabPath(scope, sectionId),
    icon: 'Settings',
    closable: true,
    activate: true,
  };
}
