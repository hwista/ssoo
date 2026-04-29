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

  async listDocuments(params: {
    q?: string;
    visibilityScope?: string;
    syncStatusCode?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    items: Array<{
      documentId: string;
      relativePath: string;
      visibilityScope: string;
      syncStatusCode: string;
      documentStatusCode: string;
      isActive: boolean;
      ownerUserId: string;
      ownerLoginId: string | null;
      revisionSeq: number;
      updatedAt: string;
      lastSyncedAt: string | null;
    }>;
    page: number;
    limit: number;
    total: number;
  }> {
    const prisma = this.db.client;
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const where: Record<string, unknown> = {};
    if (typeof params.isActive === 'boolean') where.isActive = params.isActive;
    if (params.visibilityScope) where.visibilityScope = params.visibilityScope;
    if (params.syncStatusCode) where.syncStatusCode = params.syncStatusCode;
    if (params.q && params.q.trim()) {
      where.relativePath = { contains: params.q.trim(), mode: 'insensitive' };
    }

    const [total, rows] = await Promise.all([
      prisma.dmsDocument.count({ where }),
      prisma.dmsDocument.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          documentId: true,
          relativePath: true,
          visibilityScope: true,
          syncStatusCode: true,
          documentStatusCode: true,
          isActive: true,
          ownerUserId: true,
          revisionSeq: true,
          updatedAt: true,
          lastSyncedAt: true,
        },
      }),
    ]);

    const ownerIds = Array.from(new Set(rows.map((r: { ownerUserId: bigint }) => r.ownerUserId)));
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

    const items = rows.map(
      (r: {
        documentId: bigint;
        relativePath: string;
        visibilityScope: string;
        syncStatusCode: string;
        documentStatusCode: string;
        isActive: boolean;
        ownerUserId: bigint;
        revisionSeq: number;
        updatedAt: Date;
        lastSyncedAt: Date | null;
      }) => ({
        documentId: r.documentId.toString(),
        relativePath: r.relativePath,
        visibilityScope: r.visibilityScope,
        syncStatusCode: r.syncStatusCode,
        documentStatusCode: r.documentStatusCode,
        isActive: r.isActive,
        ownerUserId: r.ownerUserId.toString(),
        ownerLoginId: ownerMap.get(r.ownerUserId.toString()) ?? null,
        revisionSeq: r.revisionSeq,
        updatedAt: r.updatedAt.toISOString(),
        lastSyncedAt: r.lastSyncedAt ? r.lastSyncedAt.toISOString() : null,
      }),
    );

    return { items, page, limit, total };
  }

  async listTemplates(params: {
    q?: string;
    scope?: string;
    kindCode?: string;
    statusCode?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    items: Array<{
      templateId: string;
      templateKey: string;
      relativePath: string;
      templateScopeCode: string;
      templateKindCode: string;
      visibilityCode: string;
      templateStatusCode: string;
      ownerRef: string;
      isActive: boolean;
      updatedAt: string;
    }>;
    page: number;
    limit: number;
    total: number;
  }> {
    const prisma = this.db.client;
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const where: Record<string, unknown> = {};
    if (typeof params.isActive === 'boolean') where.isActive = params.isActive;
    if (params.scope) where.templateScopeCode = params.scope;
    if (params.kindCode) where.templateKindCode = params.kindCode;
    if (params.statusCode) where.templateStatusCode = params.statusCode;
    if (params.q && params.q.trim()) {
      const term = params.q.trim();
      where.OR = [
        { relativePath: { contains: term, mode: 'insensitive' } },
        { templateKey: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.dmsTemplate.count({ where }),
      prisma.dmsTemplate.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          templateId: true,
          templateKey: true,
          relativePath: true,
          templateScopeCode: true,
          templateKindCode: true,
          visibilityCode: true,
          templateStatusCode: true,
          ownerRef: true,
          isActive: true,
          updatedAt: true,
        },
      }),
    ]);

    const items = rows.map(
      (r: {
        templateId: bigint;
        templateKey: string;
        relativePath: string;
        templateScopeCode: string;
        templateKindCode: string;
        visibilityCode: string;
        templateStatusCode: string;
        ownerRef: string;
        isActive: boolean;
        updatedAt: Date;
      }) => ({
        templateId: r.templateId.toString(),
        templateKey: r.templateKey,
        relativePath: r.relativePath,
        templateScopeCode: r.templateScopeCode,
        templateKindCode: r.templateKindCode,
        visibilityCode: r.visibilityCode,
        templateStatusCode: r.templateStatusCode,
        ownerRef: r.ownerRef,
        isActive: r.isActive,
        updatedAt: r.updatedAt.toISOString(),
      }),
    );

    return { items, page, limit, total };
  }
}
