import { request, type ApiResponse } from './core';

export type GitFileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';

export interface GitChangeEntry {
  path: string;
  status: GitFileStatus;
  oldPath?: string;
}

export interface GitLogEntry {
  hash: string;
  hashShort: string;
  author: string;
  date: string;
  message: string;
}

export const gitApi = {
  getChanges: async (): Promise<ApiResponse<GitChangeEntry[]>> => {
    return request<GitChangeEntry[]>('/api/git');
  },

  commitAll: async (message: string, author?: string): Promise<ApiResponse<{ hash: string }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'commit', message, author },
    });
  },

  commitFiles: async (
    files: string[],
    message: string,
    author?: string
  ): Promise<ApiResponse<{ hash: string }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'commitFiles', files, message, author },
    });
  },

  discardFile: async (filePath: string): Promise<ApiResponse<{ message: string }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'discard', path: filePath },
    });
  },

  discardAll: async (): Promise<ApiResponse<{ message: string }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'discardAll' },
    });
  },

  getHistory: async (maxCount?: number): Promise<ApiResponse<GitLogEntry[]>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'history', maxCount },
    });
  },

  getFileHistory: async (
    filePath: string,
    maxCount?: number
  ): Promise<ApiResponse<GitLogEntry[]>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'fileHistory', path: filePath, maxCount },
    });
  },

  restoreFile: async (
    filePath: string,
    commitHash: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'restore', path: filePath, commitHash },
    });
  },

  getFileDiff: async (filePath: string): Promise<ApiResponse<string>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'diff', path: filePath },
    });
  },

  initialize: async (): Promise<ApiResponse<{ isNew: boolean }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'init' },
    });
  },
};
