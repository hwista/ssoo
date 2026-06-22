import type {
  CommonSearchBlockedSourceSummary,
  CommonSearchCapabilities,
  CommonSearchEntityType,
  CommonSearchResult,
  CommonSearchSourceApp,
} from '@ssoo/types/common';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';

export interface CommonSearchProviderContext {
  query: string;
  currentUser: TokenPayload;
  entityTypes?: CommonSearchEntityType[];
}

export interface CommonSearchProviderResult {
  results: CommonSearchResult[];
  capabilities?: Partial<CommonSearchCapabilities>;
  blockedSources?: CommonSearchBlockedSourceSummary;
}

export interface CommonSearchProvider {
  sourceApp: CommonSearchSourceApp;
  label: string;
  search: (context: CommonSearchProviderContext) => Promise<CommonSearchProviderResult>;
}

export function shouldSkipEntityTypes(
  requestedEntityTypes: CommonSearchEntityType[] | undefined,
  providerEntityTypes: readonly CommonSearchEntityType[],
): boolean {
  return Boolean(
    requestedEntityTypes?.length
    && !requestedEntityTypes.some((entityType) => providerEntityTypes.includes(entityType))
  );
}
