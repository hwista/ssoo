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
