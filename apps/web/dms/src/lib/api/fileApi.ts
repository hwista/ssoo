import type { DocumentMetadata } from '@/types/document-metadata';
import { request, type ApiResponse } from './core';

export type FileAction =
  | 'create'
  | 'read'
  | 'metadata'
  | 'write'
  | 'delete'
  | 'rename'
  | 'createFolder'
  | 'updateMetadata';

export interface FileApiRequest {
  action: FileAction;
  path?: string;
  content?: string;
  name?: string;
  parent?: string;
  oldPath?: string;
  newPath?: string;
  autoNumber?: boolean;
  metadata?: Partial<DocumentMetadata>;
}

export const fileApi = {
  create: async (path: string, content: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'create', path, content },
    });
  },

  read: async (path: string): Promise<ApiResponse<string>> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'read', path },
    });
  },

  getMetadata: async (path: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'metadata', path },
    });
  },

  update: async (path: string, content: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'write', path, content },
    });
  },

  delete: async (path: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'delete', path },
    });
  },

  rename: async (oldPath: string, newPath: string, autoNumber?: boolean): Promise<ApiResponse<{ message: string; finalPath?: string }>> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'rename', oldPath, newPath, autoNumber },
    });
  },

  createFolder: async (path: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'createFolder', path },
    });
  },

  updateMetadata: async (
    path: string,
    metadata: Partial<DocumentMetadata>
  ): Promise<ApiResponse<DocumentMetadata>> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'updateMetadata', path, metadata },
    });
  },

  executeAction: async (actionData: FileApiRequest): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: actionData,
    });
  },
};

export const filesApi = {
  getFileTree: async (): Promise<ApiResponse> => {
    return request('/api/files');
  },

  getFiles: async (path?: string): Promise<ApiResponse> => {
    const url = path ? `/api/files?path=${encodeURIComponent(path)}` : '/api/files';
    return request(url);
  },
};

export const getFileWithHeaders = async (filePath: string): Promise<ApiResponse<string>> => {
  return request('/api/file', {
    method: 'GET',
    headers: {
      'x-file-path': filePath,
    },
  });
};
