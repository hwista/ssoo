import type { DeepPartial } from '@/server/services/config/ConfigService';
import type { DmsSettingsConfig } from '@/server/services/settings/SettingsService';
import { settingsService } from '@/server/services/settings/SettingsService';

interface SettingsAction {
  action: 'update' | 'updateGitPath';
  config?: DeepPartial<DmsSettingsConfig>;
  newPath?: string;
  copyFiles?: boolean;
}

export function handleGetSettings() {
  return settingsService.getSettings();
}

export async function handleSettingsAction(body: SettingsAction) {
  const { action } = body;

  switch (action) {
    case 'update':
      return settingsService.updateSettings(body.config);
    case 'updateGitPath':
      return settingsService.updateGitPath(body.newPath, body.copyFiles);
    default:
      return { success: false as const, error: `Unknown action: ${action}` };
  }
}
