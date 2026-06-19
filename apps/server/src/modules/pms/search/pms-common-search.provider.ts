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
export class PmsCommonSearchProvider implements CommonSearchProvider, OnModuleInit {
  readonly sourceApp = 'pms';
  readonly label = 'PMS';

  constructor(
    private readonly db: DatabaseService,
    private readonly registry: CommonSearchRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async search({ query, currentUser, entityTypes }: CommonSearchProviderContext): Promise<CommonSearchProviderResult> {
    if (shouldSkipEntityTypes(entityTypes, ['project'])) {
      return { results: [] };
    }

    const userId = BigInt(currentUser.userId);
    const projects = await this.db.client.project.findMany({
      where: {
        isActive: true,
        projectName: { contains: query, mode: 'insensitive' },
        OR: [
          { currentOwnerUserId: userId },
          { projectMembers: { some: { userId, isActive: true } } },
        ],
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
      results: projects.map((project): CommonSearchResult => ({
        id: `pms:project:${project.id.toString()}`,
        sourceApp: 'pms',
        entityType: 'project',
        title: project.projectName,
        summary: project.memo ?? `${project.statusCode} · ${project.stageCode}`,
        snippets: [project.projectName, project.memo ?? ''].filter((value) => value.trim().length > 0),
        score: scoreCommonSearchValues(query, [project.projectName, project.memo]) + 8,
        ranker: 'keyword',
        matchReason: '프로젝트명',
        target: {
          sourceApp: 'pms',
          path: '/project/detail',
        },
        permissionState: 'readable',
        badges: [{ label: project.statusCode, tone: 'primary' }],
        updatedAt: project.updatedAt.toISOString(),
        metadata: {
          projectId: project.id.toString(),
          stageCode: project.stageCode,
          statusCode: project.statusCode,
        },
      })),
    };
  }
}
