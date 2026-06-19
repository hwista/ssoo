import type { CommonNotificationSourceApp } from './notification';

export type CommonSearchSourceApp = Exclude<CommonNotificationSourceApp, 'system'>;

export type CommonSearchEntityType =
  | 'document'
  | 'person'
  | 'post'
  | 'project'
  | 'customer'
  | 'opportunity'
  | 'user'
  | 'setting'
  | 'menu'
  | 'unknown';

export type CommonSearchRanker = 'keyword' | 'metadata' | 'semantic' | 'hybrid';

export interface CommonSearchCapabilities {
  keyword: boolean;
  metadata: boolean;
  semantic: boolean;
  vector: boolean;
  ragContext: boolean;
}

export type CommonSearchPermissionState =
  | 'readable'
  | 'requestable'
  | 'blocked'
  | 'unknown';

export interface CommonSearchRequest {
  query: string;
  sourceApp?: CommonSearchSourceApp;
  entityTypes?: CommonSearchEntityType[];
  limit?: number;
}

export interface CommonSearchTarget {
  sourceApp: CommonSearchSourceApp;
  path: string;
  externalHref?: string;
}

export interface CommonSearchBadge {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';
}

export interface CommonSearchResult {
  id: string;
  sourceApp: CommonSearchSourceApp;
  entityType: CommonSearchEntityType;
  title: string;
  summary?: string;
  snippets?: string[];
  score: number;
  ranker: CommonSearchRanker;
  matchReason?: string;
  target: CommonSearchTarget;
  permissionState: CommonSearchPermissionState;
  badges?: CommonSearchBadge[];
  updatedAt?: string;
  ownerLabel?: string;
  metadata?: Record<string, string>;
}

export interface CommonSearchSourceFacet {
  sourceApp: CommonSearchSourceApp;
  label: string;
  count: number;
}

export interface CommonSearchEntityFacet {
  entityType: CommonSearchEntityType;
  label: string;
  count: number;
}

export interface CommonSearchFacets {
  sources: CommonSearchSourceFacet[];
  entityTypes: CommonSearchEntityFacet[];
}

export interface CommonSearchBlockedSourceReason {
  code: string;
  label: string;
  count: number;
}

export interface CommonSearchBlockedSourceSummary {
  totalCount: number;
  reasons: CommonSearchBlockedSourceReason[];
}

export interface CommonSearchResponse {
  query: string;
  sourceApp?: CommonSearchSourceApp;
  results: CommonSearchResult[];
  total: number;
  facets: CommonSearchFacets;
  ranker: CommonSearchRanker;
  capabilities: CommonSearchCapabilities;
  ragReady: boolean;
  blockedSources?: CommonSearchBlockedSourceSummary;
}
