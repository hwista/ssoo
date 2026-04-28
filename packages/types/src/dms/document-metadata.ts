import type { ExtractedImageItem, ReferenceFileOrigin } from './reference-file';

export interface DocumentAcl {
  owners: string[];
  editors: string[];
  viewers: string[];
}

export type DocumentVisibilityScope = 'public' | 'organization' | 'self';

export type DocumentPermissionPrincipalType = 'user' | 'organization' | 'team' | 'group';

export type DocumentPermissionRole = 'read' | 'write' | 'manage';

export type DocumentMutationAction = 'write' | 'updateMetadata' | 'rename' | 'delete' | 'upload' | 'resync' | 'publish';

export type DocumentIsolationReasonCode =
  | 'sync-blocked'
  | 'push-failed'
  | 'control-plane-repair'
  | 'operator-forced-lock';

export interface DocumentIsolationState {
  path: string;
  primaryPath: string;
  status: 'reconcile-needed' | 'force-locked';
  source: 'publish' | 'control-plane' | 'operator';
  reasonCode: DocumentIsolationReasonCode;
  reason: string;
  isolatedAt: string;
  blockedActions: DocumentMutationAction[];
  affectedPaths?: string[];
  releaseStrategy: 'manual' | 'mixed';
}

export interface DocumentVisibility {
  scope: DocumentVisibilityScope;
  targetOrgId?: string;
}

export interface DocumentPermissionGrant {
  grantId?: string;
  principalType: DocumentPermissionPrincipalType;
  principalId: string;
  role: DocumentPermissionRole;
  expiresAt?: string;
  grantedAt?: string;
  grantedBy?: string;
  source?: 'request' | 'share' | 'migration' | 'owner-default';
}

export interface DocumentPathHistoryEntry {
  path: string;
  changedAt: string;
  changedBy?: string;
  reason?: 'create' | 'rename' | 'move' | 'reconcile';
}

export interface SourceFileMeta {
  name: string;
  path: string;
  type?: string;
  size?: number;
  url?: string;
  storageUri?: string;
  provider?: 'local' | 'sharepoint' | 'nas' | string;
  versionId?: string;
  etag?: string;
  checksum?: string;
  origin?: ReferenceFileOrigin;
  status?: 'draft' | 'pending_confirm' | 'published';
  textContent?: string;
  storage?: 'path' | 'inline';
  kind?: 'document' | 'file';
  tempId?: string;
  images?: ExtractedImageItem[];
}

export interface DocumentVersionEntry {
  id: string;
  createdAt: string;
  author: string;
  summary: string;
}

export interface DocumentComment {
  id: string;
  author: string;
  email?: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
  parentId?: string;
  deletedAt?: string;
}

export interface BodyLink {
  url: string;
  label: string;
  type: 'link' | 'image';
}

export interface DocumentMetadata {
  documentId?: string;
  title: string;
  summary: string;
  tags: string[];
  sourceLinks: string[];
  bodyLinks: BodyLink[];
  createdAt: string;
  updatedAt: string;
  relativePath?: string;
  pathHistory: DocumentPathHistoryEntry[];
  visibility?: DocumentVisibility;
  grants: DocumentPermissionGrant[];
  revisionSeq: number;
  contentHash: string;
  fileHashes: {
    content: string;
    sources: Record<string, string>;
  };
  chunkIds: string[];
  embeddingModel: string;
  sourceFiles: SourceFileMeta[];
  acl: DocumentAcl;
  versionHistory: DocumentVersionEntry[];
  comments: DocumentComment[];
  templateId: string;
  author: string;
  lastModifiedBy: string;
  ownerId?: string;
  ownerLoginId?: string;
  isolation?: DocumentIsolationState;
}
