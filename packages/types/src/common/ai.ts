import type {
  CommonSearchEntityType,
  CommonSearchSourceApp,
  CommonSearchTarget,
} from './search';

export type AiJsonValue =
  | null
  | boolean
  | number
  | string
  | AiJsonValue[]
  | { [key: string]: AiJsonValue };

export type AiSourceStatusCode = 'active' | 'paused' | 'disabled';
export type AiObjectSensitivityCode = 'public' | 'internal' | 'confidential' | 'secret' | 'pii';
export type AiAclPolicyCode = 'public' | 'inherited' | 'restricted' | 'system';
export type AiIndexJobTypeCode = 'upsert' | 'delete' | 'backfill' | 'resync';
export type AiIndexJobStatusCode = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type AiRetrievalModeCode = 'keyword' | 'vector' | 'hybrid';
export type AiRetrievalStatusCode = 'succeeded' | 'failed' | 'partial';
export type AiConversationScopeCode = 'private' | 'source' | 'shared';
export type AiConversationStatusCode = 'active' | 'archived' | 'deleted';
export type AiMessageRoleCode = 'system' | 'user' | 'assistant' | 'tool';
export type AiMessageStatusCode = 'created' | 'streaming' | 'completed' | 'failed' | 'cancelled';
export type AiReferenceKindCode = 'retrieval' | 'citation' | 'attachment' | 'manual';
export type AiRunTypeCode = 'chat' | 'search' | 'task' | 'summary' | 'rewrite';
export type AiRunStatusCode = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type AiRunSourceKindCode = 'retrieval' | 'reference' | 'attachment' | 'manual';

export interface AiObjectKey {
  sourceApp: CommonSearchSourceApp;
  entityType: CommonSearchEntityType;
  entityId: string;
}

export interface AiIndexProjection {
  sourceApp: CommonSearchSourceApp;
  sourceKey: string;
  sourceName: string;
  entityType: CommonSearchEntityType;
  entityId: string;
  title: string;
  bodyText?: string;
  summaryText?: string;
  target?: CommonSearchTarget;
  sensitivityCode?: AiObjectSensitivityCode;
  aclPolicyCode?: AiAclPolicyCode;
  contextEligible?: boolean;
  contentHash?: string;
  metadata?: Record<string, AiJsonValue>;
}

export interface AiChunkSnapshot {
  aiChunkId: string;
  aiObjectId: string;
  chunkSeq: number;
  chunkKey: string;
  chunkText: string;
  tokenCount?: number;
  charStart?: number;
  charEnd?: number;
  metadata?: Record<string, AiJsonValue>;
}

export interface AiRetrievalCitation {
  citationId: string;
  label?: string;
  title: string;
  excerpt?: string;
  target?: CommonSearchTarget;
  sourceApp: CommonSearchSourceApp;
  entityType: CommonSearchEntityType;
  entityId: string;
  aiObjectId?: string;
  aiChunkId?: string;
  score?: number;
  rankNo?: number;
}

export interface AiRetrievalRequest {
  query: string;
  sourceApp?: CommonSearchSourceApp;
  entityTypes?: CommonSearchEntityType[];
  mode?: AiRetrievalModeCode;
  limit?: number;
  includeContext?: boolean;
}

export interface AiRetrievalResponse {
  query: string;
  mode: AiRetrievalModeCode;
  citations: AiRetrievalCitation[];
  contextText?: string;
  total: number;
  blockedCount: number;
  logId?: string;
}

export interface AiReferenceInput {
  aiObjectId?: string;
  aiChunkId?: string;
  sourceApp?: CommonSearchSourceApp;
  entityType?: CommonSearchEntityType;
  entityId?: string;
  referenceKindCode?: AiReferenceKindCode;
  citationId?: string;
  citationLabel?: string;
  target?: CommonSearchTarget;
  metadata?: Record<string, AiJsonValue>;
}

export interface AiReferenceSnapshot extends AiReferenceInput {
  aiReferenceId: string;
  aiConversationId: string;
  aiMessageId?: string;
  createdAt: string;
}

