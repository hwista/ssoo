import type {
  CommonSearchBlockedSourceSummary,
  CommonSearchCapabilities,
  CommonSearchEntityType,
  CommonSearchPermissionState,
  CommonSearchRanker,
  CommonSearchSourceApp,
  CommonSearchTarget,
} from './search';
import type { AiIndexJsonObject } from './ai-index';

export interface AiRetrievalRequest {
  query: string;
  sourceApp?: CommonSearchSourceApp;
  entityTypes?: CommonSearchEntityType[];
  limit?: number;
  contextLimit?: number;
  includeContext?: boolean;
  requestId?: string;
  conversationId?: string;
}

export interface AiRetrievalCitation {
  citationId: string;
  label: string;
  sourceApp: CommonSearchSourceApp;
  entityType: CommonSearchEntityType;
  entityId: string;
  objectId: string;
  chunkId: string;
  target?: CommonSearchTarget;
}

export interface AiRetrievalResultItem {
  id: string;
  sourceApp: CommonSearchSourceApp;
  entityType: CommonSearchEntityType;
  entityId: string;
  objectId: string;
  chunkId: string;
  title: string;
  excerpt: string;
  chunkText: string;
  score: number;
  similarity?: number;
  ranker: CommonSearchRanker;
  target?: CommonSearchTarget;
  permissionState: CommonSearchPermissionState;
  includedInContext: boolean;
  citation?: AiRetrievalCitation;
  metadata?: AiIndexJsonObject;
}

export interface AiRetrievalContextItem {
  citationId: string;
  label: string;
  text: string;
  sourceApp: CommonSearchSourceApp;
  entityType: CommonSearchEntityType;
  entityId: string;
  objectId: string;
  chunkId: string;
  score: number;
  target?: CommonSearchTarget;
}

export interface AiRetrievalResponse {
  query: string;
  sourceApp?: CommonSearchSourceApp;
  results: AiRetrievalResultItem[];
  contextItems: AiRetrievalContextItem[];
  citations: AiRetrievalCitation[];
  total: number;
  ranker: CommonSearchRanker;
  capabilities: CommonSearchCapabilities;
  ragReady: boolean;
  retrievalLogId?: string;
  blockedSources?: CommonSearchBlockedSourceSummary;
}
