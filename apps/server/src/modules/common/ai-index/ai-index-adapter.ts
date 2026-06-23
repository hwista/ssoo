import type {
  AiIndexAdapterSyncRequest,
  AiIndexAdapterSyncResult,
  AiIndexObjectRef,
  AiIndexSourceApp,
} from '@ssoo/types/common';

export interface AiIndexAdapterCapabilities {
  keyword: boolean;
  metadata: boolean;
  semantic: boolean;
  vector: boolean;
  ragContext: boolean;
  indexing: boolean;
}

export interface AiIndexAdapter {
  sourceApp: AiIndexSourceApp;
  label: string;
  sourceKind: 'domain' | 'system' | 'file' | string;
  adapterCode: string;
  capabilities: AiIndexAdapterCapabilities;
  syncObject: (request: AiIndexAdapterSyncRequest) => Promise<AiIndexAdapterSyncResult>;
  resolveRef?: (request: AiIndexObjectRef) => Promise<AiIndexObjectRef | null>;
}

export const EMPTY_AI_INDEX_CAPABILITIES: AiIndexAdapterCapabilities = {
  keyword: false,
  metadata: false,
  semantic: false,
  vector: false,
  ragContext: false,
  indexing: false,
};
