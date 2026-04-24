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

const ANONYMOUS_PROFILE_KEY: SettingsProfileKey = 'anonymous';

class PersonalSettingsService {
  private settingsCache: Map<string, DmsPersonalSettings> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dbClient: any = null;
  private dbReady = false;

  // --------------------------------------------------------------------------
  // DB Integration
  // --------------------------------------------------------------------------

  async initFromDb(dbClient: { dmsConfig: unknown }): Promise<void> {
    this.dbClient = dbClient;
    this.dbReady = true;
    logger.info('개인 설정 DB 연결 완료');
  }

  private async loadFromDb(userId: string): Promise<DmsPersonalSettings | null> {
    if (!this.dbClient) return null;
    try {
      const row = await (this.dbClient.dmsConfig as { findFirst: (args: unknown) => Promise<{ configData: unknown } | null> }).findFirst({
        where: { scopeCode: 'personal', ownerRef: userId, isActive: true },
      });
      if (row && row.configData && typeof row.configData === 'object') {
        return row.configData as unknown as DmsPersonalSettings;
      }
    } catch (error) {
      logger.error('DB에서 개인 설정 로드 실패', error);
    }
    return null;
  }

  private async saveToDb(userId: string, settings: DmsPersonalSettings): Promise<void> {
    if (!this.dbClient) return;
    try {
      const existing = await (this.dbClient.dmsConfig as { findFirst: (args: unknown) => Promise<{ configId: bigint } | null> }).findFirst({
        where: { scopeCode: 'personal', ownerRef: userId },
      });
      const data = JSON.parse(JSON.stringify(settings));
      if (existing) {
        await (this.dbClient.dmsConfig as { update: (args: unknown) => Promise<unknown> }).update({
          where: { configId: existing.configId },
          data: { configData: data },
        });
      } else {
        await (this.dbClient.dmsConfig as { create: (args: unknown) => Promise<unknown> }).create({
          data: { scopeCode: 'personal', ownerRef: userId, configData: data },
        });
      }
    } catch (error) {
      logger.error('DB에 개인 설정 저장 실패', error);
    }
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  getProfileKey(): SettingsProfileKey {
    return ANONYMOUS_PROFILE_KEY;
  }

  getAccessMode(): SettingsAccessMode {
    return 'anonymous-first';
  }

  /** 동기 읽기 (캐시에서). 캐시 미스 시 하드코딩 defaults 반환. */
  getSettings(userId?: string): DmsPersonalSettings {
    const key = userId || ANONYMOUS_PROFILE_KEY;
    const cached = this.settingsCache.get(key);
    if (cached) return cached;

    const defaults = this.getDefaults();
    this.settingsCache.set(key, defaults);
    return defaults;
  }

  /** 비동기 읽기 (DB에서 프리로드). */
  async loadSettingsForUser(userId: string): Promise<DmsPersonalSettings> {
    if (this.dbReady) {
      const fromDb = await this.loadFromDb(userId);
      if (fromDb) {
        const defaults = this.getDefaults();
        const merged = this.deepMerge(
          defaults as unknown as Record<string, unknown>,
          fromDb as unknown as Record<string, unknown>,
        ) as unknown as DmsPersonalSettings;
        this.settingsCache.set(userId, merged);
        return merged;
      }
    }
    const defaults = this.getDefaults();
    this.settingsCache.set(userId, defaults);
    return defaults;
  }

  /** 비동기 업데이트 (DB에 저장). */
  async updateSettingsForUser(userId: string, partial: DeepPartial<DmsPersonalSettings>): Promise<DmsPersonalSettings> {
    const current = await this.loadSettingsForUser(userId);
    const merged = this.deepMerge(
      current as unknown as Record<string, unknown>,
      partial as unknown as Record<string, unknown>,
    ) as unknown as DmsPersonalSettings;
    this.settingsCache.set(userId, merged);
    if (this.dbReady) {
      await this.saveToDb(userId, merged);
    }
    return merged;
  }

  /** @deprecated 레거시 동기 업데이트. DB 모드에서는 updateSettingsForUser 사용 */
  updateSettings(partial: DeepPartial<DmsPersonalSettings>): DmsPersonalSettings {
    const current = this.getSettings();
    const merged = this.deepMerge(
      current as unknown as Record<string, unknown>,
      partial as unknown as Record<string, unknown>
    ) as unknown as DmsPersonalSettings;
    this.settingsCache.set(ANONYMOUS_PROFILE_KEY, merged);
    return merged;
  }

  getAuthorIdentity(userId?: string): { name: string; email: string } {
    const settings = this.getSettings(userId);
    const legacyAuthor = configService.getGitAuthor();

    return {
      name: settings.identity.displayName.trim() || legacyAuthor.name,
      email: settings.identity.email.trim() || legacyAuthor.email,
    };
  }

  invalidateCache(userId?: string): void {
    if (userId) {
      this.settingsCache.delete(userId);
    } else {
      this.settingsCache.clear();
    }
  }

  /** 하드코딩 기본값 (단일 정본). DB에 없을 때 사용. */
  private getDefaults(): DmsPersonalSettings {
    const legacyAuthor = configService.getGitAuthor();
    return {
      identity: {
        displayName: legacyAuthor.name || 'Anonymous',
        email: legacyAuthor.email || 'anonymous@dms.local',
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
