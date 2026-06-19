import { Injectable, OnModuleInit } from '@nestjs/common';
import type { CommonSearchResult } from '@ssoo/types/common';
import { CommonSearchRegistryService } from '../../common/search/search-registry.service.js';
import type {
  CommonSearchProvider,
  CommonSearchProviderContext,
  CommonSearchProviderResult,
} from '../../common/search/search-provider.js';
import { shouldSkipEntityTypes } from '../../common/search/search-provider.js';
import { SearchService } from './search.service.js';

@Injectable()
export class DmsCommonSearchProvider implements CommonSearchProvider, OnModuleInit {
  readonly sourceApp = 'dms';
  readonly label = 'DMS';

  constructor(
    private readonly searchService: SearchService,
    private readonly registry: CommonSearchRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async search({ query, currentUser, entityTypes }: CommonSearchProviderContext): Promise<CommonSearchProviderResult> {
    if (query.length < 2 || shouldSkipEntityTypes(entityTypes, ['document'])) {
      return { results: [] };
    }

    const response = await this.searchService.search({
      query,
      contextMode: 'deep',
    }, currentUser);

    return {
      capabilities: {
        keyword: true,
        metadata: true,
        semantic: true,
        vector: true,
        ragContext: false,
      },
      results: response.results.map((document): CommonSearchResult => {
        const readablePath = document.path.replace(/^\/+/, '');
        return {
          id: `dms:document:${document.id}`,
          sourceApp: 'dms',
          entityType: 'document',
          title: document.title,
          summary: document.summary ?? document.excerpt,
          snippets: document.snippets ?? [document.excerpt],
          score: document.score,
          ranker: 'hybrid',
          matchReason: document.summarySource === 'ai' ? 'DMS 검색 · AI 요약' : 'DMS 검색',
          target: {
            sourceApp: 'dms',
            path: `/doc/${encodeURIComponent(readablePath)}`,
          },
          permissionState: document.isReadable
            ? 'readable'
            : document.canRequestRead
              ? 'requestable'
              : 'blocked',
          badges: [
            {
              label: document.visibilityScope === 'public'
                ? '전체 공개'
                : document.visibilityScope === 'organization'
                  ? '조직 공개'
                  : document.visibilityScope === 'self'
                    ? '나만 보기'
                    : '기존 ACL',
              tone: document.isReadable ? 'primary' : 'muted',
            },
            ...(document.summarySource === 'ai' ? [{ label: 'AI 요약', tone: 'neutral' as const }] : []),
          ],
          ownerLabel: document.owner,
          metadata: {
            path: document.path,
            visibilityScope: document.visibilityScope ?? 'legacy',
          },
        };
      }),
      blockedSources: response.blockedSources,
    };
  }
}
