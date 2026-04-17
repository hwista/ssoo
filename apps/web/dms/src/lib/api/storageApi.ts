import { request, type ApiResponse } from './core';

export interface StorageReferenceClient {
  storageUri: string;
  provider: 'local' | 'sharepoint' | 'nas';
  path: string;
  name: string;
  size: number;
  versionId: string;
  etag: string;
  checksum: string;
  origin: 'manual' | 'ingest' | 'teams' | 'network_drive';
  status: 'draft' | 'pending_confirm' | 'published';
  webUrl?: string;
}

export interface StorageOpenResultClient {
  provider: 'local' | 'sharepoint' | 'nas';
  path: string;
  storageUri: string;
  openUrl: string;
  webUrl?: string;
}

export interface IngestJobClient {
  id: string;
  title: string;
  content: string;
  provider: 'local' | 'sharepoint' | 'nas';
  relativePath: string;
  requestedBy: string;
  origin: 'manual' | 'ingest' | 'teams' | 'network_drive';
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'pending_confirm' | 'published' | 'failed';
  error?: string;
  storageUri?: string;
  docPath?: string;
}

export const storageApi = {
  upload: async (payload: {
    fileName: string;
    content: string;
    provider?: 'local' | 'sharepoint' | 'nas';
    relativePath?: string;
    origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
    status?: 'draft' | 'pending_confirm' | 'published';
  }): Promise<ApiResponse<StorageReferenceClient>> => {
    return request('/api/storage/upload', {
      method: 'POST',
      body: payload,
    });
  },

  open: async (payload: {
    storageUri?: string;
    provider?: 'local' | 'sharepoint' | 'nas';
    path?: string;
    documentPath?: string;
  }): Promise<ApiResponse<StorageOpenResultClient>> => {
    return request('/api/storage/open', {
      method: 'POST',
      body: payload,
    });
  },
};

export const ingestApi = {
  submit: async (payload: {
    title: string;
    content: string;
    requestedBy?: string;
    provider?: 'local' | 'sharepoint' | 'nas';
    relativePath?: string;
    origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
  }): Promise<ApiResponse<IngestJobClient>> => {
    return request('/api/ingest/submit', {
      method: 'POST',
      body: payload,
    });
  },

  jobs: async (): Promise<ApiResponse<{ jobs: IngestJobClient[] }>> => {
    return request('/api/ingest/jobs');
  },

  confirm: async (id: string): Promise<ApiResponse<IngestJobClient>> => {
    return request(`/api/ingest/jobs/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
    });
  },
};
