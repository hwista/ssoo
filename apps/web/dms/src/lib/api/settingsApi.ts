import type {
  PreferredSettingsViewMode,
  SettingsAccessMode,
  SettingsProfileKey,
  SettingsScope,
} from '@/types/settings';
import type { GitSyncStatusClient } from './collaborationApi';
import { request, type ApiResponse } from './core';

export interface DmsSystemConfigClient {
  git: {
    repositoryPath: string;
    bootstrapRemoteUrl?: string;
    bootstrapBranch?: string;
    autoInit: boolean;
  };
  storage: {
    defaultProvider: 'local' | 'sharepoint' | 'nas';
    local: { enabled: boolean; basePath: string; webBaseUrl?: string };
    sharepoint: { enabled: boolean; basePath: string; webBaseUrl?: string };
    nas: { enabled: boolean; basePath: string; webBaseUrl?: string };
  };
  ingest: {
    queuePath: string;
    autoPublish: boolean;
    maxConcurrentJobs: number;
  };
  templates: {
    rootPath: string;
  };
  extraction: {
    maxTextLength: number;
    maxImages: number;
    maxImageSizeMb: number;
    pdfMaxRenderPages: number;
    pdfRenderScale: number;
  };
  uploads: {
    attachmentMaxSizeMb: number;
    imageMaxSizeMb: number;
  };
  search: {
    maxResults: number;
    semanticThreshold: number;
    chunkSize: number;
    chunkOverlap: number;
    summaryConcurrency: number;
  };
  docAssist: {
    maxCurrentContentChars: number;
    maxTemplateChars: number;
    maxSummaryFileCount: number;
    maxSummaryFileChars: number;
    maxImagesPerRequest: number;
  };
  m365: {
    sharepoint: {
      tenantDomain: string;
      sitePath: string;
      defaultLibrary: string;
    };
    teams: {
      enabled: boolean;
      ingestEnabled: boolean;
      defaultTeam: string;
      defaultChannel: string;
      defaultDropPath: string;
    };
    auth: {
      mode: 'anonymous-first' | 'organization-sso';
      allowedTenantIds: string[];
      allowedDomains: string[];
      identityMapping: 'mail' | 'userPrincipalName' | 'displayName';
    };
  };
}

export interface DmsPersonalSettingsClient {
  identity: {
    displayName: string;
    email: string;
  };
  workspace: {
    defaultSettingsScope: SettingsScope;
    defaultSettingsView: PreferredSettingsViewMode;
    showDiffByDefault: boolean;
    preferredStorageProvider: 'system-default' | 'local' | 'sharepoint' | 'nas';
  };
  viewer: {
    defaultZoom: number;
  };
  sidebar: {
    sections: {
      bookmarks: boolean;
      openTabs: boolean;
      fileTree: boolean;
      changes: boolean;
    };
  };
}

export interface DmsSettingsConfigClient {
  system: DmsSystemConfigClient;
  personal: DmsPersonalSettingsClient;
}

export type DeepPartialClient<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartialClient<T[P]> : T[P];
};

export interface SettingsAccessClient {
  mode: SettingsAccessMode;
  profileKey: SettingsProfileKey;
  canManageSystem: boolean;
  canManagePersonal: boolean;
}

export type GitBindingStateClient =
  | 'ready'
  | 'uninitialized'
  | 'reconcile-needed'
  | 'git-unavailable';

export type GitRootRelationClient =
  | 'exact'
  | 'configured-subdirectory'
  | 'not-inside-repository';

export interface GitParityStatusClient {
  remote: string;
  verified: boolean;
  canTreatLocalAsCanonical: boolean;
  syncStatus?: GitSyncStatusClient;
  reason?: string;
}

export interface SettingsRuntimeGitClient {
  appRoot: string;
  configuredRootInput: string;
  configuredRoot: string;
  configuredRootExists: boolean;
  configuredRootRelativeToAppRoot: boolean;
  actualGitRoot?: string;
  rootRelation: GitRootRelationClient;
  rootMismatch: boolean;
  state: GitBindingStateClient;
  reason?: string;
  gitAvailable: boolean;
  isRepository: boolean;
  hasGitMetadata: boolean;
  visibleEntryCount: number;
  branch?: string;
  remoteName: string;
  remoteUrl?: string;
  syncState: GitSyncStatusClient['state'] | 'unavailable';
  syncStatus?: GitSyncStatusClient;
  parityStatus: GitParityStatusClient;
  bootstrapRemoteUrl?: string;
  bootstrapBranch?: string;
  autoInit: boolean;
  reconcileRequired: boolean;
}

export interface SettingsRuntimePathClient {
  configuredPath: string;
  effectiveInput: string;
  resolvedPath: string;
  exists: boolean;
  relativeToAppRoot: boolean;
  source: 'config' | 'env';
  envVar?: string;
}

export interface SettingsRuntimePathsClient {
  markdownRoot: SettingsRuntimePathClient;
  ingestQueue: SettingsRuntimePathClient;
  storageRoots: {
    local: SettingsRuntimePathClient;
    sharepoint: SettingsRuntimePathClient;
    nas: SettingsRuntimePathClient;
  };
  /** 템플릿 경로 — markdownRoot/_templates 에서 파생 (read-only) */
  templateDir: string;
}

export interface SettingsRuntimeClient {
  git: SettingsRuntimeGitClient;
  paths: SettingsRuntimePathsClient;
}

export interface SettingsResponse {
  config: DmsSettingsConfigClient;
  docDir: string;
  access: SettingsAccessClient;
  runtime: SettingsRuntimeClient | null;
}

export const settingsApi = {
  getSettings: async (includeRuntime = false): Promise<ApiResponse<SettingsResponse>> => {
    const query = includeRuntime ? '?includeRuntime=1' : '';
    return request<SettingsResponse>(`/api/settings${query}`);
  },

  updateSettings: async (
    config: DeepPartialClient<DmsSettingsConfigClient>
  ): Promise<ApiResponse<SettingsResponse>> => {
    return request<SettingsResponse>('/api/settings', {
      method: 'POST',
      body: { action: 'update', config },
    });
  },
};
