import { Injectable, OnModuleInit } from '@nestjs/common';
import type { CommonSearchResult } from '@ssoo/types/common';
import { DatabaseService } from '../../../../database/database.service.js';
import { AccessFoundationService } from '../../access/access-foundation.service.js';
import { CommonSearchRegistryService } from '../search-registry.service.js';
import type {
  CommonSearchProvider,
  CommonSearchProviderContext,
  CommonSearchProviderResult,
} from '../search-provider.js';
import { scoreCommonSearchValues, toCommonSearchIsoString } from '../search-utils.js';

@Injectable()
export class AdminCommonSearchProvider implements CommonSearchProvider, OnModuleInit {
  readonly sourceApp = 'admin';
  readonly label = 'ADMIN';

  constructor(
    private readonly db: DatabaseService,
    private readonly accessFoundation: AccessFoundationService,
    private readonly registry: CommonSearchRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async search({ query, currentUser, entityTypes }: CommonSearchProviderContext): Promise<CommonSearchProviderResult> {
    if (entityTypes?.length && !entityTypes.includes('user')) {
      return { results: [] };
    }

    const actionContext = await this.accessFoundation.resolveActionPermissionContext(currentUser);
    if (!actionContext.grantedPermissionCodes.has('system.override')) {
      return { results: [] };
    }

    const users = await this.db.client.user.findMany({
      where: {
        isActive: true,
        OR: [
          { userName: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { authAccount: { is: { loginId: { contains: query, mode: 'insensitive' } } } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        authAccount: {
          select: { loginId: true },
        },
      },
    });

    return {
      capabilities: {
        keyword: true,
        metadata: true,
        semantic: false,
        vector: false,
        ragContext: false,
      },
      results: users.map((user): CommonSearchResult => ({
        id: `admin:user:${user.id.toString()}`,
        sourceApp: 'admin',
        entityType: 'user',
        title: user.displayName ?? user.userName,
        summary: `${user.email} · ${user.roleCode}`,
        snippets: [user.email, user.authAccount?.loginId ?? user.userName],
        score: scoreCommonSearchValues(query, [
          user.displayName,
          user.userName,
          user.email,
          user.authAccount?.loginId,
        ]) + 6,
        ranker: 'keyword',
        matchReason: '사용자 이름/로그인 ID/이메일',
        target: {
          sourceApp: 'admin',
          path: `/users?search=${encodeURIComponent(user.authAccount?.loginId ?? user.email)}`,
        },
        permissionState: 'readable',
        badges: [{ label: user.roleCode, tone: 'neutral' }],
        updatedAt: toCommonSearchIsoString(user.updatedAt),
      })),
    };
  }
}
