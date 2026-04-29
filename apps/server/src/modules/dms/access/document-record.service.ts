import fs from 'fs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { contentService } from '../runtime/content.service.js';
import { resolveAbsolutePath } from '../search/search.helpers.js';
import {
  ACTIVE_REQUEST_ACTIVITY,
  ACTIVE_REQUEST_SOURCE,
  buildContentHash,
  extractContentHash,
  extractRevisionSeq,
  extractTargetOrgId,
  extractVisibilityScope,
  mergeCanonicalMetadataSource,
  normalizeCanonicalMetadata,
} from './access-request.util.js';
import { DocumentProjectionService } from './document-projection.service.js';

@Injectable()
export class DocumentRecordService {
  private repairOwnerUserIdPromise: Promise<bigint | null> | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly documentProjectionService: DocumentProjectionService,
  ) {}

  async ensureDocumentRecord(
    relativePath: string,
    metadataOverride?: Record<string, unknown> | null,
  ) {
    const absolutePath = resolveAbsolutePath(relativePath, configService.getDocDir());
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const existing = await this.db.client.dmsDocument.findFirst({
      where: { relativePath },
      select: {
        documentId: true,
        ownerUserId: true,
        latestGitCommitHash: true,
        lastSyncedAt: true,
        metadataJson: true,
      },
    });

    const metadataSource = mergeCanonicalMetadataSource(
      existing?.metadataJson,
      metadataOverride,
    );
    const seededMetadataSource = this.ensureDocumentMetadataSeed(
      metadataSource,
      absolutePath,
      content,
    );
    const owner = await this.resolveCanonicalOwnerIdentity(seededMetadataSource, existing?.ownerUserId ?? null);
    const canonicalMetadata = normalizeCanonicalMetadata(seededMetadataSource, owner);
    const visibilityScope = extractVisibilityScope(canonicalMetadata);
    const targetOrgId = extractTargetOrgId(canonicalMetadata);
    const revisionSeq = extractRevisionSeq(canonicalMetadata) ?? 1;
    const contentHash = extractContentHash(canonicalMetadata) ?? buildContentHash(content);
    const metadataJson = JSON.parse(JSON.stringify(canonicalMetadata)) as Prisma.InputJsonValue;

    if (existing) {
      const updated = await this.db.client.dmsDocument.update({
        where: { documentId: existing.documentId },
        data: {
          visibilityScope,
          targetOrgId,
          ownerUserId: owner.userId,
          documentStatusCode: 'active',
          syncStatusCode: owner.repaired ? 'repair_needed' : 'synced',
          revisionSeq,
          contentHash,
          metadataJson,
          lastScannedAt: new Date(),
          lastSyncedAt: existing.lastSyncedAt ?? new Date(),
          lastReconciledAt: new Date(),
          updatedBy: owner.userId,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: ACTIVE_REQUEST_ACTIVITY,
          isActive: true,
        },
        select: {
          documentId: true,
          relativePath: true,
          visibilityScope: true,
          targetOrgId: true,
          ownerUserId: true,
          syncStatusCode: true,
          metadataJson: true,
        },
      });
      await this.documentProjectionService.syncDocumentProjectionRelations(updated.documentId, relativePath, canonicalMetadata, owner.userId);
      return updated;
    }

    const created = await this.db.client.dmsDocument.create({
      data: {
        relativePath,
        visibilityScope,
        targetOrgId,
        ownerUserId: owner.userId,
        documentStatusCode: 'active',
        syncStatusCode: owner.repaired ? 'repair_needed' : 'synced',
        revisionSeq,
        contentHash,
        latestGitCommitHash: null,
        metadataJson,
        lastScannedAt: new Date(),
        lastSyncedAt: new Date(),
        lastReconciledAt: new Date(),
        createdBy: owner.userId,
        updatedBy: owner.userId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: ACTIVE_REQUEST_ACTIVITY,
      },
      select: {
        documentId: true,
        relativePath: true,
        visibilityScope: true,
        targetOrgId: true,
        ownerUserId: true,
        syncStatusCode: true,
        metadataJson: true,
      },
    });
    await this.documentProjectionService.syncDocumentProjectionRelations(created.documentId, relativePath, canonicalMetadata, owner.userId);
    return created;
  }

  async upsertRepairNeededDocument(
    relativePath: string,
    absolutePath: string,
    cause: unknown,
  ): Promise<void> {
    const repairOwnerUserId = await this.resolveRepairOwnerUserId();
    if (!repairOwnerUserId) {
      throw new Error('repair fallback owner(admin)를 찾을 수 없습니다.');
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const existing = await this.db.client.dmsDocument.findFirst({
      where: { relativePath },
      select: {
        documentId: true,
        lastSyncedAt: true,
        metadataJson: true,
      },
    });
    const metadataSource = this.ensureDocumentMetadataSeed(
      mergeCanonicalMetadataSource(existing?.metadataJson),
      absolutePath,
      content,
    );
    const fallbackOwner = await this.resolveCanonicalOwnerIdentity(metadataSource, repairOwnerUserId);
    const canonicalMetadata = normalizeCanonicalMetadata(metadataSource, {
      ...fallbackOwner,
      repaired: true,
      repairReason: cause instanceof Error ? cause.message : String(cause),
    });
    const visibilityScope = extractVisibilityScope(canonicalMetadata);
    const targetOrgId = extractTargetOrgId(canonicalMetadata);
    const revisionSeq = extractRevisionSeq(canonicalMetadata) ?? 1;
    const contentHash = extractContentHash(canonicalMetadata) ?? buildContentHash(content);
    const metadataJson = JSON.parse(JSON.stringify(canonicalMetadata)) as Prisma.InputJsonValue;

    if (existing) {
      await this.db.client.dmsDocument.update({
        where: { documentId: existing.documentId },
        data: {
          visibilityScope,
          targetOrgId,
          ownerUserId: fallbackOwner.userId,
          documentStatusCode: 'active',
          syncStatusCode: 'repair_needed',
          revisionSeq,
          contentHash,
          metadataJson,
          lastScannedAt: new Date(),
          lastSyncedAt: existing.lastSyncedAt ?? new Date(),
          lastReconciledAt: new Date(),
          updatedBy: fallbackOwner.userId,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.request.sync-document.repair-needed',
          isActive: true,
        },
      });
      await this.documentProjectionService.syncDocumentProjectionRelations(existing.documentId, relativePath, canonicalMetadata, fallbackOwner.userId);
      return;
    }

    const created = await this.db.client.dmsDocument.create({
      data: {
        relativePath,
        visibilityScope,
        targetOrgId,
        ownerUserId: fallbackOwner.userId,
        documentStatusCode: 'active',
        syncStatusCode: 'repair_needed',
        revisionSeq,
        contentHash,
        metadataJson,
        lastScannedAt: new Date(),
        lastSyncedAt: new Date(),
        lastReconciledAt: new Date(),
        createdBy: fallbackOwner.userId,
        updatedBy: fallbackOwner.userId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: 'dms.access.request.sync-document.repair-needed',
      },
      select: {
        documentId: true,
      },
    });
    await this.documentProjectionService.syncDocumentProjectionRelations(created.documentId, relativePath, canonicalMetadata, fallbackOwner.userId);
  }

  async resolveCanonicalOwnerIdentity(
    metadata: Record<string, unknown> | null,
    fallbackOwnerUserId: bigint | null,
  ): Promise<{ userId: bigint; loginId: string; repaired: boolean; repairReason?: string }> {
    const metadataOwnerId = typeof metadata?.['ownerId'] === 'string'
      ? metadata['ownerId'].trim()
      : '';
    if (/^\d+$/.test(metadataOwnerId)) {
      const byId = await this.db.client.userAuth.findFirst({
        where: { userId: BigInt(metadataOwnerId) },
        select: { userId: true, loginId: true },
      });
      if (byId) {
        return { userId: byId.userId, loginId: byId.loginId, repaired: false };
      }
    }

    const candidateLoginId = typeof metadata?.['ownerLoginId'] === 'string' && metadata['ownerLoginId'].trim()
      ? metadata['ownerLoginId'].trim()
      : typeof metadata?.['author'] === 'string' && metadata['author'].trim() && metadata['author'].trim() !== 'Unknown'
        ? metadata['author'].trim()
        : '';

    if (candidateLoginId) {
      const owner = await this.db.client.userAuth.findUnique({
        where: { loginId: candidateLoginId },
        select: { userId: true, loginId: true },
      });

      if (owner) {
        const ownerLoginPresent = typeof metadata?.['ownerLoginId'] === 'string' && metadata['ownerLoginId'].trim().length > 0;
        const authorPresent = typeof metadata?.['author'] === 'string' && metadata['author'].trim().length > 0 && metadata['author'].trim() !== 'Unknown';
        return {
          userId: owner.userId,
          loginId: owner.loginId,
          repaired: !ownerLoginPresent || !authorPresent,
          repairReason: !ownerLoginPresent || !authorPresent
            ? 'owner/author normalized from existing login metadata'
            : undefined,
        };
      }
    }

    if (fallbackOwnerUserId) {
      const fallback = await this.db.client.userAuth.findFirst({
        where: { userId: fallbackOwnerUserId },
        select: { userId: true, loginId: true },
      });
      if (fallback) {
        return {
          userId: fallback.userId,
          loginId: fallback.loginId,
          repaired: true,
          repairReason: 'owner/author missing; normalized with fallback runtime owner',
        };
      }
    }

    throw new BadRequestException('문서 owner 정보를 찾을 수 없습니다.');
  }

  ensureDocumentMetadataSeed(
    metadataSource: Record<string, unknown> | null,
    absolutePath: string,
    content: string,
  ): Record<string, unknown> {
    if (metadataSource) {
      return metadataSource;
    }

    return contentService.buildDefaultDocumentMetadata(
      content,
      absolutePath,
      undefined,
      { defaultRevisionSeq: 1 },
    );
  }

  private async resolveRepairOwnerUserId(): Promise<bigint | null> {
    if (!this.repairOwnerUserIdPromise) {
      this.repairOwnerUserIdPromise = this.db.client.userAuth.findUnique({
        where: { loginId: 'admin' },
        select: { userId: true },
      }).then((record) => record?.userId ?? null);
    }

    return this.repairOwnerUserIdPromise;
  }
}
