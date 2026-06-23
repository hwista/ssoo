import type {
  CommonSearchEntityType,
  CommonSearchSourceApp,
  CommonSearchTarget,
} from './search';

export type AiIndexSourceApp = CommonSearchSourceApp;
export type AiIndexEntityType = CommonSearchEntityType | string;

export type AiIndexJobType = 'upsert' | 'delete' | 'refresh' | 'backfill';
export type AiIndexJobStatus = 'pending' | 'running' | 'indexed' | 'skipped' | 'failed' | 'cancelled';
export type AiIndexObjectStatus = 'pending' | 'indexed' | 'skipped' | 'failed' | 'stale' | 'deleted';
export type AiIndexSensitivityCode = 'public' | 'internal' | 'confidential' | 'restricted' | 'secret' | 'pii';
export type AiIndexAccessScopeCode = 'public' | 'organization' | 'owner' | 'acl' | 'policy';
export type AiIndexJobErrorKind =
  | 'adapter_failed'
  | 'embedding_provider_unavailable'
  | 'embedding_runtime_failed'
  | 'profile_mismatch_reindex'
  | 'unknown';

export type AiIndexJsonValue =
  | string
  | number
  | boolean
  | null
  | AiIndexJsonValue[]
  | { [key: string]: AiIndexJsonValue };

export type AiIndexJsonObject = {
  [key: string]: AiIndexJsonValue;
};

export interface AiIndexEmbeddingProfile {
  profileCode: string;
  providerCode?: string;
  modelName?: string;
  deploymentName?: string;
  dimension: number;
  version?: string;
}

export interface AiIndexAclProjection {
  accessScope: AiIndexAccessScopeCode;
  policyHash?: string;
  sensitivity: AiIndexSensitivityCode;
  searchEligible: boolean;
  contextEligible: boolean;
  snapshot: AiIndexJsonObject;
}

export interface AiIndexChunkProjection {
  chunkKey: string;
  chunkSeq: number;
  chunkText: string;
  chunkHash?: string;
  tokenCount?: number;
  charStart?: number;
  charEnd?: number;
  citationLabel?: string;
  metadata?: AiIndexJsonObject;
  acl?: AiIndexAclProjection;
}

export interface AiIndexObjectProjection {
  sourceApp: AiIndexSourceApp;
  sourceName?: string;
  sourceKind?: 'domain' | 'system' | 'file' | string;
  adapterCode?: string;
  embeddingProfileCode?: string;
  capabilities?: {
    keyword?: boolean;
    metadata?: boolean;
    semantic?: boolean;
    vector?: boolean;
    ragContext?: boolean;
    indexing?: boolean;
  };
  entityType: AiIndexEntityType;
  entityId: string;
  sourceVersion?: string;
  title: string;
  bodyText: string;
  summary?: string;
  target?: CommonSearchTarget;
  metadata?: AiIndexJsonObject;
  contentHash?: string;
  sensitivity: AiIndexSensitivityCode;
  acl: AiIndexAclProjection;
  chunks?: AiIndexChunkProjection[];
}

export interface AiIndexObjectRef {
  sourceApp: AiIndexSourceApp;
  entityType: AiIndexEntityType;
  entityId: string;
}

export interface AiIndexJobSafetyInput {
  embeddingBatchSize?: number;
  retryDelayMs?: number;
  retryBackoffMultiplier?: number;
  maxRetryDelayMs?: number;
}

export interface AiIndexJobSafetySnapshot {
  jobBatchLimit?: number;
  maxJobBatchLimit?: number;
  embeddingBatchSize: number;
  maxAttempts: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  maxRetryDelayMs: number;
  nextRetryDelayMs?: number;
  errorKind?: AiIndexJobErrorKind;
  partial?: boolean;
}

export interface AiIndexEmbeddingSyncSnapshot {
  profileCode: string;
  providerCode?: string;
  modelName?: string;
  deploymentName?: string;
  dimension?: number;
  status: 'embedded' | 'unchanged' | 'unavailable' | 'failed';
  activeChunkCount: number;
  embeddedChunkCount: number;
  changedChunkCount: number;
  skippedChunkCount: number;
  failedChunkCount?: number;
  batchSize?: number;
  batchCount?: number;
  profileMismatchReindex?: boolean;
  reasonCode?: string;
  reasonMessage?: string;
  errorKind?: AiIndexJobErrorKind;
}

export interface AiIndexAdapterSyncRequest extends AiIndexObjectRef {
  jobType: AiIndexJobType;
  sourceVersion?: string;
  payload?: AiIndexJsonObject;
}

export interface AiIndexAdapterSyncResult {
  projection?: AiIndexObjectProjection;
  status: AiIndexObjectStatus;
  reasonCode?: string;
  reasonMessage?: string;
  metadata?: AiIndexJsonObject;
}

export interface AiIndexJobRequest extends AiIndexObjectRef {
  jobType?: AiIndexJobType;
  priority?: number;
  maxAttempts?: number;
  safety?: AiIndexJobSafetyInput;
  sourceVersion?: string;
  payload?: AiIndexJsonObject;
}

export interface AiIndexJobSnapshot extends AiIndexObjectRef {
  jobId: string;
  objectId?: string;
  jobType: AiIndexJobType;
  jobStatus: AiIndexJobStatus;
  priority: number;
  attemptCount: number;
  maxAttempts: number;
  requestedAt: string;
  nextRetryAt?: string;
  lastErrorMessage?: string;
  safety?: AiIndexJobSafetySnapshot;
}

export interface AiIndexJobRunResult extends AiIndexObjectRef {
  jobId: string;
  objectId?: string;
  jobType: AiIndexJobType;
  jobStatus: AiIndexJobStatus;
  attemptCount: number;
  nextRetryAt?: string;
  lastErrorMessage?: string;
  safety?: AiIndexJobSafetySnapshot;
  embedding?: AiIndexEmbeddingSyncSnapshot;
}

export interface AiIndexJobRunSummary {
  requestedCount: number;
  processedCount: number;
  indexedCount: number;
  skippedCount: number;
  failedCount: number;
  retriedCount: number;
  safety: AiIndexJobSafetySnapshot;
  results: AiIndexJobRunResult[];
}

export interface AiIndexApplyResult extends AiIndexObjectRef {
  objectId: string;
  status: AiIndexObjectStatus;
  chunkCount: number;
  indexedChunkCount: number;
  contentHash?: string;
  reasonCode?: string;
  reasonMessage?: string;
  embedding?: AiIndexEmbeddingSyncSnapshot;
}

export interface AiIndexSourceStatus {
  sourceApp: AiIndexSourceApp;
  label: string;
  registered: boolean;
  active: boolean;
  indexingEnabled: boolean;
  keywordSearchEnabled: boolean;
  metadataSearchEnabled: boolean;
  semanticSearchEnabled: boolean;
  vectorSearchEnabled: boolean;
  ragContextEnabled: boolean;
  objectCount: number;
  pendingCount: number;
  indexedCount: number;
  skippedCount: number;
  failedCount: number;
  staleCount: number;
  deletedCount: number;
  lastIndexedAt?: string;
  lastFailedAt?: string;
}
