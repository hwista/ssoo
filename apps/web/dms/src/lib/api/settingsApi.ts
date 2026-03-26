import { request, type ApiResponse } from './core';

export interface GitConfigClient {
  repositoryPath: string;
  author: { name: string; email: string };
  autoInit: boolean;
}

export interface DmsConfigClient {
  git: GitConfigClient;
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

export type DeepPartialClient<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartialClient<T[P]> : T[P];
};

export interface SettingsResponse {
  config: DmsConfigClient;
  docDir: string;
}

export const settingsApi = {
  getSettings: async (): Promise<ApiResponse<SettingsResponse>> => {
    return request<SettingsResponse>('/api/settings');
  },

  updateSettings: async (
    config: DeepPartialClient<DmsConfigClient>
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
