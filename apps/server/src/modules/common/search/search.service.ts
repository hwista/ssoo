import { Injectable } from '@nestjs/common';
import type {
  CommonSearchBlockedSourceSummary,
  CommonSearchCapabilities,
  CommonSearchEntityFacet,
  CommonSearchEntityType,
  CommonSearchRanker,
  CommonSearchRequest,
  CommonSearchResponse,
  CommonSearchResult,
  CommonSearchSourceApp,
  CommonSearchSourceFacet,
} from '@ssoo/types/common';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import type { CommonSearchProviderResult } from './search-provider.js';
import { CommonSearchRegistryService } from './search-registry.service.js';
import {
  COMMON_SEARCH_ENTITY_LABELS,
  COMMON_SEARCH_SOURCE_LABELS,
} from './search-utils.js';

const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 80;
const EMPTY_SEARCH_CAPABILITIES: CommonSearchCapabilities = {
  keyword: false,
  metadata: false,
  semantic: false,
  vector: false,
  ragContext: false,
};

function normalizeQuery(query: string): string {
  return query.trim();
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_SEARCH_LIMIT;
  }
  return Math.min(Math.floor(limit), MAX_SEARCH_LIMIT);
}

function normalizeEntityTypes(entityTypes?: CommonSearchEntityType[]): CommonSearchEntityType[] | undefined {
  if (!entityTypes?.length) return undefined;
  return Array.from(new Set(entityTypes));
}

function createSourceFacets(results: CommonSearchResult[]): CommonSearchSourceFacet[] {
  const counts = results.reduce<Partial<Record<CommonSearchSourceApp, number>>>((acc, result) => {
    acc[result.sourceApp] = (acc[result.sourceApp] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([sourceApp, count]) => ({
    sourceApp: sourceApp as CommonSearchSourceApp,
    label: COMMON_SEARCH_SOURCE_LABELS[sourceApp as CommonSearchSourceApp] ?? sourceApp,
    count: count ?? 0,
  })).sort((left, right) => right.count - left.count);
}

function createEntityFacets(results: CommonSearchResult[]): CommonSearchEntityFacet[] {
  const counts = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.entityType] = (acc[result.entityType] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([entityType, count]) => ({
    entityType: entityType as CommonSearchEntityType,
    label: COMMON_SEARCH_ENTITY_LABELS[entityType as CommonSearchEntityType] ?? entityType,
    count,
  })).sort((left, right) => right.count - left.count);
}

function filterByEntityTypes(
  results: CommonSearchResult[],
  entityTypes?: CommonSearchEntityType[],
): CommonSearchResult[] {
  if (!entityTypes?.length) return results;
  const entityTypeSet = new Set(entityTypes);
  return results.filter((result) => entityTypeSet.has(result.entityType));
}

function mergeBlockedSources(
  collections: CommonSearchProviderResult[],
): CommonSearchBlockedSourceSummary | undefined {
  const summaries = collections
    .map((collection) => collection.blockedSources)
    .filter((summary): summary is CommonSearchBlockedSourceSummary => Boolean(summary?.totalCount));

  if (summaries.length === 0) return undefined;

  const reasons = new Map<string, { code: string; label: string; count: number }>();
  let totalCount = 0;

  for (const summary of summaries) {
    totalCount += summary.totalCount;
    for (const reason of summary.reasons) {
      const existing = reasons.get(reason.code);
      if (existing) {
        existing.count += reason.count;
      } else {
        reasons.set(reason.code, { ...reason });
      }
    }
  }

  return {
    totalCount,
    reasons: Array.from(reasons.values()).sort((left, right) => right.count - left.count),
  };
}

function mergeCapabilities(collections: CommonSearchProviderResult[]): CommonSearchCapabilities {
  return collections.reduce<CommonSearchCapabilities>((acc, collection) => ({
    keyword: acc.keyword || Boolean(collection.capabilities?.keyword),
    metadata: acc.metadata || Boolean(collection.capabilities?.metadata),
    semantic: acc.semantic || Boolean(collection.capabilities?.semantic),
    vector: acc.vector || Boolean(collection.capabilities?.vector),
    ragContext: acc.ragContext || Boolean(collection.capabilities?.ragContext),
  }), { ...EMPTY_SEARCH_CAPABILITIES });
}

function resolveResponseRanker(capabilities: CommonSearchCapabilities): CommonSearchRanker {
  if ((capabilities.semantic || capabilities.vector) && (capabilities.keyword || capabilities.metadata)) {
    return 'hybrid';
  }
  if (capabilities.semantic || capabilities.vector) return 'semantic';
  if (capabilities.metadata) return 'metadata';
  return 'keyword';
}

@Injectable()
export class CommonSearchService {
  constructor(private readonly registry: CommonSearchRegistryService) {}

  async search(request: CommonSearchRequest, currentUser: TokenPayload): Promise<CommonSearchResponse> {
    const query = normalizeQuery(request.query);
    const limit = normalizeLimit(request.limit);
    const entityTypes = normalizeEntityTypes(request.entityTypes);

    if (!query) {
      return {
        query,
        sourceApp: request.sourceApp,
        results: [],
        total: 0,
        facets: { sources: [], entityTypes: [] },
        ranker: 'keyword',
        capabilities: { ...EMPTY_SEARCH_CAPABILITIES },
        ragReady: false,
      };
    }

    const providers = this.registry.list(request.sourceApp);
    const collections = await Promise.all(providers.map((provider) => provider.search({
      query,
      currentUser,
      entityTypes,
    })));
    const capabilities = mergeCapabilities(collections);
    const providerResults = filterByEntityTypes(
      collections.flatMap((collection) => collection.results),
      entityTypes,
    );
    const rankedResults = request.sourceApp ? providerResults : [...providerResults].sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return (Date.parse(right.updatedAt ?? '') || 0) - (Date.parse(left.updatedAt ?? '') || 0);
    });
    const limitedResults = rankedResults.slice(0, limit);

    return {
      query,
      sourceApp: request.sourceApp,
      results: limitedResults,
      total: rankedResults.length,
      facets: {
        sources: createSourceFacets(rankedResults),
        entityTypes: createEntityFacets(rankedResults),
      },
      ranker: resolveResponseRanker(capabilities),
      capabilities,
      ragReady: capabilities.ragContext,
      blockedSources: !request.sourceApp || request.sourceApp === 'dms'
        ? mergeBlockedSources(collections)
        : undefined,
    };
  }
}