export interface AiConversationCreateRequest {
  sourceApp?: CommonSearchSourceApp;
  conversationScopeCode?: AiConversationScopeCode;
  title?: string;
  metadata?: Record<string, AiJsonValue>;
}

export interface AiConversationUpdateRequest {
  conversationScopeCode?: AiConversationScopeCode;
  conversationStatusCode?: AiConversationStatusCode;
  title?: string | null;
  summary?: string | null;
  metadata?: Record<string, AiJsonValue> | null;
}

export interface AiConversationSnapshot {
  aiConversationId: string;
  ownerUserId?: string;
  sourceApp?: CommonSearchSourceApp;
  conversationScopeCode: AiConversationScopeCode;
  conversationStatusCode: AiConversationStatusCode;
  title?: string;
  summary?: string;
  lastMessageAt?: string;
  metadata?: Record<string, AiJsonValue>;
  messages?: AiMessageSnapshot[];
  references?: AiReferenceSnapshot[];
  runs?: AiRunSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface AiMessageAppendRequest {
  parentMessageId?: string;
  roleCode: AiMessageRoleCode;
  messageStatusCode?: AiMessageStatusCode;
  contentText?: string;
  contentJson?: AiJsonValue;
  tokenCount?: number;
  metadata?: Record<string, AiJsonValue>;
  references?: AiReferenceInput[];
}

export interface AiMessageSnapshot {
  aiMessageId: string;
  aiConversationId: string;
  parentMessageId?: string;
  messageSeq: number;
  roleCode: AiMessageRoleCode;
  messageStatusCode: AiMessageStatusCode;
  contentText?: string;
  contentJson?: AiJsonValue;
  tokenCount?: number;
  metadata?: Record<string, AiJsonValue>;
  references?: AiReferenceSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface AiRunSourceInput {
  aiRetrievalLogId?: string;
  aiReferenceId?: string;
  aiObjectId?: string;
  aiChunkId?: string;
  sourceKindCode?: AiRunSourceKindCode;
  rankNo?: number;
  includedInPrompt?: boolean;
  citationId?: string;
  metadata?: Record<string, AiJsonValue>;
}

export interface AiRunStartRequest {
  requestMessageId?: string;
  runTypeCode?: AiRunTypeCode;
  providerCode?: string;
  modelName?: string;
  deploymentName?: string;
  requestJson?: AiJsonValue;
  metadata?: Record<string, AiJsonValue>;
  sources?: AiRunSourceInput[];
}

export interface AiRunCompleteRequest {
  responseMessageId?: string;
  runStatusCode: Exclude<AiRunStatusCode, 'pending' | 'running'>;
  finishedAt?: string;
  latencyMs?: number;
  inputTokenCount?: number;
  outputTokenCount?: number;
  totalTokenCount?: number;
  lastErrorMessage?: string;
  responseJson?: AiJsonValue;
  metadata?: Record<string, AiJsonValue>;
}

export interface AiRunSourceSnapshot extends AiRunSourceInput {
  aiRunSourceId: string;
  aiRunId: string;
  sourceKindCode: AiRunSourceKindCode;
  includedInPrompt: boolean;
  createdAt: string;
}

export interface AiRunSnapshot {
  aiRunId: string;
  aiConversationId: string;
  requestMessageId?: string;
  responseMessageId?: string;
  userId?: string;
  runTypeCode: AiRunTypeCode;
  runStatusCode: AiRunStatusCode;
  providerCode?: string;
  modelName?: string;
  deploymentName?: string;
  startedAt?: string;
  finishedAt?: string;
  latencyMs?: number;
  inputTokenCount?: number;
  outputTokenCount?: number;
  totalTokenCount?: number;
  lastErrorMessage?: string;
  requestJson?: AiJsonValue;
  responseJson?: AiJsonValue;
  metadata?: Record<string, AiJsonValue>;
  sources?: AiRunSourceSnapshot[];
  createdAt: string;
  updatedAt: string;
}
