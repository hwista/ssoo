/**
 * Settings Handler - DMS 설정 관리 핸들러
 * Route: /api/settings
 *
 * GET: 현재 설정 조회
 * POST 액션:
 * - update: 설정 업데이트
 * - updateGitPath: Git 저장소 경로 변경 (파일 복사 + Git init 포함)
 */

import fs from 'fs';
import path from 'path';
import { configService, type DmsConfig, type DeepPartial } from '@/server/services/config/ConfigService';
import { gitService } from '@/server/services/git/GitService';
import { logger } from '@/lib/utils/errorUtils';

// ============================================================================
// Types
// ============================================================================

interface SettingsAction {
  action: 'update' | 'updateGitPath';
  config?: DeepPartial<DmsConfig>;
  newPath?: string;
  copyFiles?: boolean;
}

// ============================================================================
// Handlers
// ============================================================================

/** GET /api/settings - 현재 설정 조회 */
export function handleGetSettings(): {
  config: DmsConfig;
  wikiDir: string;
} {
  return {
    config: configService.getConfig(),
    wikiDir: configService.getWikiDir(),
  };
}

/** POST /api/settings - 설정 액션 처리 */
export async function handleSettingsAction(body: SettingsAction): Promise<{
  success: boolean;
  config?: DmsConfig;
  wikiDir?: string;
  error?: string;
}> {
  const { action } = body;

  switch (action) {
    case 'update':
      return handleUpdate(body.config);

    case 'updateGitPath':
      return handleUpdateGitPath(body.newPath, body.copyFiles);

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

/** 일반 설정 업데이트 */
function handleUpdate(partial?: DeepPartial<DmsConfig>): {
  success: boolean;
  config: DmsConfig;
  wikiDir: string;
} {
  if (!partial) {
    return {
      success: true,
      config: configService.getConfig(),
      wikiDir: configService.getWikiDir(),
    };
  }

  const updated = configService.updateConfig(partial);
  return {
    success: true,
    config: updated,
    wikiDir: configService.getWikiDir(),
  };
}

/** Git 저장소 경로 변경 (파일 복사 + Git 재초기화) */
async function handleUpdateGitPath(
  newPath?: string,
  copyFiles?: boolean
): Promise<{
  success: boolean;
  config?: DmsConfig;
  wikiDir?: string;
  error?: string;
}> {
  if (!newPath) {
    return { success: false, error: '새 저장소 경로가 필요합니다.' };
  }

  // 경로 정규화
  const resolvedPath = path.resolve(newPath);

  // 현재 위키 디렉토리
  const currentDir = configService.getWikiDir();

  try {
    // 1. 새 디렉토리가 없으면 생성
    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
      logger.info('새 위키 디렉토리 생성', { path: resolvedPath });
    }

    // 2. 파일 복사 (요청 시)
    if (copyFiles && currentDir !== resolvedPath && fs.existsSync(currentDir)) {
      await copyDirectoryContents(currentDir, resolvedPath);
      logger.info('위키 파일 복사 완료', { from: currentDir, to: resolvedPath });
    }

    // 3. 설정 저장
    const updated = configService.updateConfig({
      git: { repositoryPath: resolvedPath },
    });

    // 4. GitService 재초기화
    gitService.reconfigure(resolvedPath);
    const initResult = await gitService.initialize();
    if (!initResult.success) {
      logger.warn('Git 재초기화 경고', { error: initResult.error });
    }

    return {
      success: true,
      config: updated,
      wikiDir: resolvedPath,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Git 경로 변경 실패', error);
    return { success: false, error: msg };
  }
}

// ============================================================================
// Utils
// ============================================================================

/** 디렉토리 내용 재귀 복사 (.git 제외) */
async function copyDirectoryContents(src: string, dest: string): Promise<void> {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    // .git 디렉토리는 복사하지 않음
    if (entry.name === '.git') continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      await copyDirectoryContents(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
