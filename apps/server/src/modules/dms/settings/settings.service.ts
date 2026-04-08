import fs from 'fs';
import path from 'path';
import type { DeepPartial, DmsConfig } from '../runtime/dms-config.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { personalSettingsService, type DmsPersonalSettings } from '../runtime/personal-settings.service.js';
import { gitService } from '../runtime/git.service.js';
import type { SettingsAccessMode, SettingsProfileKey } from '../runtime/settings.types.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
const logger = createDmsLogger('DmsSettingsService');

export type DmsSystemConfig = Omit<DmsConfig, 'git'> & {
  git: Omit<DmsConfig['git'], 'author'>;
};

export interface SettingsAccessInfo {
  mode: SettingsAccessMode;
  profileKey: SettingsProfileKey;
  canManageSystem: boolean;
  canManagePersonal: boolean;
}

export interface DmsSettingsConfig {
  system: DmsSystemConfig;
  personal: DmsPersonalSettings;
}

export interface SettingsSnapshot {
  config: DmsSettingsConfig;
  docDir: string;
  access: SettingsAccessInfo;
}

export type SettingsServiceResult =
  | ({ success: true } & SettingsSnapshot)
  | { success: false; error: string };

function sanitizeSystemConfig(config: DmsConfig): DmsSystemConfig {
  const { author, ...git } = config.git;
  void author;
  return {
    ...config,
    git,
  };
}

class SettingsService {
  getSettings(): SettingsSnapshot {
    return {
      config: {
        system: sanitizeSystemConfig(configService.getConfig()),
        personal: personalSettingsService.getSettings(),
      },
      docDir: configService.getDocDir(),
      access: {
        mode: personalSettingsService.getAccessMode(),
        profileKey: personalSettingsService.getProfileKey(),
        canManageSystem: true,
        canManagePersonal: true,
      },
    };
  }

  updateSettings(partial?: DeepPartial<DmsSettingsConfig>): SettingsServiceResult {
    if (!partial) {
      return { success: true, ...this.getSettings() };
    }

    if (partial.system) {
      configService.updateConfig(partial.system);
    }
    if (partial.personal) {
      personalSettingsService.updateSettings(partial.personal);
    }

    return {
      success: true,
      ...this.getSettings(),
    };
  }

  async updateGitPath(newPath?: string, copyFiles?: boolean): Promise<SettingsServiceResult> {
    if (!newPath) {
      return { success: false, error: '새 저장소 경로가 필요합니다.' };
    }

    const resolvedPath = path.resolve(newPath);
    const currentDir = configService.getDocDir();

    try {
      if (!fs.existsSync(resolvedPath)) {
        fs.mkdirSync(resolvedPath, { recursive: true });
        logger.info('새 문서 디렉토리 생성', { path: resolvedPath });
      }

      if (copyFiles && currentDir !== resolvedPath && fs.existsSync(currentDir)) {
        await this.copyDirectoryContents(currentDir, resolvedPath);
        logger.info('문서 파일 복사 완료', { from: currentDir, to: resolvedPath });
      }

      configService.updateConfig({
        git: { repositoryPath: resolvedPath },
      });

      gitService.reconfigure(resolvedPath);
      const initResult = await gitService.initialize();
      if (!initResult.success) {
        logger.warn('Git 재초기화 경고', { error: initResult.error });
      }

      return {
        success: true,
        ...this.getSettings(),
        docDir: resolvedPath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Git 경로 변경 실패', error);
      return { success: false, error: message };
    }
  }

  private async copyDirectoryContents(src: string, dest: string): Promise<void> {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === '.git') continue;

      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        await this.copyDirectoryContents(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

export const settingsService = new SettingsService();
