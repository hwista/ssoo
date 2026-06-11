import fs from 'fs';
import type { DeepPartial, DmsConfig, RuntimePathBindingInfo } from '../runtime/dms-config.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { personalSettingsService, type DmsPersonalSettings } from '../runtime/personal-settings.service.js';
import { gitService, type GitRepositoryBindingStatus } from '../runtime/git.service.js';
import type { SettingsAccessMode, SettingsProfileKey } from '../runtime/settings.types.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
const logger = createDmsLogger('DmsSettingsService');

export type DmsSystemConfig = Omit<DmsConfig, 'git' | 'm365'> & {
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
  system?: DmsSystemConfig;
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

function redactUrlCredentials(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(/^(https?:\/\/)([^:@\s]+):([^@\s]+)@/, '$1$2:***@');
}

function redactUrlCredentialsInText(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(/https?:\/\/[^:@\s]+:[^@\s]+@/g, (match) => redactUrlCredentials(match) ?? match);
}

function sanitizeSystemConfig(config: DmsConfig): DmsSystemConfig {
  const { author, ...git } = config.git;
  const { m365, ...system } = config;
  void author;
  void m365;
  const binding = configService.getGitBootstrapBinding();
  return {
    ...system,
    git: {
      ...git,
      bootstrapRemoteUrl: redactUrlCredentials(binding.bootstrapRemoteUrl) ?? '',
      bootstrapBranch: binding.bootstrapBranch ?? '',
    },
  };
}

function sanitizeRuntimeGitStatus(status: GitRepositoryBindingStatus): GitRepositoryBindingStatus {
  return {
    ...status,
    expectedRemoteUrl: redactUrlCredentials(status.expectedRemoteUrl),
    remoteUrl: redactUrlCredentials(status.remoteUrl),
    bootstrapRemoteUrl: redactUrlCredentials(status.bootstrapRemoteUrl),
    reason: redactUrlCredentialsInText(status.reason),
    bindingReason: redactUrlCredentialsInText(status.bindingReason),
    parityStatus: {
      ...status.parityStatus,
      reason: redactUrlCredentialsInText(status.parityStatus.reason),
    },
  };
}

type MutableSettingsPartial = Omit<DeepPartial<DmsSettingsConfig>, 'system'> & {
  system?: DeepPartial<DmsSystemConfig>;
};

function sanitizeMutableSettingsPartial(
  partial?: DeepPartial<DmsSettingsConfig>,
): MutableSettingsPartial | undefined {
  if (!partial) {
    return undefined;
  }

  const next: MutableSettingsPartial = { ...partial };
  if (!partial.system) {
    return next;
  }

  const { git: immutableGitSettings, ...mutableSystemSettings } = partial.system;
  void immutableGitSettings;
  const system = { ...mutableSystemSettings };

  // templates config is now derived from markdownRoot — strip entirely.
  // M365/Teams/Auth tenant settings are platform/Admin-owned, not DMS-owned settings.
  delete (system as Record<string, unknown>).templates;
  delete (system as Record<string, unknown>).m365;

  if (Object.keys(system as Record<string, unknown>).length > 0) {
    next.system = system as DeepPartial<DmsSettingsConfig>['system'];
  } else {
    delete next.system;
  }

  return next;
}

interface SettingsRequestAccess {
  canManageSystem: boolean;
  canManagePersonal: boolean;
}

class SettingsService {
  private getImmutableGitSettingKeys(partial?: DeepPartial<DmsSettingsConfig>): string[] {
    const git = partial?.system?.git;
    if (!git || typeof git !== 'object') {
      return [];
    }

    return Object.keys(git).map((key) => `system.git.${key}`);
  }

  async getSettings(
    includeRuntime = false,
    userId?: string,
    access: SettingsRequestAccess = { canManageSystem: true, canManagePersonal: true },
  ): Promise<SettingsSnapshot> {
    return this.buildSnapshot(includeRuntime && access.canManageSystem, userId, access);
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
    const gitBinding = configService.getGitBootstrapBinding();
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
        ? sanitizeRuntimeGitStatus(runtimeGit.data)
        : sanitizeRuntimeGitStatus({
          instanceEnv: gitBinding.instanceEnv,
          expectedRemoteUrl: gitBinding.bootstrapRemoteUrl,
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
          bindingSeverity: 'ok',
          bindingReason: undefined,
          actualRemoteMatchesExpected: null,
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
          bootstrapRemoteUrl: gitBinding.bootstrapRemoteUrl,
          bootstrapBranch: gitBinding.bootstrapBranch,
          autoInit: configService.getAutoInit(),
          reconcileRequired: false,
        }),
      paths: runtimePaths,
    };
  }

  private async buildSnapshot(
    includeRuntime = false,
    userId?: string,
    access: SettingsRequestAccess = { canManageSystem: true, canManagePersonal: true },
  ): Promise<SettingsSnapshot> {
    const docRootBinding = configService.getDocumentRootBinding();
    const resolvedDocDir = docRootBinding.resolvedPath;
    const runtime = includeRuntime && access.canManageSystem ? await this.buildRuntimeSnapshot() : null;

    const personal = userId
      ? await personalSettingsService.loadSettingsForUser(userId)
      : personalSettingsService.getSettings();

    return {
      config: {
        ...(access.canManageSystem ? { system: sanitizeSystemConfig(configService.getConfig()) } : {}),
        personal,
      },
      docDir: access.canManageSystem ? resolvedDocDir : '',
      access: {
        mode: personalSettingsService.getAccessMode(),
        profileKey: userId || personalSettingsService.getProfileKey(),
        canManageSystem: access.canManageSystem,
        canManagePersonal: access.canManagePersonal,
      },
      runtime,
    };
  }

  async updateSettings(
    partial?: DeepPartial<DmsSettingsConfig>,
    userId?: string,
    access: SettingsRequestAccess = { canManageSystem: true, canManagePersonal: true },
  ): Promise<SettingsServiceResult> {
    if (!partial) {
      return { success: true, ...(await this.buildSnapshot(false, userId, access)) };
    }

    if (partial.system && !access.canManageSystem) {
      return {
        success: false,
        error: 'DMS 시스템 설정은 admin 계정만 변경할 수 있습니다.',
      };
    }

    if (partial.personal && !access.canManagePersonal) {
      return {
        success: false,
        error: '내 DMS 설정을 변경할 권한이 없습니다.',
      };
    }

    const immutableGitSettingKeys = this.getImmutableGitSettingKeys(partial);
    if (immutableGitSettingKeys.length > 0) {
      return {
        success: false,
        error: `Git binding settings are runtime-managed and read-only. Remove these keys: ${immutableGitSettingKeys.join(', ')}`,
      };
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
      ...(await this.buildSnapshot(true, userId, access)),
    };
  }

}

export const settingsService = new SettingsService();
