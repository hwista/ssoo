import type {
  PreferredSettingsViewMode,
  SettingsAccessMode,
  SettingsProfileKey,
  SettingsScope,
} from '@/types/settings';
import { request, type ApiResponse } from './core';

export interface DmsSystemConfigClient {
  git: {
    repositoryPath: string;
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

export interface SettingsResponse {
  config: DmsSettingsConfigClient;
  docDir: string;
  access: SettingsAccessClient;
}

export const settingsApi = {
  getSettings: async (): Promise<ApiResponse<SettingsResponse>> => {
    return request<SettingsResponse>('/api/settings');
  },

  updateSettings: async (
    config: DeepPartialClient<DmsSettingsConfigClient>
  ): Promise<ApiResponse<SettingsResponse>> => {
    return request<SettingsResponse>('/api/settings', {
      method: 'POST',
      body: { action: 'update', config },
    });
  },

  updateGitPath: async (
    newPath: string,
    copyFiles: boolean
  ): Promise<ApiResponse<SettingsResponse>> => {
    return request<SettingsResponse>('/api/settings', {
      method: 'POST',
      body: { action: 'updateGitPath', newPath, copyFiles },
    });
  },
};
