/**
 * Config Service - DMS 설정 관리
 *
 * 역할:
 * - dms.config.json 읽기/쓰기
 * - dms.config.default.json 기본값 병합
 * - markdown working tree / binary storage / ingest / template runtime 경로 제공
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDmsLogger } from './dms-logger.js';
const logger = createDmsLogger('DmsConfigService');

// ============================================================================
// Types
// ============================================================================

export interface GitConfig {
  /** markdown Git working tree 경로 (= 실제 서비스 markdown runtime root) */
  repositoryPath: string;
  /** empty working tree bootstrap 용 canonical remote URL */
  bootstrapRemoteUrl?: string;
  /** bootstrap clone/init 후 우선 사용할 branch */
  bootstrapBranch?: string;
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

/**
 * 템플릿 설정.
 * rootPath 는 더 이상 독립 경로가 아니며, markdownRoot/_templates 로 자동 파생됩니다.
 * 기존 config 파일 하위 호환을 위해 interface 는 유지하되 런타임에서 무시합니다.
 */
export interface TemplateConfig {
  /** @deprecated ignored — templates live at markdownRoot/_templates */
  rootPath?: string;
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
  templates: TemplateConfig;
  extraction: ExtractionConfig;
  uploads: UploadConfig;
  search: SearchConfig;
  docAssist: DocAssistConfig;
  m365: M365Config;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RuntimePathSource = 'config' | 'env';

export interface RuntimePathBindingInfo {
  appRoot: string;
  configuredPath: string;
  effectiveInput: string;
  resolvedPath: string;
  relativeToAppRoot: boolean;
  source: RuntimePathSource;
  envVar?: string;
}

export type DocumentRootBindingInfo = RuntimePathBindingInfo;

// ============================================================================
// Constants
// ============================================================================

const CONFIG_FILE = 'dms.config.json';
const DEFAULT_CONFIG_FILE = 'dms.config.default.json';
export const DEFAULT_DOCUMENT_REPOSITORY_PATH = '../../../.runtime/dms/documents';
/** @deprecated templates are now derived from markdownRoot/_templates */
export const DEFAULT_TEMPLATE_ROOT_PATH = '_templates';
export const TEMPLATE_SUBDIR = '_templates';
export const DEFAULT_INGEST_QUEUE_PATH = '../../../.runtime/dms/ingest';
export const DEFAULT_LOCAL_STORAGE_ROOT_PATH = '../../../.runtime/dms/storage/local';
export const DEFAULT_SHAREPOINT_STORAGE_BASE_PATH = '/sites/dms/shared-documents';
export const DEFAULT_NAS_STORAGE_BASE_PATH = '/mnt/nas/dms';

const RUNTIME_PATH_ENV_KEYS = {
  markdownRoot: 'DMS_MARKDOWN_ROOT',
  ingestQueuePath: 'DMS_INGEST_QUEUE_PATH',
  storageLocalBasePath: 'DMS_STORAGE_LOCAL_BASE_PATH',
  storageSharepointBasePath: 'DMS_STORAGE_SHAREPOINT_BASE_PATH',
  storageNasBasePath: 'DMS_STORAGE_NAS_BASE_PATH',
} as const;

type RuntimePathEnvKey = (typeof RUNTIME_PATH_ENV_KEYS)[keyof typeof RUNTIME_PATH_ENV_KEYS];

interface NormalizeConfigResult {
  config: DmsConfig;
  usedDefaultRepositoryPath: boolean;
}

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
    const normalized = this.normalizeConfig(merged, this.loadDefaults());
    this.saveConfig(normalized.config);
    this.config = normalized.config;
    return normalized.config;
  }

  getAppRoot(): string {
    return this.appRoot;
  }

  /** markdown working tree root (= configured Git repository path) */
  getDocDir(): string {
    return this.getDocumentRootBinding().resolvedPath;
  }

  getDocumentRootBinding(): DocumentRootBindingInfo {
    return this.getRuntimePathBinding(
      this.getConfig().git.repositoryPath,
      DEFAULT_DOCUMENT_REPOSITORY_PATH,
      RUNTIME_PATH_ENV_KEYS.markdownRoot,
    );
  }

  /** 템플릿 디렉토리 — markdownRoot/_templates 에서 파생 */
  getTemplateDir(): string {
    return path.join(this.getDocDir(), TEMPLATE_SUBDIR);
  }

  getIngestQueueDir(): string {
    return this.getIngestQueueBinding().resolvedPath;
  }

  getIngestQueueBinding(): RuntimePathBindingInfo {
    return this.getRuntimePathBinding(
      this.getConfig().ingest.queuePath,
      DEFAULT_INGEST_QUEUE_PATH,
      RUNTIME_PATH_ENV_KEYS.ingestQueuePath,
    );
  }

  getStorageRootBinding(provider: StorageProvider): RuntimePathBindingInfo {
    const configuredPath = this.getConfig().storage[provider].basePath;
    switch (provider) {
      case 'local':
        return this.getRuntimePathBinding(
          configuredPath,
          DEFAULT_LOCAL_STORAGE_ROOT_PATH,
          RUNTIME_PATH_ENV_KEYS.storageLocalBasePath,
        );
      case 'sharepoint':
        return this.getRuntimePathBinding(
          configuredPath,
          DEFAULT_SHAREPOINT_STORAGE_BASE_PATH,
          RUNTIME_PATH_ENV_KEYS.storageSharepointBasePath,
        );
      case 'nas':
        return this.getRuntimePathBinding(
          configuredPath,
          DEFAULT_NAS_STORAGE_BASE_PATH,
          RUNTIME_PATH_ENV_KEYS.storageNasBasePath,
        );
    }

    const exhaustiveCheck: never = provider;
    throw new Error(`지원하지 않는 저장소 provider 입니다: ${exhaustiveCheck}`);
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

  getGitBootstrapRemoteUrl(): string | undefined {
    const remoteUrl = this.getConfig().git.bootstrapRemoteUrl?.trim();
    return remoteUrl ? remoteUrl : undefined;
  }

  getGitBootstrapBranch(): string | undefined {
    const branch = this.getConfig().git.bootstrapBranch?.trim();
    return branch ? branch : undefined;
  }

  /** 캐시 무효화 (설정 파일이 외부에서 변경된 경우) */
  invalidateCache(): void {
    this.config = null;
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private resolveAppRoot(): string {
    const envRoot = process.env.DMS_APP_ROOT?.trim();
    if (envRoot) {
      const resolvedEnvRoot = path.resolve(envRoot);
      if (this.hasDefaultConfigFile(resolvedEnvRoot)) {
        return resolvedEnvRoot;
      }
      logger.warn('DMS_APP_ROOT 에 기본 설정 파일이 없어 무시합니다.', {
        candidate: resolvedEnvRoot,
      });
    }

    const anchors = [
      process.cwd(),
      path.dirname(fileURLToPath(import.meta.url)),
    ];

    for (const anchor of anchors) {
      const resolved = this.findAppRootFromAnchor(anchor);
      if (resolved) {
        return resolved;
      }
    }

    const fallback = path.resolve(process.cwd(), 'apps', 'web', 'dms');
    logger.warn('DMS app root 를 찾지 못해 관례 경로를 사용합니다.', { fallback });
    return fallback;
  }

  private loadConfig(): DmsConfig {
    const defaults = this.loadDefaults();
    let loadedUserConfig = false;
    let merged = defaults;

    try {
      if (fs.existsSync(this.configPath)) {
        loadedUserConfig = true;
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const userConfig = JSON.parse(raw) as DeepPartial<DmsConfig>;
        merged = this.deepMerge(
          defaults as unknown as Record<string, unknown>,
          userConfig as unknown as Record<string, unknown>
        ) as unknown as DmsConfig;
        logger.info('설정 로드 완료', { path: this.configPath });
      }
    } catch (error) {
      logger.error('설정 파일 로드 실패, 기본값 사용', error);
    }

    const normalized = this.normalizeConfig(merged, defaults);
    if (loadedUserConfig && normalized.usedDefaultRepositoryPath) {
      logger.warn('빈 git.repositoryPath override 를 기본 configured path 로 정규화합니다.', {
        repositoryPath: normalized.config.git.repositoryPath,
      });
      try {
        this.saveConfig(normalized.config);
      } catch (error) {
        logger.error('정규화된 설정 저장 실패', error);
      }
    }

    return normalized.config;
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
        repositoryPath: DEFAULT_DOCUMENT_REPOSITORY_PATH,
        bootstrapRemoteUrl: '',
        bootstrapBranch: '',
        autoInit: true,
      },
      storage: {
        defaultProvider: 'sharepoint',
        local: {
          enabled: true,
          basePath: DEFAULT_LOCAL_STORAGE_ROOT_PATH,
        },
        sharepoint: {
          enabled: true,
          basePath: DEFAULT_SHAREPOINT_STORAGE_BASE_PATH,
          webBaseUrl: 'https://sharepoint.local',
        },
        nas: {
          enabled: true,
          basePath: DEFAULT_NAS_STORAGE_BASE_PATH,
          webBaseUrl: 'file:///mnt/nas/dms',
        },
      },
      ingest: {
        queuePath: DEFAULT_INGEST_QUEUE_PATH,
        autoPublish: false,
        maxConcurrentJobs: 2,
      },
      templates: {},
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

  resolveRuntimePath(runtimePath: string): string {
    if (runtimePath === '~') {
      return os.homedir();
    }
    if (runtimePath.startsWith('~/') || runtimePath.startsWith('~\\')) {
      return path.join(os.homedir(), runtimePath.slice(2));
    }

    return path.isAbsolute(runtimePath)
      ? runtimePath
      : path.resolve(this.getAppRoot(), runtimePath);
  }

  resolveDocumentRepositoryPath(repositoryPath: string): string {
    return this.resolveRuntimePath(repositoryPath);
  }

  private isAppRelativePath(repositoryPath: string): boolean {
    if (!repositoryPath || repositoryPath === '~') {
      return false;
    }

    if (repositoryPath.startsWith('~/') || repositoryPath.startsWith('~\\')) {
      return false;
    }

    return !path.isAbsolute(repositoryPath);
  }

  private getRuntimePathBinding(
    configuredPath: string | undefined,
    fallbackPath: string,
    envVar: RuntimePathEnvKey | undefined,
  ): RuntimePathBindingInfo {
    const normalizedConfiguredPath = configuredPath?.trim() || fallbackPath;
    const envOverride = envVar ? process.env[envVar]?.trim() : undefined;
    const effectiveInput = envOverride && envOverride.length > 0
      ? envOverride
      : normalizedConfiguredPath;

    return {
      appRoot: this.getAppRoot(),
      configuredPath: normalizedConfiguredPath,
      effectiveInput,
      resolvedPath: this.resolveRuntimePath(effectiveInput),
      relativeToAppRoot: this.isAppRelativePath(effectiveInput),
      source: envOverride && envOverride.length > 0 ? 'env' : 'config',
      envVar: envOverride && envOverride.length > 0 ? envVar : undefined,
    };
  }

  private normalizeConfig(config: DmsConfig, defaults: DmsConfig): NormalizeConfigResult {
    const repositoryPath = config.git.repositoryPath?.trim() ?? '';
    if (repositoryPath) {
      if (repositoryPath === config.git.repositoryPath) {
        return { config, usedDefaultRepositoryPath: false };
      }

      return {
        config: {
          ...config,
          git: {
            ...config.git,
            repositoryPath,
          },
        },
        usedDefaultRepositoryPath: false,
      };
    }

    const defaultRepositoryPath = defaults.git.repositoryPath?.trim() ?? '';
    if (!defaultRepositoryPath) {
      return { config, usedDefaultRepositoryPath: false };
    }

    return {
      config: {
        ...config,
        git: {
          ...config.git,
          repositoryPath: defaultRepositoryPath,
        },
      },
      usedDefaultRepositoryPath: true,
    };
  }

  private findAppRootFromAnchor(anchor: string): string | null {
    let current = path.resolve(anchor);

    while (true) {
      const candidates = [
        current,
        path.join(current, 'apps', 'web', 'dms'),
        path.join(current, 'web', 'dms'),
      ];
      const resolved = candidates.find((candidate) => this.hasDefaultConfigFile(candidate));
      if (resolved) {
        return resolved;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  }

  private hasDefaultConfigFile(candidate: string): boolean {
    return fs.existsSync(path.join(candidate, DEFAULT_CONFIG_FILE));
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
