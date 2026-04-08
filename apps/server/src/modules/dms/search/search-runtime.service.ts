import fs from 'fs';
import path from 'path';
import { Injectable, Logger } from '@nestjs/common';

interface GitConfig {
  repositoryPath?: string;
}

interface SearchConfig {
  maxResults: number;
  semanticThreshold: number;
  chunkSize: number;
  chunkOverlap: number;
  summaryConcurrency: number;
}

interface DmsRuntimeConfig {
  git: GitConfig;
  search: SearchConfig;
}

const DEFAULT_CONFIG: DmsRuntimeConfig = {
  git: {
    repositoryPath: '',
  },
  search: {
    maxResults: 100,
    semanticThreshold: 0.5,
    chunkSize: 1000,
    chunkOverlap: 200,
    summaryConcurrency: 3,
  },
};

@Injectable()
export class SearchRuntimeService {
  private readonly logger = new Logger(SearchRuntimeService.name);
  private appRootCache: string | null = null;
  private configCache: DmsRuntimeConfig | null = null;

  getAppRoot(): string {
    if (this.appRootCache) {
      return this.appRootCache;
    }

    const candidates = [
      path.join(process.cwd(), 'apps', 'web', 'dms'),
      path.resolve(process.cwd(), '..', 'web', 'dms'),
      path.resolve(process.cwd(), '..', '..', 'apps', 'web', 'dms'),
    ];

    const resolved = candidates.find((candidate) => (
      fs.existsSync(path.join(candidate, 'dms.config.default.json'))
    )) || candidates[0];

    this.appRootCache = resolved;
    return resolved;
  }

  getSearchConfig(): SearchConfig {
    return this.getConfig().search;
  }

  getDocDir(): string {
    const repositoryPath = this.getConfig().git.repositoryPath?.trim();
    if (!repositoryPath) {
      return path.join(this.getAppRoot(), 'data', 'documents');
    }

    return path.isAbsolute(repositoryPath)
      ? repositoryPath
      : path.resolve(this.getAppRoot(), repositoryPath);
  }

  private getConfig(): DmsRuntimeConfig {
    if (this.configCache) {
      return this.configCache;
    }

    const appRoot = this.getAppRoot();
    const defaultConfig = this.readConfig(
      path.join(appRoot, 'dms.config.default.json'),
      DEFAULT_CONFIG,
    );
    const userConfig = this.readConfig<Record<string, unknown>>(
      path.join(appRoot, 'dms.config.json'),
      {},
    );

    this.configCache = this.deepMerge(
      defaultConfig as unknown as Record<string, unknown>,
      userConfig,
    ) as unknown as DmsRuntimeConfig;
    return this.configCache;
  }

  private readConfig<T>(filePath: string, fallback: T): T {
    try {
      if (!fs.existsSync(filePath)) {
        return fallback;
      }

      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    } catch (error) {
      this.logger.warn(`DMS 설정 로드 실패: ${filePath} (${String(error)})`);
      return fallback;
    }
  }

  private deepMerge(
    base: Record<string, unknown>,
    override: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...base };

    for (const [key, value] of Object.entries(override)) {
      const current = merged[key];
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        current &&
        typeof current === 'object' &&
        !Array.isArray(current)
      ) {
        merged[key] = this.deepMerge(
          current as Record<string, unknown>,
          value as Record<string, unknown>,
        );
        continue;
      }

      merged[key] = value;
    }

    return merged;
  }
}
