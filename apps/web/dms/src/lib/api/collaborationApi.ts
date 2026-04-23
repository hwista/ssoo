import { request, type ApiResponse } from './core';

export interface CollaborationMemberClient {
  userId: string;
  loginId: string;
  displayName: string;
  email: string;
  sessionId: string;
  mode: 'view' | 'edit';
  joinedAt: string;
  lastSeenAt: string;
}

export type GitSyncStateClient =
  | 'local-only'
  | 'remote-missing'
  | 'in-sync'
  | 'local-ahead'
  | 'remote-ahead'
  | 'diverged';

export interface GitSyncStatusClient {
  branch: string;
  remote: string;
  remoteUrl?: string;
  remoteRef: string;
  remoteConfigured: boolean;
  remoteExists: boolean;
  canPushFastForward: boolean;
  remoteAhead: boolean;
  localAhead: boolean;
  diverged: boolean;
  aheadCount: number;
  behindCount: number;
  state: GitSyncStateClient;
}

export interface DocumentPublishStateClient {
  path: string;
  status: 'clean' | 'dirty-uncommitted' | 'publishing' | 'committed-unpushed' | 'sync-blocked' | 'push-failed';
  operationType?: string;
  affectedPaths?: string[];
  lastActorLoginId?: string;
  lastActorDisplayName?: string;
  lastQueuedAt?: string;
  lastCommitHash?: string;
  lastError?: string;
  lastPublishedAt?: string;
  retryCount?: number;
  syncStatus?: GitSyncStatusClient;
}

export interface DocumentPathIsolationStateClient {
  path: string;
  primaryPath: string;
  status: 'reconcile-needed' | 'force-locked';
  source: 'publish' | 'control-plane' | 'operator';
  reasonCode: 'sync-blocked' | 'push-failed' | 'control-plane-repair' | 'operator-forced-lock';
  reason: string;
  isolatedAt: string;
  blockedActions: Array<'write' | 'updateMetadata' | 'rename' | 'delete' | 'upload' | 'resync' | 'publish'>;
  affectedPaths?: string[];
  releaseStrategy: 'manual' | 'mixed';
}

export interface DocumentSoftLockClient {
  path: string;
  userId: string;
  loginId: string;
  displayName: string;
  email: string;
  sessionId: string;
  acquiredAt: string;
  lastSeenAt: string;
}

export interface DocumentCollaborationSnapshotClient {
  path: string;
  members: CollaborationMemberClient[];
  publishState: DocumentPublishStateClient;
  softLock: DocumentSoftLockClient | null;
  isolation: DocumentPathIsolationStateClient | null;
}

export const collaborationApi = {
  getSnapshot: async (path: string): Promise<ApiResponse<DocumentCollaborationSnapshotClient>> => request(`/api/collaboration?path=${encodeURIComponent(path)}`),
  heartbeat: async (path: string, mode: 'view' | 'edit', sessionId: string): Promise<ApiResponse<DocumentCollaborationSnapshotClient>> => request('/api/collaboration', { method: 'POST', body: { path, mode, sessionId } }),
  takeover: async (path: string, sessionId: string): Promise<ApiResponse<DocumentCollaborationSnapshotClient>> => request('/api/collaboration/takeover', { method: 'POST', body: { path, sessionId } }),
  refresh: async (path: string): Promise<ApiResponse<DocumentCollaborationSnapshotClient>> => request('/api/collaboration/refresh', { method: 'POST', body: { path } }),
  retryPublish: async (path: string): Promise<ApiResponse<DocumentCollaborationSnapshotClient>> => request('/api/collaboration/retry-publish', { method: 'POST', body: { path } }),
  forceLock: async (path: string, reason?: string): Promise<ApiResponse<DocumentCollaborationSnapshotClient>> => request('/api/collaboration/force-lock', { method: 'POST', body: { path, reason } }),
  forceUnlock: async (path: string): Promise<ApiResponse<DocumentCollaborationSnapshotClient>> => request('/api/collaboration/force-unlock', { method: 'POST', body: { path } }),
  leave: async (path: string, sessionId: string): Promise<ApiResponse<DocumentCollaborationSnapshotClient>> => request('/api/collaboration', { method: 'DELETE', body: { path, sessionId } }),
};
