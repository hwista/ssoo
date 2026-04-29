import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

export interface DmsAdminOverview {
  documents: {
    total: number;
    active: number;
    byVisibility: { self: number; organization: number; public: number };
    bySyncStatus: Record<string, number>;
    recentlyUpdated: number;
  };
  templates: {
    total: number;
    active: number;
  };
  grants: {
    activeGrants: number;
    pendingRequests: number;
  };
  topOwners: Array<{ ownerUserId: string; loginId: string | null; documentCount: number }>;
  generatedAt: string;
}

@Injectable()
export class DmsAdminService {
  constructor(private readonly db: DatabaseService) {}

  async getOverview(): Promise<DmsAdminOverview> {
    const prisma = this.db.client;
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalDocs,
      activeDocs,
      visibilityGroups,
      syncStatusGroups,
      recentlyUpdated,
      totalTemplates,
      activeTemplates,
      activeGrants,
      pendingRequests,
      topOwnerRows,
    ] = await Promise.all([
      prisma.dmsDocument.count(),
      prisma.dmsDocument.count({ where: { isActive: true } }),
      prisma.dmsDocument.groupBy({
        by: ['visibilityScope'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      prisma.dmsDocument.groupBy({
        by: ['syncStatusCode'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      prisma.dmsDocument.count({ where: { isActive: true, updatedAt: { gte: since7d } } }),
      prisma.dmsTemplate.count(),
      prisma.dmsTemplate.count({ where: { isActive: true } }),
      prisma.dmsDocumentGrant.count({ where: { isActive: true } }),
      prisma.dmsDocumentAccessRequest.count({ where: { statusCode: 'pending' } }),
      prisma.dmsDocument.groupBy({
        by: ['ownerUserId'],
        where: { isActive: true },
        _count: { _all: true },
        orderBy: { _count: { ownerUserId: 'desc' } },
        take: 5,
      }),
    ]);

    const byVisibility = { self: 0, organization: 0, public: 0 };
    for (const g of visibilityGroups) {
      const key = g.visibilityScope as keyof typeof byVisibility;
      if (key in byVisibility) byVisibility[key] = g._count._all;
    }

    const bySyncStatus: Record<string, number> = {};
    for (const g of syncStatusGroups) {
      bySyncStatus[g.syncStatusCode] = g._count._all;
    }

    const ownerIds = topOwnerRows.map((r: { ownerUserId: bigint }) => r.ownerUserId);
    const owners = ownerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, userName: true, authAccount: { select: { loginId: true } } },
        })
      : [];
    const ownerMap = new Map(
      owners.map((u: { id: bigint; userName: string; authAccount: { loginId: string } | null }) => [
        u.id.toString(),
        u.authAccount?.loginId ?? u.userName,
      ]),
    );

    const topOwners = topOwnerRows.map((r: { ownerUserId: bigint; _count: { _all: number } }) => ({
      ownerUserId: r.ownerUserId.toString(),
      loginId: ownerMap.get(r.ownerUserId.toString()) ?? null,
      documentCount: r._count._all,
    }));

    return {
      documents: {
        total: totalDocs,
        active: activeDocs,
        byVisibility,
        bySyncStatus,
        recentlyUpdated,
      },
      templates: {
        total: totalTemplates,
        active: activeTemplates,
      },
      grants: {
        activeGrants,
        pendingRequests,
      },
      topOwners,
      generatedAt: new Date().toISOString(),
    };
  }
}
