import type { DmsConfig, DeepPartial } from '@/server/services/config/ConfigService';
import { fail } from '@/server/shared/result';
import { settingsService } from '@/server/services/settings/SettingsService';

interface SettingsAction {
  action: 'update' | 'updateGitPath';
  config?: DeepPartial<DmsConfig>;
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
      return fail(`Unknown action: ${action}`, 400);
  }
}
