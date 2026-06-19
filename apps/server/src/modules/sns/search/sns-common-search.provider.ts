import { Injectable, OnModuleInit } from '@nestjs/common';
import type { CommonSearchResult } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { CommonSearchRegistryService } from '../../common/search/search-registry.service.js';
import type {
  CommonSearchProvider,
  CommonSearchProviderContext,
  CommonSearchProviderResult,
} from '../../common/search/search-provider.js';
import { shouldSkipEntityTypes } from '../../common/search/search-provider.js';
import { scoreCommonSearchValues } from '../../common/search/search-utils.js';

@Injectable()
export class SnsCommonSearchProvider implements CommonSearchProvider, OnModuleInit {
  readonly sourceApp = 'sns';
  readonly label = 'SNS';

  constructor(
    private readonly db: DatabaseService,
    private readonly registry: CommonSearchRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async search({ query, currentUser, entityTypes }: CommonSearchProviderContext): Promise<CommonSearchProviderResult> {
    if (shouldSkipEntityTypes(entityTypes, ['post'])) {
      return { results: [] };
    }

    const userId = BigInt(currentUser.userId);
    const posts = await this.db.client.snsPost.findMany({
      where: {
        isActive: true,
        OR: [
          { visibilityScopeCode: 'public' },
          { authorUserId: userId },
        ],
        AND: [{
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        }],
      },
      take: 12,
      orderBy: { updatedAt: 'desc' },
    });

    return {
      capabilities: {
        keyword: true,
        metadata: true,
        semantic: false,
        vector: false,
        ragContext: false,
      },
      results: posts.map((post): CommonSearchResult => {
        const title = post.title?.trim() || `게시물 ${post.id.toString()}`;
        return {
          id: `sns:post:${post.id.toString()}`,
          sourceApp: 'sns',
          entityType: 'post',
          title,
          summary: post.content.slice(0, 180),
          snippets: [post.content.slice(0, 180)],
          score: scoreCommonSearchValues(query, [post.title, post.content]) + 8,
          ranker: 'keyword',
          matchReason: '게시물 제목/본문',
          target: {
            sourceApp: 'sns',
            path: post.boardId ? `/board/${post.boardId.toString()}` : `/search?q=${encodeURIComponent(query)}`,
          },
          permissionState: 'readable',
          badges: [{ label: post.visibilityScopeCode, tone: 'muted' }],
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
    };
  }
}
