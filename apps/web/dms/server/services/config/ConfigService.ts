/**
 * Config Service - DMS 설정 관리
 *
 * 역할:
 * - dms.config.json 읽기/쓰기
 * - dms.config.default.json 기본값 병합
 * - 위키 데이터 디렉토리(= Git 저장소 경로) 제공
 */

import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/utils/errorUtils';

// ============================================================================
// Types
// ============================================================================

export interface GitConfig {
  /** 위키 Git 저장소 경로 (= 위키 데이터 디렉토리) */
  repositoryPath: string;
  /** 커밋 작성자 정보 */
  author: {
    name: string;
    email: string;
  };
  /** 경로에 .git이 없을 때 자동 git init */
  autoInit: boolean;
}

export interface DmsConfig {
  git: GitConfig;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// Constants
// ============================================================================

const CONFIG_FILE = 'dms.config.json';
const DEFAULT_CONFIG_FILE = 'dms.config.default.json';

/** 설정 파일이 없을 때 사용하는 폴백 기본 경로 */
const FALLBACK_WIKI_DIR = path.join(process.cwd(), 'docs', 'wiki');

// ============================================================================
// Config Service
// ============================================================================

class ConfigService {
  private config: DmsConfig | null = null;
  private configPath: string;
  private defaultConfigPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), CONFIG_FILE);
    this.defaultConfigPath = path.join(process.cwd(), DEFAULT_CONFIG_FILE);
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** 전체 설정 조회 */
  getConfig(): DmsConfig {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  /** 설정 업데이트 (부분 업데이트 지원) */
  updateConfig(partial: DeepPartial<DmsConfig>): DmsConfig {
    const current = this.getConfig();
    const merged = this.deepMerge(
      current as unknown as Record<string, unknown>,
      partial as unknown as Record<string, unknown>
    ) as unknown as DmsConfig;
    this.saveConfig(merged);
    this.config = merged;
    return merged;
  }

  /** 위키 데이터 디렉토리 (= Git 저장소 경로) */
  getWikiDir(): string {
    const config = this.getConfig();
    return config.git.repositoryPath || FALLBACK_WIKI_DIR;
  }

  /** Git 작성자 정보 */
  getGitAuthor(): { name: string; email: string } {
    return this.getConfig().git.author;
  }

  /** Git 자동 초기화 여부 */
  getAutoInit(): boolean {
    return this.getConfig().git.autoInit;
  }

  /** 캐시 무효화 (설정 파일이 외부에서 변경된 경우) */
  invalidateCache(): void {
    this.config = null;
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private loadConfig(): DmsConfig {
    const defaults = this.loadDefaults();

    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const userConfig = JSON.parse(raw) as DeepPartial<DmsConfig>;
        const merged = this.deepMerge(
          defaults as unknown as Record<string, unknown>,
          userConfig as unknown as Record<string, unknown>
        ) as unknown as DmsConfig;
        logger.info('설정 로드 완료', { path: this.configPath });
        return merged;
      }
    } catch (error) {
      logger.error('설정 파일 로드 실패, 기본값 사용', error);
    }

    return defaults;
  }

  private loadDefaults(): DmsConfig {
    try {
      if (fs.existsSync(this.defaultConfigPath)) {
        const raw = fs.readFileSync(this.defaultConfigPath, 'utf-8');
        return JSON.parse(raw) as DmsConfig;
      }
    } catch (error) {
      logger.error('기본 설정 파일 로드 실패', error);
    }

    // 하드코딩 폴백
    return {
      git: {
        repositoryPath: '',
        author: { name: 'DMS System', email: 'dms@localhost' },
        autoInit: true,
      },
    };
  }

  private saveConfig(config: DmsConfig): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
      logger.info('설정 저장 완료', { path: this.configPath });
    } catch (error) {
      logger.error('설정 저장 실패', error);
      throw new Error('설정 파일 저장에 실패했습니다.');
    }
  }

  /** 깊은 병합 (배열은 덮어쓰기) */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      const targetVal = target[key];

      if (
        sourceVal !== null &&
        sourceVal !== undefined &&
        typeof sourceVal === 'object' &&
        !Array.isArray(sourceVal) &&
        typeof targetVal === 'object' &&
        targetVal !== null &&
        !Array.isArray(targetVal)
      ) {
        result[key] = this.deepMerge(
          targetVal as Record<string, unknown>,
          sourceVal as Record<string, unknown>
        );
      } else if (sourceVal !== undefined) {
        result[key] = sourceVal;
      }
    }

    return result;
  }
}

/** 싱글톤 인스턴스 */
export const configService = new ConfigService();
