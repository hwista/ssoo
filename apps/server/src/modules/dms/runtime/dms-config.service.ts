/**
 * Config Service - DMS 설정 관리
 *
 * 역할:
 * - dms.config.json 읽기/쓰기
 * - dms.config.default.json 기본값 병합
 * - 문서 데이터 디렉토리(= Git 저장소 경로) 제공
 */

import fs from 'fs';
import path from 'path';
import { createDmsLogger } from './dms-logger.js';
const logger = createDmsLogger('DmsConfigService');

// ============================================================================
// Types
// ============================================================================

export interface GitConfig {
  /** 문서 Git 저장소 경로 (= 문서 데이터 디렉토리) */
  repositoryPath: string;
  /**
   * @deprecated 개인화 설정으로 이전된 레거시 작성자 정보
   * 기존 dms.config.json 하위 호환을 위해 optional 로만 유지합니다.
   */
  author?: {
    name: string;
    email: string;
  };
  /** 경로에 .git이 없을 때 자동 git init */
  autoInit: boolean;
}

export type StorageProvider = 'local' | 'sharepoint' | 'nas';

export interface StorageProviderConfig {
  enabled: boolean;
  basePath: string;
  webBaseUrl?: string;
}

export interface StorageConfig {
  defaultProvider: StorageProvider;
  local: StorageProviderConfig;
  sharepoint: StorageProviderConfig;
  nas: StorageProviderConfig;
}

export interface IngestConfig {
  queuePath: string;
  autoPublish: boolean;
  maxConcurrentJobs: number;
}

export interface ExtractionConfig {
  /** 텍스트 추출 상한 (자) */
  maxTextLength: number;
  /** 문서당 최대 추출 이미지 수 */
  maxImages: number;
  /** 추출 이미지 최대 크기 (MB) */
  maxImageSizeMb: number;
  /** PDF 페이지 렌더링 수 */
  pdfMaxRenderPages: number;
  /** PDF 렌더링 스케일 (1.0 = 원본, 2.0 = 2배) */
  pdfRenderScale: number;
}

export interface UploadConfig {
  attachmentMaxSizeMb: number;
  imageMaxSizeMb: number;
}

export interface SearchConfig {
  maxResults: number;
  semanticThreshold: number;
  chunkSize: number;
  chunkOverlap: number;
  summaryConcurrency: number;
}

export interface DocAssistConfig {
  maxCurrentContentChars: number;
  maxTemplateChars: number;
  maxSummaryFileCount: number;
  maxSummaryFileChars: number;
  maxImagesPerRequest: number;
}

export type M365AuthMode = 'anonymous-first' | 'organization-sso';
export type M365IdentityMapping = 'mail' | 'userPrincipalName' | 'displayName';

export interface M365SharePointConfig {
  tenantDomain: string;
  sitePath: string;
  defaultLibrary: string;
}

export interface M365TeamsConfig {
  enabled: boolean;
  ingestEnabled: boolean;
  defaultTeam: string;
  defaultChannel: string;
  defaultDropPath: string;
}

export interface M365AuthConfig {
  mode: M365AuthMode;
  allowedTenantIds: string[];
  allowedDomains: string[];
  identityMapping: M365IdentityMapping;
}

export interface M365Config {
  sharepoint: M365SharePointConfig;
  teams: M365TeamsConfig;
  auth: M365AuthConfig;
}

export interface DmsConfig {
  git: GitConfig;
  storage: StorageConfig;
  ingest: IngestConfig;
  extraction: ExtractionConfig;
  uploads: UploadConfig;
  search: SearchConfig;
  docAssist: DocAssistConfig;
  m365: M365Config;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// Constants
// ============================================================================

const CONFIG_FILE = 'dms.config.json';
const DEFAULT_CONFIG_FILE = 'dms.config.default.json';

// ============================================================================
// Config Service
// ============================================================================

class ConfigService {
  private config: DmsConfig | null = null;
  private readonly appRoot: string;
  private configPath: string;
  private defaultConfigPath: string;

  constructor() {
    this.appRoot = this.resolveAppRoot();
    this.configPath = path.join(this.appRoot, CONFIG_FILE);
    this.defaultConfigPath = path.join(this.appRoot, DEFAULT_CONFIG_FILE);
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

  getAppRoot(): string {
    return this.appRoot;
  }

  /** 문서 데이터 디렉토리 (= Git 저장소 경로) */
  getDocDir(): string {
    const repositoryPath = this.getConfig().git.repositoryPath?.trim();
    if (!repositoryPath) {
      return path.join(this.getAppRoot(), 'data', 'documents');
    }

    return path.isAbsolute(repositoryPath)
      ? repositoryPath
      : path.resolve(this.getAppRoot(), repositoryPath);
  }

  /** Git 작성자 정보 */
  getGitAuthor(): { name: string; email: string } {
    const author = this.getConfig().git.author;
    return {
      name: author?.name?.trim() || 'DMS System',
      email: author?.email?.trim() || 'dms@localhost',
    };
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

  private resolveAppRoot(): string {
    const candidates = [
      path.join(process.cwd(), 'apps', 'web', 'dms'),
      path.resolve(process.cwd(), '..', 'web', 'dms'),
      path.resolve(process.cwd(), '..', '..', 'apps', 'web', 'dms'),
    ];

    return candidates.find((candidate) => (
      fs.existsSync(path.join(candidate, DEFAULT_CONFIG_FILE))
    )) || candidates[0];
  }

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
    const appRoot = this.getAppRoot();

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
        autoInit: true,
      },
        storage: {
          defaultProvider: 'sharepoint',
          local: {
            enabled: true,
            basePath: path.join(appRoot, 'data', 'storage', 'local'),
          },
        sharepoint: {
          enabled: true,
          basePath: '/sites/dms/shared-documents',
          webBaseUrl: 'https://sharepoint.local',
        },
        nas: {
          enabled: true,
          basePath: '/mnt/nas/dms',
          webBaseUrl: 'file:///mnt/nas/dms',
        },
      },
        ingest: {
          queuePath: path.join(appRoot, 'data', 'ingest'),
          autoPublish: false,
          maxConcurrentJobs: 2,
        },
      extraction: {
        maxTextLength: 12000,
        maxImages: 5,
        maxImageSizeMb: 1,
        pdfMaxRenderPages: 3,
        pdfRenderScale: 1.0,
      },
      uploads: {
        attachmentMaxSizeMb: 20,
        imageMaxSizeMb: 10,
      },
      search: {
        maxResults: 100,
        semanticThreshold: 0.5,
        chunkSize: 1000,
        chunkOverlap: 200,
        summaryConcurrency: 3,
      },
      docAssist: {
        maxCurrentContentChars: 6000,
        maxTemplateChars: 1500,
        maxSummaryFileCount: 2,
        maxSummaryFileChars: 2000,
        maxImagesPerRequest: 5,
      },
      m365: {
        sharepoint: {
          tenantDomain: '',
          sitePath: '/sites/dms',
          defaultLibrary: 'shared-documents',
        },
        teams: {
          enabled: false,
          ingestEnabled: false,
          defaultTeam: '',
          defaultChannel: '',
          defaultDropPath: '',
        },
        auth: {
          mode: 'anonymous-first',
          allowedTenantIds: [],
          allowedDomains: [],
          identityMapping: 'mail',
        },
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
