import type { FileNode } from '@/types/file-tree';
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
  expectedRevisionSeq?: number;
}

export interface FileReadMetadata {
  size: number;
  createdAt: string;
  modifiedAt: string;
  accessedAt: string;
  document?: DocumentMetadata;
}

export interface FileReadResponse {
  content: string;
  metadata: FileReadMetadata;
}

export const fileApi = {
  create: async (path: string, content: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'create', path, content },
    });
  },

  read: async (path: string): Promise<ApiResponse<FileReadResponse>> => {
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

  update: async (
    path: string,
    content: string,
    expectedRevisionSeq?: number,
  ): Promise<ApiResponse<{ message: string; metadata?: DocumentMetadata }>> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'write', path, content, expectedRevisionSeq },
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
    metadata: Partial<DocumentMetadata>,
    expectedRevisionSeq?: number,
  ): Promise<ApiResponse<DocumentMetadata>> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'updateMetadata', path, metadata, expectedRevisionSeq },
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
  getFileTree: async (): Promise<ApiResponse<FileNode[]>> => {
    return request<FileNode[]>('/api/files');
  },

  getFiles: async (path?: string): Promise<ApiResponse<FileNode[]>> => {
    const url = path ? `/api/files?path=${encodeURIComponent(path)}` : '/api/files';
    return request<FileNode[]>(url);
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
