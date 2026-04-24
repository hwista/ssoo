import fs from 'fs';
import type { DeepPartial, DmsConfig, RuntimePathBindingInfo } from '../runtime/dms-config.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { personalSettingsService, type DmsPersonalSettings } from '../runtime/personal-settings.service.js';
import { gitService, type GitRepositoryBindingStatus } from '../runtime/git.service.js';
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

export interface SettingsRuntimePathInfo {
  configuredPath: string;
  effectiveInput: string;
  resolvedPath: string;
  exists: boolean;
  relativeToAppRoot: boolean;
  source: 'config' | 'env';
  envVar?: string;
}

export interface SettingsRuntimePathsSnapshot {
  markdownRoot: SettingsRuntimePathInfo;
  ingestQueue: SettingsRuntimePathInfo;
  storageRoots: {
    local: SettingsRuntimePathInfo;
    sharepoint: SettingsRuntimePathInfo;
    nas: SettingsRuntimePathInfo;
  };
  /** 템플릿 경로는 markdownRoot/_templates 에서 파생 (read-only info) */
  templateDir: string;
}

export interface DmsSettingsConfig {
  system: DmsSystemConfig;
  personal: DmsPersonalSettings;
}

export interface SettingsRuntimeSnapshot {
  git: GitRepositoryBindingStatus;
  paths: SettingsRuntimePathsSnapshot;
}

export interface SettingsSnapshot {
  config: DmsSettingsConfig;
  docDir: string;
  access: SettingsAccessInfo;
  runtime: SettingsRuntimeSnapshot | null;
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

function sanitizeMutableSettingsPartial(
  partial?: DeepPartial<DmsSettingsConfig>,
): DeepPartial<DmsSettingsConfig> | undefined {
  if (!partial) {
    return undefined;
  }

  const next: DeepPartial<DmsSettingsConfig> = { ...partial };
  if (!partial.system) {
    return next;
  }

  const system = { ...partial.system };
  if (partial.system.git) {
    const git = { ...partial.system.git } as Record<string, unknown>;
    delete git.repositoryPath;
    if (Object.keys(git).length > 0) {
      system.git = git as DeepPartial<DmsSettingsConfig['system']['git']>;
    } else {
      delete system.git;
    }
  }

  // templates config is now derived from markdownRoot — strip entirely
  delete (system as Record<string, unknown>).templates;

  if (Object.keys(system as Record<string, unknown>).length > 0) {
    next.system = system;
  } else {
    delete next.system;
  }

  return next;
}

class SettingsService {
  async getSettings(includeRuntime = false, userId?: string): Promise<SettingsSnapshot> {
    return this.buildSnapshot(includeRuntime, userId);
  }

  private toRuntimePathInfo(binding: RuntimePathBindingInfo): SettingsRuntimePathInfo {
    return {
      ...binding,
      exists: fs.existsSync(binding.resolvedPath),
    };
  }

  private async buildRuntimeSnapshot(): Promise<SettingsRuntimeSnapshot> {
    const docRootBinding = configService.getDocumentRootBinding();
    const resolvedDocDir = docRootBinding.resolvedPath;
    const runtimeGit = await gitService.getRepositoryBindingStatus();
    const runtimePaths: SettingsRuntimePathsSnapshot = {
      markdownRoot: this.toRuntimePathInfo(docRootBinding),
      ingestQueue: this.toRuntimePathInfo(configService.getIngestQueueBinding()),
      storageRoots: {
        local: this.toRuntimePathInfo(configService.getStorageRootBinding('local')),
        sharepoint: this.toRuntimePathInfo(configService.getStorageRootBinding('sharepoint')),
        nas: this.toRuntimePathInfo(configService.getStorageRootBinding('nas')),
      },
      templateDir: configService.getTemplateDir(),
    };
    return {
      git: runtimeGit.success
        ? runtimeGit.data
        : {
          appRoot: docRootBinding.appRoot,
          configuredRootInput: docRootBinding.effectiveInput,
          configuredRoot: resolvedDocDir,
          configuredRootExists: fs.existsSync(resolvedDocDir),
          configuredRootRelativeToAppRoot: docRootBinding.relativeToAppRoot,
          actualGitRoot: undefined,
          rootRelation: 'not-inside-repository',
          rootMismatch: false,
          state: 'git-unavailable',
          reason: runtimeGit.error,
          gitAvailable: false,
          isRepository: false,
          hasGitMetadata: false,
          visibleEntryCount: 0,
          branch: undefined,
          remoteName: 'origin',
          remoteUrl: undefined,
          syncState: 'unavailable',
          syncStatus: undefined,
          parityStatus: {
            remote: 'origin',
            verified: false,
            canTreatLocalAsCanonical: false,
            reason: runtimeGit.error,
          },
          bootstrapRemoteUrl: configService.getGitBootstrapRemoteUrl(),
          bootstrapBranch: configService.getGitBootstrapBranch(),
          autoInit: configService.getAutoInit(),
          reconcileRequired: false,
        },
      paths: runtimePaths,
    };
  }

  private async buildSnapshot(includeRuntime = false, userId?: string): Promise<SettingsSnapshot> {
    const docRootBinding = configService.getDocumentRootBinding();
    const resolvedDocDir = docRootBinding.resolvedPath;
    const runtime = includeRuntime ? await this.buildRuntimeSnapshot() : null;

    const personal = userId
      ? await personalSettingsService.loadSettingsForUser(userId)
      : personalSettingsService.getSettings();

    return {
      config: {
        system: sanitizeSystemConfig(configService.getConfig()),
        personal,
      },
      docDir: resolvedDocDir,
      access: {
        mode: personalSettingsService.getAccessMode(),
        profileKey: userId || personalSettingsService.getProfileKey(),
        canManageSystem: true,
        canManagePersonal: true,
      },
      runtime,
    };
  }

  async updateSettings(partial?: DeepPartial<DmsSettingsConfig>, userId?: string): Promise<SettingsServiceResult> {
    if (!partial) {
      return { success: true, ...(await this.buildSnapshot(false, userId)) };
    }

    const sanitizedPartial = sanitizeMutableSettingsPartial(partial);
    const previousDocDir = sanitizedPartial?.system ? configService.getDocDir() : null;

    if (sanitizedPartial?.system) {
      await configService.updateConfig(sanitizedPartial.system);
      const nextDocDir = configService.getDocDir();
      if (previousDocDir !== nextDocDir) {
        gitService.reconfigure(nextDocDir);
        logger.info('문서 Git working tree binding 갱신', {
          from: previousDocDir,
          to: nextDocDir,
        });
      }
    }
    if (sanitizedPartial?.personal) {
      if (userId) {
        await personalSettingsService.updateSettingsForUser(userId, sanitizedPartial.personal);
      } else {
        personalSettingsService.updateSettings(sanitizedPartial.personal);
      }
    }

    return {
      success: true,
      ...(await this.buildSnapshot(true, userId)),
    };
  }

}

export const settingsService = new SettingsService();
