import type { DmsDocumentAccessRequestState } from './access';
import type { DocumentVisibilityScope } from './document-metadata';

export type SearchContextMode = 'doc' | 'deep';

export type SearchConfidence = 'high' | 'medium' | 'low';

export interface SearchCitation {
  title: string;
  storageUri: string;
  versionId?: string;
  webUrl?: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  score: number;
  summary?: string;
  snippets?: string[];
  totalSnippetCount?: number;
  owner?: string;
  visibilityScope?: DocumentVisibilityScope | 'legacy';
  isReadable: boolean;
  canRequestRead: boolean;
  readRequest?: DmsDocumentAccessRequestState;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  contextMode?: SearchContextMode;
  confidence?: SearchConfidence;
  citations?: SearchCitation[];
}

export interface AiContextOptions {
  contextMode?: SearchContextMode;
  activeDocPath?: string;
}

export interface SearchRequest extends AiContextOptions {
  query: string;
}

export type SearchIndexSyncAction = 'upsert' | 'delete';

export interface SearchIndexSyncRequest {
  path: string;
  action?: SearchIndexSyncAction;
  previousPath?: string;
}

export interface SearchIndexSyncResponse {
  action: SearchIndexSyncAction;
  path: string;
  previousPath?: string;
  indexedFileCount: number;
  indexedChunkCount: number;
  deletedChunkCount: number;
}
