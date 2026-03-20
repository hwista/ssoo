import fs from 'fs';
import path from 'path';
import { configService, type DmsConfig, type DeepPartial } from '@/server/services/config/ConfigService';
import { gitService } from '@/server/services/git/GitService';
import { logger } from '@/lib/utils/errorUtils';

export interface SettingsSnapshot {
  config: DmsConfig;
  docDir: string;
}

export type SettingsServiceResult =
  | ({ success: true } & SettingsSnapshot)
  | { success: false; error: string };

class SettingsService {
  getSettings(): SettingsSnapshot {
    return {
      config: configService.getConfig(),
      docDir: configService.getDocDir(),
    };
  }

  updateSettings(partial?: DeepPartial<DmsConfig>): SettingsServiceResult {
    if (!partial) {
      return { success: true, ...this.getSettings() };
    }

    const updated = configService.updateConfig(partial);
    return {
      success: true,
      config: updated,
      docDir: configService.getDocDir(),
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

      const updated = configService.updateConfig({
        git: { repositoryPath: resolvedPath },
      });

      gitService.reconfigure(resolvedPath);
      const initResult = await gitService.initialize();
      if (!initResult.success) {
        logger.warn('Git 재초기화 경고', { error: initResult.error });
      }

      return {
        success: true,
        config: updated,
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
