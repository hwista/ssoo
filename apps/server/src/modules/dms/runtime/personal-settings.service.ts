import fs from 'fs';
import path from 'path';
import type { DeepPartial, StorageProvider } from './dms-config.service.js';
import { configService } from './dms-config.service.js';
import { createDmsLogger } from './dms-logger.js';
import type {
  PreferredSettingsViewMode,
  SettingsAccessMode,
  SettingsProfileKey,
  SettingsScope,
} from './settings.types.js';

const logger = createDmsLogger('DmsPersonalSettingsService');

export interface PersonalIdentitySettings {
  displayName: string;
  email: string;
}

export interface PersonalWorkspaceSettings {
  defaultSettingsScope: SettingsScope;
  defaultSettingsView: PreferredSettingsViewMode;
  showDiffByDefault: boolean;
  preferredStorageProvider: StorageProvider | 'system-default';
}

export interface PersonalViewerSettings {
  defaultZoom: number;
}

export interface PersonalSidebarSectionsSettings {
  bookmarks: boolean;
  openTabs: boolean;
  fileTree: boolean;
  changes: boolean;
}

export interface PersonalSidebarSettings {
  sections: PersonalSidebarSectionsSettings;
}

export interface DmsPersonalSettings {
  identity: PersonalIdentitySettings;
  workspace: PersonalWorkspaceSettings;
  viewer: PersonalViewerSettings;
  sidebar: PersonalSidebarSettings;
}

const PERSONAL_SETTINGS_FILE = 'dms.personal.config.json';
const DEFAULT_PERSONAL_SETTINGS_FILE = 'dms.personal.config.default.json';
const ANONYMOUS_PROFILE_KEY: SettingsProfileKey = 'anonymous';

class PersonalSettingsService {
  private settings: DmsPersonalSettings | null = null;
  private readonly settingsPath: string;
  private readonly defaultSettingsPath: string;

  constructor() {
    const appRoot = configService.getAppRoot();
    this.settingsPath = path.join(appRoot, PERSONAL_SETTINGS_FILE);
    this.defaultSettingsPath = path.join(appRoot, DEFAULT_PERSONAL_SETTINGS_FILE);
  }

  getProfileKey(): SettingsProfileKey {
    return ANONYMOUS_PROFILE_KEY;
  }

  getAccessMode(): SettingsAccessMode {
    return 'anonymous-first';
  }

  getSettings(): DmsPersonalSettings {
    if (!this.settings) {
      this.settings = this.loadSettings();
    }
    return this.settings;
  }

  updateSettings(partial: DeepPartial<DmsPersonalSettings>): DmsPersonalSettings {
    const current = this.getSettings();
    const merged = this.deepMerge(
      current as unknown as Record<string, unknown>,
      partial as unknown as Record<string, unknown>
    ) as unknown as DmsPersonalSettings;
    this.saveSettings(merged);
    this.settings = merged;
    return merged;
  }

  getAuthorIdentity(): { name: string; email: string } {
    const settings = this.getSettings();
    const legacyAuthor = configService.getGitAuthor();

    return {
      name: settings.identity.displayName.trim() || legacyAuthor.name,
      email: settings.identity.email.trim() || legacyAuthor.email,
    };
  }

  invalidateCache(): void {
    this.settings = null;
  }

  private loadSettings(): DmsPersonalSettings {
    const defaults = this.loadDefaults();

    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = fs.readFileSync(this.settingsPath, 'utf-8');
        const userSettings = JSON.parse(raw) as DeepPartial<DmsPersonalSettings>;
        const merged = this.deepMerge(
          defaults as unknown as Record<string, unknown>,
          userSettings as unknown as Record<string, unknown>
        ) as unknown as DmsPersonalSettings;
        logger.info('개인 설정 로드 완료', { path: this.settingsPath, profileKey: ANONYMOUS_PROFILE_KEY });
        return merged;
      }
    } catch (error) {
      logger.error('개인 설정 파일 로드 실패, 기본값 사용', error);
    }

    return defaults;
  }

  private loadDefaults(): DmsPersonalSettings {
    try {
      if (fs.existsSync(this.defaultSettingsPath)) {
        const raw = fs.readFileSync(this.defaultSettingsPath, 'utf-8');
        return JSON.parse(raw) as DmsPersonalSettings;
      }
    } catch (error) {
      logger.error('개인 설정 기본 파일 로드 실패', error);
    }

    const legacyAuthor = configService.getGitAuthor();
    return {
      identity: {
        displayName: legacyAuthor.name,
        email: legacyAuthor.email,
      },
      workspace: {
        defaultSettingsScope: 'system',
        defaultSettingsView: 'structured',
        showDiffByDefault: false,
        preferredStorageProvider: 'system-default',
      },
      viewer: {
        defaultZoom: 100,
      },
      sidebar: {
        sections: {
          bookmarks: true,
          openTabs: false,
          fileTree: true,
          changes: false,
        },
      },
    };
  }

  private saveSettings(settings: DmsPersonalSettings): void {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
      logger.info('개인 설정 저장 완료', { path: this.settingsPath, profileKey: ANONYMOUS_PROFILE_KEY });
    } catch (error) {
      logger.error('개인 설정 저장 실패', error);
      throw new Error('개인 설정 파일 저장에 실패했습니다.');
    }
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };

    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue !== null &&
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
        return;
      }

      if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    });

    return result;
  }
}

export const personalSettingsService = new PersonalSettingsService();
