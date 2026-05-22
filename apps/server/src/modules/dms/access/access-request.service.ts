import fs from 'fs';
import path from 'path';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type {
  ApproveDmsDocumentAccessRequestPayload,
  CreateDmsDocumentAccessRequestPayload,
  CreateDmsDocumentDirectGrantPayload,
  DmsDocumentAccessRequestActor,
  DmsDocumentAccessRequestListQuery,
  DmsDocumentAccessRequestRole,
  DmsDocumentAccessRequestState,
  DmsDocumentAccessRequestStatus,
  DmsDocumentAccessRequestSummary,
  DmsDocumentDirectGrantResult,
  DmsManagedDocumentSummary,
  DocumentPermissionGrant,
  RejectDmsDocumentAccessRequestPayload,
  SearchResultItem,
  TransferDocumentOwnershipResult,
} from '@ssoo/types/dms';
import { DatabaseService } from '../../../database/database.service.js';
import { CommonNotificationService } from '../../common/notification/notification.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { configService } from '../runtime/dms-config.service.js';
import { contentService } from '../runtime/content.service.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
import { normalizePath } from '../runtime/path-utils.js';
import {
  listMarkdownFiles,
  resolveAbsolutePath,
  resolveDocumentPresentation,
} from '../search/search.helpers.js';
import { DmsEventsGateway } from '../events/dms-events.gateway.js';
import { ControlPlaneSyncService } from './control-plane-sync.service.js';
import { DocumentAclService } from './document-acl.service.js';
import { DocumentControlPlaneService } from './document-control-plane.service.js';
import { DocumentProjectionService } from './document-projection.service.js';
import { DocumentRecordService } from './document-record.service.js';
import {
  ACTIVE_REQUEST_ACTIVITY,
  ACTIVE_REQUEST_SOURCE,
  buildContentHash,
  buildFallbackManagedDocumentSummary,
  buildGrantSummary,
  buildRequestSummary,
  extractContentHash,
  extractGrants,
  extractRevisionSeq,
  extractTargetOrgId,
  extractVisibilityScope,
  isRecord,
  mergeCanonicalMetadataSource,
  normalizeCanonicalMetadata,
  normalizeOptionalText,
  toDocumentPermissionGrant,
  toIsoString,
  toRequestState,
} from './access-request.util.js';

const DEFAULT_REQUEST_ROLE: DmsDocumentAccessRequestRole = 'read';
const GRANTABLE_REQUEST_ROLES: readonly DmsDocumentAccessRequestRole[] = ['read', 'write'];
const logger = createDmsLogger('DmsAccessRequestService');

interface AccessRequestDocumentRecord {
  documentId: bigint;
  relativePath: string;
  visibilityScope: string;
  targetOrgId: bigint | null;
  ownerUserId: bigint;
  syncStatusCode: string;
  metadataJson: Prisma.JsonValue | null;
}

export interface AccessRequestGrantRecord {
  documentGrantId: bigint;
  documentId?: bigint;
  principalType?: string;
  principalRef?: string;
  roleCode?: string;
  expiresAt: Date | null;
  revokedAt?: Date | null;
  grantedAt?: Date;
  grantSourceCode?: string | null;
}

export interface AccessRequestRecord {
  accessRequestId: bigint;
  documentId: bigint;
  requesterUserId: bigint;
  requestedRole: string;
  statusCode: string;
  requestMessage: string | null;
  requestedExpiresAt: Date | null;
  respondedByUserId: bigint | null;
  respondedAt: Date | null;
  responseMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  document: AccessRequestDocumentRecord;
  generatedGrant: AccessRequestGrantRecord | null;
}

type AccessRequestTx = Parameters<
  Parameters<DatabaseService['client']['$transaction']>[0]
>[0];

const ACCESS_REQUEST_SELECT = {
  accessRequestId: true,
  documentId: true,
  requesterUserId: true,
  requestedRole: true,
  statusCode: true,
  requestMessage: true,
  requestedExpiresAt: true,
  respondedByUserId: true,
  respondedAt: true,
  responseMessage: true,
  createdAt: true,
  updatedAt: true,
  document: {
    select: {
      documentId: true,
      relativePath: true,
      visibilityScope: true,
      targetOrgId: true,
      ownerUserId: true,
      syncStatusCode: true,
      metadataJson: true,
    },
  },
  generatedGrant: {
    select: {
      documentGrantId: true,
      expiresAt: true,
      revokedAt: true,
    },
  },
} as const;

@Injectable()
export class AccessRequestService {

  constructor(
    private readonly db: DatabaseService,
    private readonly documentAclService: DocumentAclService,
    private readonly documentControlPlaneService: DocumentControlPlaneService,
    private readonly documentProjectionService: DocumentProjectionService,
    private readonly documentRecordService: DocumentRecordService,
    private readonly controlPlaneSyncService: ControlPlaneSyncService,
    private readonly eventsGateway: DmsEventsGateway,
    private readonly notificationService: CommonNotificationService,
  ) {}

  async createReadRequest(
    user: TokenPayload,
    payload: CreateDmsDocumentAccessRequestPayload,
  ): Promise<DmsDocumentAccessRequestSummary> {
    await this.ensureRepoControlPlaneSynced();
    const { absolutePath, relativePath } = this.resolveDocumentPath(payload.path);
    const access = this.documentAclService.describeSearchResultAccess(user, absolutePath);
    const requestedRole = this.resolveRequestedRole(payload.requestedRole);
    if (requestedRole === 'read' && access.isReadable) {
      throw new BadRequestException('이미 문서를 읽을 수 있습니다.');
    }
    if (requestedRole === 'read' && !access.canRequestRead) {
      throw new BadRequestException('읽기 권한을 요청할 수 없는 문서입니다.');
    }
    if (requestedRole === 'write' && !access.isReadable) {
      throw new BadRequestException('쓰기 권한 요청은 읽을 수 있는 문서 안에서만 가능합니다.');
    }
    if (requestedRole === 'write' && this.documentAclService.isWritableAbsolutePath(user, absolutePath)) {
      throw new BadRequestException('이미 문서를 수정할 수 있습니다.');
    }

    const requestedExpiresAt = this.parseFutureDate(payload.requestedExpiresAt, 'requestedExpiresAt');
    const document = await this.documentRecordService.ensureDocumentRecord(relativePath);
    const requesterUserId = BigInt(user.userId);

    const existingPending = await this.db.client.dmsDocumentAccessRequest.findFirst({
      where: {
        documentId: document.documentId,
        requesterUserId,
        requestedRole,
        statusCode: 'pending',
        isActive: true,
      },
      select: ACCESS_REQUEST_SELECT,
      orderBy: { createdAt: 'desc' },
    }) as AccessRequestRecord | null;

    if (existingPending) {
      const actors = await this.loadActors([
        existingPending.requesterUserId,
        existingPending.respondedByUserId,
      ]);
      return this.toAccessRequestSummary(existingPending, actors, false);
    }

    const created = await this.db.client.dmsDocumentAccessRequest.create({
      data: {
        documentId: document.documentId,
        requesterUserId,
        requestedRole,
        statusCode: 'pending',
        requestMessage: normalizeOptionalText(payload.requestMessage),
        requestedExpiresAt,
        createdBy: requesterUserId,
        updatedBy: requesterUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: 'dms.access.request.create',
      },
      select: ACCESS_REQUEST_SELECT,
    }) as AccessRequestRecord;

    const actors = await this.loadActors([
      created.requesterUserId,
      created.respondedByUserId,
      created.document.ownerUserId,
    ]);
    await this.notifyAccessRequestCreated(created, actors, user);
    return this.toAccessRequestSummary(created, actors, false);
  }

  async listMyReadRequests(
    user: TokenPayload,
    query: DmsDocumentAccessRequestListQuery = {},
  ): Promise<DmsDocumentAccessRequestSummary[]> {
    const requesterUserId = BigInt(user.userId);
    const requests = await this.db.client.dmsDocumentAccessRequest.findMany({
      where: {
        requesterUserId,
        isActive: true,
        ...(query.status && query.status !== 'all'
          ? { statusCode: query.status }
          : {}),
      },
      select: ACCESS_REQUEST_SELECT,
      orderBy: { createdAt: 'desc' },
    }) as AccessRequestRecord[];

    const normalizedPath = query.path
      ? this.normalizeRelativePath(query.path)
      : null;
    const filteredRequests = normalizedPath
      ? requests.filter((request) => request.document.relativePath === normalizedPath)
      : requests;
    const actors = await this.loadActors(
      filteredRequests.flatMap((request) => [request.requesterUserId, request.respondedByUserId]),
    );

    return filteredRequests.map((request) => this.toAccessRequestSummary(request, actors, false));
  }

  async listManageableReadRequests(
    user: TokenPayload,
    query: DmsDocumentAccessRequestListQuery = {},
  ): Promise<DmsDocumentAccessRequestSummary[]> {
    await this.ensureRepoControlPlaneSynced();
    const requests = await this.db.client.dmsDocumentAccessRequest.findMany({
      where: {
        isActive: true,
        ...(query.status && query.status !== 'all'
          ? { statusCode: query.status }
          : {}),
      },
      select: ACCESS_REQUEST_SELECT,
      orderBy: { createdAt: 'desc' },
    }) as AccessRequestRecord[];

    const rootDir = configService.getDocDir();
    const pathFilter = query.path
      ? this.normalizeRelativePath(query.path)
      : null;
    const manageable = requests.filter((request) => {
      if (pathFilter && request.document.relativePath !== pathFilter) {
        return false;
      }
      const absolutePath = resolveAbsolutePath(request.document.relativePath, rootDir);
      return fs.existsSync(absolutePath)
        && request.document.ownerUserId.toString() === user.userId;
    });

    const actors = await this.loadActors(
      manageable.flatMap((request) => [request.requesterUserId, request.respondedByUserId]),
    );

    return manageable.map((request) => this.toAccessRequestSummary(request, actors, true));
  }

  async listManageableDocuments(user: TokenPayload): Promise<DmsManagedDocumentSummary[]> {
    await this.ensureRepoControlPlaneSynced();
    const rootDir = configService.getDocDir();
    const documentPaths = listMarkdownFiles(rootDir)
      .sort((left, right) => left.localeCompare(right));

    const syncedDocuments: Array<{
      document: Awaited<ReturnType<DocumentRecordService['ensureDocumentRecord']>>;
      absolutePath: string;
      relativePath: string;
    }> = [];
    const fallbackDocuments: DmsManagedDocumentSummary[] = [];

    for (const absolutePath of documentPaths) {
      const relativePath = this.normalizeRelativePath(path.relative(rootDir, absolutePath));
      try {
        const document = await this.documentRecordService.ensureDocumentRecord(relativePath);
        if (document.ownerUserId.toString() !== user.userId) {
          continue;
        }
        syncedDocuments.push({ document, absolutePath, relativePath });
      } catch {
        if (this.documentAclService.isOwnerAbsolutePath(user, absolutePath)) {
          fallbackDocuments.push(buildFallbackManagedDocumentSummary(absolutePath, relativePath, rootDir));
        }
      }
    }

    if (syncedDocuments.length === 0) {
      return fallbackDocuments;
    }

    const requests = await this.db.client.dmsDocumentAccessRequest.findMany({
      where: {
        documentId: { in: syncedDocuments.map(({ document }) => document.documentId) },
        isActive: true,
      },
      select: {
        documentId: true,
        statusCode: true,
        generatedGrant: {
          select: {
            expiresAt: true,
            revokedAt: true,
          },
        },
      },
    });

    type RequestSummaryRow = {
      statusCode: string;
      generatedGrant: { expiresAt: Date | null; revokedAt: Date | null } | null;
    };
    const requestsByDocumentId = new Map<string, RequestSummaryRow[]>();
    for (const request of requests) {
      const key = request.documentId.toString();
      const current = requestsByDocumentId.get(key) ?? [];
      current.push({
        statusCode: request.statusCode,
        generatedGrant: request.generatedGrant
          ? {
              expiresAt: request.generatedGrant.expiresAt,
              revokedAt: request.generatedGrant.revokedAt,
            }
          : null,
      });
      requestsByDocumentId.set(key, current);
    }

    const grantRows = await this.db.client.dmsDocumentGrant.findMany({
      where: {
        documentId: { in: syncedDocuments.map(({ document }) => document.documentId) },
        isActive: true,
        revokedAt: null,
      },
      select: {
        documentGrantId: true,
        documentId: true,
        principalType: true,
        principalRef: true,
        roleCode: true,
        expiresAt: true,
        grantedAt: true,
        grantSourceCode: true,
      },
      orderBy: [
        { grantedAt: 'asc' },
        { documentGrantId: 'asc' },
      ],
    });
    const grantsByDocumentId = new Map<string, DocumentPermissionGrant[]>();
    for (const grantRow of grantRows) {
      const grant = toDocumentPermissionGrant(grantRow);
      if (!grant) {
        continue;
      }

      const key = grantRow.documentId.toString();
      const current = grantsByDocumentId.get(key) ?? [];
      current.push(grant);
      grantsByDocumentId.set(key, current);
    }

    const ownerActors = await this.loadActors(syncedDocuments.map(({ document }) => document.ownerUserId));

    const managedSyncedDocuments = syncedDocuments.map(({ document, absolutePath, relativePath }) => {
      const presentation = resolveDocumentPresentation(
        absolutePath,
        rootDir,
        path.basename(relativePath, '.md'),
      );
      const metadata = isRecord(document.metadataJson) ? document.metadataJson : null;
      const documentTitle = typeof metadata?.['title'] === 'string' && metadata['title'].trim().length > 0
        ? metadata['title'].trim()
        : presentation.title;
      const grants = grantsByDocumentId.get(document.documentId.toString()) ?? extractGrants(metadata);
      const grantSummary = buildGrantSummary(grants);
      const requestSummary = buildRequestSummary(
        requestsByDocumentId.get(document.documentId.toString()) ?? [],
      );
      const owner = ownerActors.get(document.ownerUserId.toString()) ?? {
        userId: document.ownerUserId.toString(),
        loginId: metadata && typeof metadata['ownerLoginId'] === 'string'
          ? metadata['ownerLoginId']
          : document.ownerUserId.toString(),
      };

      return {
        documentId: document.documentId.toString(),
        path: relativePath,
        documentTitle,
        owner,
        visibilityScope: document.visibilityScope as DmsManagedDocumentSummary['visibilityScope'],
        syncStatusCode: (document.syncStatusCode === 'repair_needed' ? 'repair_needed' : 'synced') as DmsManagedDocumentSummary['syncStatusCode'],
        repairReason: metadata && isRecord(metadata['controlPlaneRepair']) && typeof metadata['controlPlaneRepair'].reason === 'string'
          ? metadata['controlPlaneRepair'].reason
          : undefined,
        updatedAt: metadata && typeof metadata['updatedAt'] === 'string'
          ? metadata['updatedAt']
          : undefined,
        grants,
        grantSummary,
        requestSummary,
      };
    });

    return [...managedSyncedDocuments, ...fallbackDocuments]
      .sort((left, right) => left.path.localeCompare(right.path));
  }

  async updateDocumentVisibility(
    user: TokenPayload,
    documentId: string,
    visibilityScope: 'self' | 'organization',
  ): Promise<{ documentId: string; visibilityScope: string }> {
    const document = await this.db.client.dmsDocument.findUnique({
      where: { documentId: BigInt(documentId), isActive: true },
      select: { documentId: true, ownerUserId: true, relativePath: true, visibilityScope: true },
    });

    if (!document) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    if (document.ownerUserId.toString() !== user.userId) {
      throw new ForbiddenException('문서 소유자만 공개범위를 변경할 수 있습니다.');
    }

    if (document.visibilityScope === visibilityScope) {
      return { documentId: document.documentId.toString(), visibilityScope };
    }

    await this.db.client.dmsDocument.update({
      where: { documentId: document.documentId },
      data: {
        visibilityScope,
        targetOrgId: visibilityScope === 'self' ? null : undefined,
      },
    });

    this.documentControlPlaneService.clearCachedMetadataByRelativePath(document.relativePath);

    this.eventsGateway.emitAccessChanged({
      documentId: document.documentId.toString(),
      relativePath: document.relativePath,
      reason: 'visibility',
      actorUserId: user.userId,
    });

    logger.info(
      `Document ${documentId} visibility changed: ${document.visibilityScope} → ${visibilityScope} by user ${user.userId}`,
    );

    return { documentId: document.documentId.toString(), visibilityScope };
  }

  async transferDocumentOwnership(
    user: TokenPayload,
    documentId: string,
    newOwnerLoginId: string,
  ): Promise<TransferDocumentOwnershipResult> {
    const document = await this.db.client.dmsDocument.findUnique({
      where: { documentId: BigInt(documentId), isActive: true },
      select: {
        documentId: true,
        ownerUserId: true,
        relativePath: true,
        metadataJson: true,
      },
    });

    if (!document) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    this.assertDocumentOwnerFromRecord(user, document.ownerUserId, '문서 소유권을 이전할 권한이 없습니다.');

    const newOwner = await this.db.client.user.findFirst({
      where: {
        authAccount: { loginId: newOwnerLoginId },
        isActive: true,
      },
      select: {
        id: true,
        userName: true,
        authAccount: { select: { loginId: true } },
      },
    });

    if (!newOwner || !newOwner.authAccount) {
      throw new BadRequestException(`사용자를 찾을 수 없습니다: ${newOwnerLoginId}`);
    }

    if (newOwner.id === document.ownerUserId) {
      throw new BadRequestException('이미 해당 사용자가 소유자입니다.');
    }

    const callerUserId = BigInt(user.userId);
    const previousOwnerUserId = document.ownerUserId;

    await this.db.client.$transaction(async (tx) => {
      const metadata = isRecord(document.metadataJson) ? { ...document.metadataJson } : {};
      metadata['ownerId'] = newOwner.id.toString();
      metadata['ownerLoginId'] = newOwner.authAccount!.loginId;

      await tx.dmsDocument.update({
        where: { documentId: document.documentId },
        data: {
          ownerUserId: newOwner.id,
          metadataJson: metadata,
          updatedBy: callerUserId,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.document.transfer-ownership',
        },
      });

      // Convert old owner's owner-default grants to 'share'
      await tx.dmsDocumentGrant.updateMany({
        where: {
          documentId: document.documentId,
          principalType: 'user',
          principalRef: previousOwnerUserId.toString(),
          grantSourceCode: 'owner-default',
          isActive: true,
          revokedAt: null,
        },
        data: {
          grantSourceCode: 'share',
          updatedBy: callerUserId,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.document.transfer-ownership.demote-old-owner',
        },
      });

      // Upsert manage grant for new owner
      const existingGrant = await tx.dmsDocumentGrant.findFirst({
        where: {
          documentId: document.documentId,
          principalType: 'user',
          principalRef: newOwner.id.toString(),
          roleCode: 'manage',
        },
        select: { documentGrantId: true },
      });

      if (existingGrant) {
        await tx.dmsDocumentGrant.update({
          where: { documentGrantId: existingGrant.documentGrantId },
          data: {
            grantSourceCode: 'owner-default',
            grantedAt: new Date(),
            grantedByUserId: callerUserId,
            expiresAt: null,
            revokedAt: null,
            revokedByUserId: null,
            revokeReason: null,
            isActive: true,
            updatedBy: callerUserId,
            lastSource: ACTIVE_REQUEST_SOURCE,
            lastActivity: 'dms.access.document.transfer-ownership.grant-new-owner',
          },
        });
      } else {
        await tx.dmsDocumentGrant.create({
          data: {
            documentId: document.documentId,
            principalType: 'user',
            principalRef: newOwner.id.toString(),
            roleCode: 'manage',
            grantSourceCode: 'owner-default',
            grantedAt: new Date(),
            grantedByUserId: callerUserId,
            isActive: true,
            createdBy: callerUserId,
            updatedBy: callerUserId,
            lastSource: ACTIVE_REQUEST_SOURCE,
            lastActivity: 'dms.access.document.transfer-ownership.grant-new-owner',
          },
        });
      }
    });

    await this.documentControlPlaneService.refreshProjectedMetadataByRelativePath(document.relativePath);

    this.eventsGateway.emitAccessChanged({
      documentId: document.documentId.toString(),
      relativePath: document.relativePath,
      reason: 'ownership',
      actorUserId: user.userId,
    });

    logger.info(
      `Document ${documentId} ownership transferred: user ${previousOwnerUserId} → user ${newOwner.id} (${newOwnerLoginId}) by user ${user.userId}`,
    );

    await this.notifyOwnershipTransferred(
      document.documentId,
      document.relativePath,
      previousOwnerUserId,
      newOwner.id,
      BigInt(user.userId),
    );

    return {
      documentId: document.documentId.toString(),
      previousOwnerUserId: previousOwnerUserId.toString(),
      newOwnerUserId: newOwner.id.toString(),
      newOwnerLoginId: newOwner.authAccount!.loginId,
    };
  }

  async createDirectGrant(
    user: TokenPayload,
    payload: CreateDmsDocumentDirectGrantPayload,
  ): Promise<DmsDocumentDirectGrantResult> {
    const documentIdBigInt = this.parseBigIntId(payload.documentId, 'documentId');
    const principalUserIdBigInt = this.parseBigIntId(payload.principalUserId, 'principalUserId');

    const document = await this.db.client.dmsDocument.findUnique({
      where: { documentId: documentIdBigInt },
      select: { documentId: true, relativePath: true, ownerUserId: true },
    });
    if (!document) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    this.assertDocumentOwnerFromRecord(user, document.ownerUserId, '문서 권한을 부여할 권한이 없습니다.');

    const grantee = await this.db.client.user.findUnique({
      where: { id: principalUserIdBigInt },
      select: { id: true, isActive: true },
    });
    if (!grantee || !grantee.isActive) {
      throw new NotFoundException('대상 사용자를 찾을 수 없습니다.');
    }

    const grantExpiresAt = this.parseFutureDate(payload.grantExpiresAt, 'grantExpiresAt') ?? null;
    const granterUserId = BigInt(user.userId);
    const grantRole = this.resolveGrantableRole(payload.role);

    const result = await this.db.client.$transaction(async (tx) => {
      const existing = await tx.dmsDocumentGrant.findFirst({
        where: {
          documentId: documentIdBigInt,
          principalType: 'user',
          principalRef: principalUserIdBigInt.toString(),
          roleCode: grantRole,
        },
        select: { documentGrantId: true },
      });

      if (existing) {
        return tx.dmsDocumentGrant.update({
          where: { documentGrantId: existing.documentGrantId },
          data: {
            grantSourceCode: 'direct',
            grantedFromRequestId: null,
            grantedAt: new Date(),
            grantedByUserId: granterUserId,
            expiresAt: grantExpiresAt,
            revokedAt: null,
            revokedByUserId: null,
            revokeReason: null,
            reason: normalizeOptionalText(payload.memo),
            isActive: true,
            updatedBy: granterUserId,
            lastSource: ACTIVE_REQUEST_SOURCE,
            lastActivity: 'dms.access.grant.direct',
          },
          select: { documentGrantId: true, expiresAt: true },
        });
      }

      return tx.dmsDocumentGrant.create({
        data: {
          documentId: documentIdBigInt,
          principalType: 'user',
          principalRef: principalUserIdBigInt.toString(),
          roleCode: grantRole,
          grantSourceCode: 'direct',
          grantedFromRequestId: null,
          grantedAt: new Date(),
          grantedByUserId: granterUserId,
          expiresAt: grantExpiresAt,
          reason: normalizeOptionalText(payload.memo),
          createdBy: granterUserId,
          updatedBy: granterUserId,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.grant.direct',
        },
        select: { documentGrantId: true, expiresAt: true },
      });
    });

    await this.documentControlPlaneService.refreshProjectedMetadataByRelativePath(document.relativePath);

    this.eventsGateway.emitAccessChanged({
      documentId: document.documentId.toString(),
      relativePath: document.relativePath,
      reason: 'grant-direct',
      actorUserId: user.userId,
    });

    logger.info(
      `Direct grant ${result.documentGrantId.toString()} issued on document ${document.documentId.toString()} `
      + `to user ${principalUserIdBigInt.toString()} by ${user.userId}`,
    );

    await this.notifyDirectGrantCreated(
      document.documentId,
      document.relativePath,
      principalUserIdBigInt,
      BigInt(user.userId),
      grantRole,
    );

    return {
      grantId: result.documentGrantId.toString(),
      documentId: document.documentId.toString(),
      principalUserId: principalUserIdBigInt.toString(),
      role: grantRole,
      grantExpiresAt: toIsoString(result.expiresAt),
    };
  }

  private parseBigIntId(value: string, field: string): bigint {
    if (!value || !/^\d+$/.test(value)) {
      throw new BadRequestException(`유효한 ${field} 가 필요합니다.`);
    }
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException(`유효한 ${field} 가 필요합니다.`);
    }
  }

  async revokeDocumentGrant(
    user: TokenPayload,
    documentId: string,
    grantId: string,
  ): Promise<{ grantId: string; documentId: string }> {
    const document = await this.db.client.dmsDocument.findUnique({
      where: { documentId: BigInt(documentId), isActive: true },
      select: { documentId: true, ownerUserId: true, relativePath: true },
    });

    if (!document) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    this.assertDocumentOwnerFromRecord(user, document.ownerUserId, 'grant를 취소할 권한이 없습니다.');

    const grant = await this.db.client.dmsDocumentGrant.findUnique({
      where: { documentGrantId: BigInt(grantId) },
      select: {
        documentGrantId: true,
        documentId: true,
        principalType: true,
        principalRef: true,
        roleCode: true,
        grantSourceCode: true,
        revokedAt: true,
        isActive: true,
      },
    });

    if (!grant || grant.documentId !== document.documentId) {
      throw new NotFoundException('grant를 찾을 수 없습니다.');
    }

    if (grant.revokedAt || !grant.isActive) {
      throw new BadRequestException('이미 취소된 grant입니다.');
    }

    // Prevent revoking the current owner's manage grant
    if (
      grant.principalType === 'user'
      && grant.principalRef === document.ownerUserId.toString()
      && grant.roleCode === 'manage'
    ) {
      throw new BadRequestException('문서 소유자의 관리 권한은 취소할 수 없습니다. 소유권 이전을 이용하세요.');
    }

    const callerUserId = BigInt(user.userId);

    await this.db.client.dmsDocumentGrant.update({
      where: { documentGrantId: grant.documentGrantId },
      data: {
        revokedAt: new Date(),
        revokedByUserId: callerUserId,
        revokeReason: 'manual-revoke',
        isActive: false,
        updatedBy: callerUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: 'dms.access.grant.revoke',
      },
    });

    await this.documentControlPlaneService.refreshProjectedMetadataByRelativePath(document.relativePath);

    this.eventsGateway.emitAccessChanged({
      documentId: document.documentId.toString(),
      relativePath: document.relativePath,
      reason: 'grant-revoked',
      actorUserId: user.userId,
    });

    logger.info(
      `Grant ${grantId} revoked for document ${documentId} by user ${user.userId}`,
    );

    await this.notifyGrantRevoked(document.documentId, document.relativePath, grant, callerUserId);

    return { grantId: grant.documentGrantId.toString(), documentId: document.documentId.toString() };
  }

  async approveReadRequest(
    user: TokenPayload,
    accessRequestId: string,
    payload: ApproveDmsDocumentAccessRequestPayload,
  ): Promise<DmsDocumentAccessRequestSummary> {
    const request = await this.getRequestByIdOrThrow(accessRequestId);
    this.assertPendingRequest(request);

    const grantRole = this.resolveApprovalGrantRole(request.requestedRole, payload.grantRole);
    this.assertDocumentOwnerFromRecord(user, request.document.ownerUserId, '요청을 승인할 권한이 없습니다.');

    const responderUserId = BigInt(user.userId);
    const grantExpiresAt = this.parseFutureDate(payload.grantExpiresAt, 'grantExpiresAt')
      ?? request.requestedExpiresAt
      ?? null;

    const approved = await this.db.client.$transaction(async (tx) => {
      const existingGrant = await tx.dmsDocumentGrant.findFirst({
        where: {
          documentId: request.documentId,
          principalType: 'user',
          principalRef: request.requesterUserId.toString(),
          roleCode: grantRole,
        },
        select: {
          documentGrantId: true,
        },
      });

      if (existingGrant) {
        await tx.dmsDocumentGrant.update({
          where: {
            documentGrantId: existingGrant.documentGrantId,
          },
          data: {
            grantSourceCode: 'request',
            grantedFromRequestId: request.accessRequestId,
            grantedAt: new Date(),
            grantedByUserId: responderUserId,
            expiresAt: grantExpiresAt,
            revokedAt: null,
            revokedByUserId: null,
            revokeReason: null,
            reason: request.requestMessage,
            isActive: true,
            updatedBy: responderUserId,
            lastSource: ACTIVE_REQUEST_SOURCE,
            lastActivity: 'dms.access.request.approve.grant',
          },
        });
      } else {
        await tx.dmsDocumentGrant.create({
          data: {
            documentId: request.documentId,
            principalType: 'user',
            principalRef: request.requesterUserId.toString(),
            roleCode: grantRole,
            grantSourceCode: 'request',
            grantedFromRequestId: request.accessRequestId,
            grantedAt: new Date(),
            grantedByUserId: responderUserId,
            expiresAt: grantExpiresAt,
            reason: request.requestMessage,
            createdBy: responderUserId,
            updatedBy: responderUserId,
            lastSource: ACTIVE_REQUEST_SOURCE,
            lastActivity: 'dms.access.request.approve.grant',
          },
        });
      }

      await tx.dmsDocumentAccessRequest.update({
        where: {
          accessRequestId: request.accessRequestId,
        },
        data: {
          statusCode: 'approved',
          respondedByUserId: responderUserId,
          respondedAt: new Date(),
          responseMessage: normalizeOptionalText(payload.responseMessage),
          updatedBy: responderUserId,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.request.approve',
        },
      });

      return this.getRequestByIdOrThrow(request.accessRequestId.toString(), tx);
    });

    await this.documentControlPlaneService.refreshCache();

    this.eventsGateway.emitAccessChanged({
      documentId: approved.documentId.toString(),
      relativePath: approved.document.relativePath,
      reason: 'grant-created',
      actorUserId: user.userId,
    });

    const actors = await this.loadActors([
      approved.requesterUserId,
      approved.respondedByUserId,
    ]);
    await this.notifyAccessRequestApproved(approved, grantRole, responderUserId);
    return this.toAccessRequestSummary(approved, actors, true);
  }

  async rejectReadRequest(
    user: TokenPayload,
    accessRequestId: string,
    payload: RejectDmsDocumentAccessRequestPayload,
  ): Promise<DmsDocumentAccessRequestSummary> {
    const request = await this.getRequestByIdOrThrow(accessRequestId);
    this.assertPendingRequest(request);

    this.assertDocumentOwnerFromRecord(user, request.document.ownerUserId, '요청을 거절할 권한이 없습니다.');

    const responderUserId = BigInt(user.userId);
    const rejected = await this.db.client.dmsDocumentAccessRequest.update({
      where: {
        accessRequestId: request.accessRequestId,
      },
      data: {
        statusCode: 'rejected',
        respondedByUserId: responderUserId,
        respondedAt: new Date(),
        responseMessage: normalizeOptionalText(payload.responseMessage),
        updatedBy: responderUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: 'dms.access.request.reject',
      },
      select: ACCESS_REQUEST_SELECT,
    }) as AccessRequestRecord;

    const actors = await this.loadActors([
      rejected.requesterUserId,
      rejected.respondedByUserId,
    ]);
    await this.notifyAccessRequestRejected(rejected, responderUserId);
    return this.toAccessRequestSummary(rejected, actors, true);
  }

  async cancelReadRequest(
    user: TokenPayload,
    accessRequestId: string,
  ): Promise<DmsDocumentAccessRequestSummary> {
    const request = await this.getRequestByIdOrThrow(accessRequestId);
    this.assertPendingRequest(request);

    const requesterUserId = BigInt(user.userId);
    if (request.requesterUserId !== requesterUserId) {
      throw new ForbiddenException('본인이 보낸 권한 요청만 취소할 수 있습니다.');
    }

    const updateResult = await this.db.client.dmsDocumentAccessRequest.updateMany({
      where: {
        accessRequestId: request.accessRequestId,
        requesterUserId,
        statusCode: 'pending',
        isActive: true,
      },
      data: {
        statusCode: 'cancelled',
        respondedByUserId: requesterUserId,
        respondedAt: new Date(),
        responseMessage: null,
        updatedBy: requesterUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: 'dms.access.request.cancel',
      },
    });

    if (updateResult.count === 0) {
      throw new BadRequestException('이미 처리된 요청입니다.');
    }

    const cancelled = await this.getRequestByIdOrThrow(request.accessRequestId.toString());

    this.eventsGateway.emitAccessChanged({
      documentId: cancelled.documentId.toString(),
      relativePath: cancelled.document.relativePath,
      reason: 'request-cancelled',
      actorUserId: user.userId,
    });

    const actors = await this.loadActors([
      cancelled.requesterUserId,
      cancelled.respondedByUserId,
      cancelled.document.ownerUserId,
    ]);
    await this.notifyAccessRequestCancelled(cancelled, requesterUserId);
    return this.toAccessRequestSummary(cancelled, actors, false);
  }

  async attachReadRequestStates(
    user: TokenPayload,
    results: SearchResultItem[],
  ): Promise<SearchResultItem[]> {
    await this.ensureRepoControlPlaneSynced();
    const relativePaths = Array.from(new Set(
      results
        .filter((result) => result.path.trim().length > 0 && result.path !== '-')
        .map((result) => this.normalizeRelativePath(result.path)),
    ));

    if (relativePaths.length === 0) {
      return results;
    }

    const documents = await this.db.client.dmsDocument.findMany({
      where: {
        relativePath: { in: relativePaths },
        isActive: true,
      },
      select: {
        documentId: true,
        relativePath: true,
      },
    });

    if (documents.length === 0) {
      return results;
    }

    const requests = await this.db.client.dmsDocumentAccessRequest.findMany({
      where: {
        documentId: { in: documents.map((document) => document.documentId) },
        requesterUserId: BigInt(user.userId),
        requestedRole: DEFAULT_REQUEST_ROLE,
        statusCode: { in: ['pending', 'approved'] },
        isActive: true,
      },
      select: {
        accessRequestId: true,
        documentId: true,
        statusCode: true,
        requestMessage: true,
        requestedExpiresAt: true,
        respondedAt: true,
        responseMessage: true,
        createdAt: true,
      },
      orderBy: [
        { documentId: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const pathByDocumentId = new Map(
      documents.map((document) => [document.documentId.toString(), document.relativePath]),
    );
    const requestStateByPath = new Map<string, DmsDocumentAccessRequestState>();

    for (const request of requests) {
      const pathKey = pathByDocumentId.get(request.documentId.toString());
      if (!pathKey || requestStateByPath.has(pathKey)) {
        continue;
      }

      requestStateByPath.set(pathKey, {
        requestId: request.accessRequestId.toString(),
        status: request.statusCode as DmsDocumentAccessRequestStatus,
        requestedAt: request.createdAt.toISOString(),
        requestMessage: request.requestMessage ?? undefined,
        requestedExpiresAt: toIsoString(request.requestedExpiresAt),
        respondedAt: toIsoString(request.respondedAt),
        responseMessage: request.responseMessage ?? undefined,
      });
    }

    return results.map((result) => ({
      ...result,
      readRequest: requestStateByPath.get(this.normalizeRelativePath(result.path)),
    }));
  }

  async ensureRepoControlPlaneSynced(force = false): Promise<void> {
    return this.controlPlaneSyncService.ensureRepoControlPlaneSynced(force);
  }


  async syncDocumentProjection(
    relativePath: string,
    metadataOverride?: Record<string, unknown> | null,
  ): Promise<void> {
    const normalized = this.normalizeRelativePath(relativePath);
    await this.controlPlaneSyncService.ensureGitContentPlaneReady();
    await this.documentRecordService.ensureDocumentRecord(normalized, metadataOverride);
    await this.documentControlPlaneService.refreshProjectedMetadataByRelativePath(normalized);
    this.controlPlaneSyncService.markSynced();
  }

  async moveDocumentProjection(
    previousRelativePath: string,
    nextRelativePath: string,
    metadataOverride?: Record<string, unknown> | null,
  ): Promise<void> {
    const previousNormalized = this.normalizeRelativePath(previousRelativePath);
    const nextNormalized = this.normalizeRelativePath(nextRelativePath);
    if (!previousNormalized || !nextNormalized) {
      throw new BadRequestException('유효한 문서 경로가 필요합니다.');
    }
    if (previousNormalized === nextNormalized) {
      await this.syncDocumentProjection(nextNormalized, metadataOverride);
      return;
    }

    await this.controlPlaneSyncService.ensureGitContentPlaneReady();
    const absolutePath = resolveAbsolutePath(nextNormalized, configService.getDocDir());
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    const existing = await this.db.client.dmsDocument.findFirst({
      where: { relativePath: previousNormalized },
      select: {
        documentId: true,
        ownerUserId: true,
        latestGitCommitHash: true,
        lastSyncedAt: true,
        metadataJson: true,
      },
    });
    if (!existing) {
      await this.syncDocumentProjection(nextNormalized, metadataOverride);
      this.documentControlPlaneService.clearCachedMetadataByRelativePath(previousNormalized);
      return;
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const metadataSource = this.documentRecordService.ensureDocumentMetadataSeed(
      mergeCanonicalMetadataSource(existing.metadataJson, metadataOverride),
      absolutePath,
      content,
    );
    const owner = await this.documentRecordService.resolveCanonicalOwnerIdentity(metadataSource, existing.ownerUserId);
    const canonicalMetadata = normalizeCanonicalMetadata(metadataSource, owner);
    const visibilityScope = extractVisibilityScope(canonicalMetadata);
    const targetOrgId = extractTargetOrgId(canonicalMetadata);
    const revisionSeq = extractRevisionSeq(canonicalMetadata) ?? 1;
    const contentHash = extractContentHash(canonicalMetadata) ?? buildContentHash(content);
    const metadataJson = JSON.parse(JSON.stringify(canonicalMetadata)) as Prisma.InputJsonValue;

    await this.db.client.dmsDocument.update({
      where: { documentId: existing.documentId },
      data: {
        relativePath: nextNormalized,
        visibilityScope,
        targetOrgId,
        ownerUserId: owner.userId,
        documentStatusCode: 'active',
        syncStatusCode: owner.repaired ? 'repair_needed' : 'synced',
        revisionSeq,
        contentHash,
        latestGitCommitHash: existing.latestGitCommitHash,
        metadataJson,
        lastScannedAt: new Date(),
        lastSyncedAt: existing.lastSyncedAt ?? new Date(),
        lastReconciledAt: new Date(),
        updatedBy: owner.userId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: ACTIVE_REQUEST_ACTIVITY,
        isActive: true,
      },
    });
    await this.documentProjectionService.syncDocumentProjectionRelations(existing.documentId, nextNormalized, canonicalMetadata, owner.userId);
    this.documentControlPlaneService.clearCachedMetadataByRelativePath(previousNormalized);
    await this.documentControlPlaneService.refreshProjectedMetadataByRelativePath(nextNormalized);
    this.controlPlaneSyncService.markSynced();
  }


  private async getRequestByIdOrThrow(
    accessRequestId: string,
    client: Pick<AccessRequestTx, 'dmsDocumentAccessRequest'> = this.db.client,
  ): Promise<AccessRequestRecord> {
    if (!/^\d+$/.test(accessRequestId.trim())) {
      throw new BadRequestException('유효한 access request id가 필요합니다.');
    }

    const request = await client.dmsDocumentAccessRequest.findUnique({
      where: {
        accessRequestId: BigInt(accessRequestId),
      },
      select: ACCESS_REQUEST_SELECT,
    }) as AccessRequestRecord | null;

    if (!request || !request.document) {
      throw new NotFoundException('문서 권한 요청을 찾을 수 없습니다.');
    }

    return request;
  }

  private assertPendingRequest(request: AccessRequestRecord): void {
    if (!GRANTABLE_REQUEST_ROLES.includes(request.requestedRole as DmsDocumentAccessRequestRole)) {
      throw new BadRequestException('처리할 수 없는 권한 요청입니다.');
    }

    if (request.statusCode !== 'pending') {
      throw new BadRequestException('이미 처리된 요청입니다.');
    }
  }

  private resolveRequestedRole(value: DmsDocumentAccessRequestRole | undefined): DmsDocumentAccessRequestRole {
    return this.resolveGrantableRole(value ?? DEFAULT_REQUEST_ROLE);
  }

  private resolveGrantableRole(value: string | undefined): DmsDocumentAccessRequestRole {
    if (GRANTABLE_REQUEST_ROLES.includes(value as DmsDocumentAccessRequestRole)) {
      return value as DmsDocumentAccessRequestRole;
    }

    throw new BadRequestException('요청/부여 가능한 문서 권한은 읽기 또는 쓰기입니다.');
  }

  private resolveApprovalGrantRole(
    requestedRole: string,
    grantRole: DmsDocumentAccessRequestRole | undefined,
  ): DmsDocumentAccessRequestRole {
    const requested = this.resolveGrantableRole(requestedRole);
    if (!grantRole) {
      return requested;
    }

    const resolved = this.resolveGrantableRole(grantRole);
    if (requested === 'read' && resolved === 'write') {
      throw new BadRequestException('요청된 권한보다 높은 권한으로 승인할 수 없습니다.');
    }

    return resolved;
  }

  private assertDocumentOwnerFromRecord(user: TokenPayload, ownerUserId: bigint, message: string): void {
    if (ownerUserId.toString() !== user.userId) {
      throw new ForbiddenException(message);
    }
  }

  private async notifyAccessRequestCreated(
    request: AccessRequestRecord,
    actors: Map<string, DmsDocumentAccessRequestActor>,
    user: TokenPayload,
  ): Promise<void> {
    const ownerUserId = request.document.ownerUserId;
    if (ownerUserId === request.requesterUserId) {
      return;
    }

    const requester = actors.get(request.requesterUserId.toString());
    const requesterName = requester?.displayName ?? requester?.loginId ?? user.loginId;
    const roleLabel = request.requestedRole === 'write' ? '쓰기' : '읽기';

    await this.notificationService.notifyUser({
      recipientUserId: ownerUserId,
      actorUserId: request.requesterUserId,
      sourceApp: 'dms',
      notificationType: 'dms.document-access-request.created',
      severity: 'info',
      title: `문서 ${roleLabel} 권한 요청`,
      message: `${requesterName}님이 ${request.document.relativePath} 문서의 ${roleLabel} 권한을 요청했습니다.`,
      reference: {
        type: 'dms.document-access-request',
        id: request.accessRequestId.toString(),
        path: request.document.relativePath,
      },
      action: {
        type: 'focus-dms-access-request',
        label: '요청 처리',
        payload: {
          requestId: request.accessRequestId.toString(),
          documentId: request.documentId.toString(),
          path: request.document.relativePath,
        },
      },
      dedupeKey: [
        'dms',
        'access-request',
        'created',
        ownerUserId.toString(),
        request.accessRequestId.toString(),
      ].join(':'),
    });
  }

  private async notifyAccessRequestApproved(
    request: AccessRequestRecord,
    grantRole: DmsDocumentAccessRequestRole,
    responderUserId: bigint,
  ): Promise<void> {
    const roleLabel = grantRole === 'write' ? '쓰기' : '읽기';
    await this.notificationService.notifyUser({
      recipientUserId: request.requesterUserId,
      actorUserId: responderUserId,
      sourceApp: 'dms',
      notificationType: 'dms.document-access-request.approved',
      severity: 'success',
      title: `문서 ${roleLabel} 권한 요청 승인`,
      message: `${request.document.relativePath} 문서의 ${roleLabel} 권한 요청이 승인되었습니다.`,
      reference: {
        type: 'dms.document',
        id: request.documentId.toString(),
        path: request.document.relativePath,
      },
      action: {
        type: 'open-dms-document',
        label: '문서 열기',
        payload: {
          documentId: request.documentId.toString(),
          path: request.document.relativePath,
        },
      },
      dedupeKey: [
        'dms',
        'access-request',
        'approved',
        request.requesterUserId.toString(),
        request.accessRequestId.toString(),
      ].join(':'),
    });
  }

  private async notifyAccessRequestRejected(
    request: AccessRequestRecord,
    responderUserId: bigint,
  ): Promise<void> {
    const roleLabel = request.requestedRole === 'write' ? '쓰기' : '읽기';
    await this.notificationService.notifyUser({
      recipientUserId: request.requesterUserId,
      actorUserId: responderUserId,
      sourceApp: 'dms',
      notificationType: 'dms.document-access-request.rejected',
      severity: 'warning',
      title: `문서 ${roleLabel} 권한 요청 거절`,
      message: `${request.document.relativePath} 문서의 ${roleLabel} 권한 요청이 거절되었습니다.`,
      reference: {
        type: 'dms.document-access-request',
        id: request.accessRequestId.toString(),
        path: request.document.relativePath,
      },
      action: {
        type: 'open-dms-settings-section',
        label: '상태 보기',
        payload: {
          section: 'access-requests',
          requestId: request.accessRequestId.toString(),
          documentId: request.documentId.toString(),
          path: request.document.relativePath,
        },
      },
      dedupeKey: [
        'dms',
        'access-request',
        'rejected',
        request.requesterUserId.toString(),
        request.accessRequestId.toString(),
      ].join(':'),
    });
  }

  private async notifyAccessRequestCancelled(
    request: AccessRequestRecord,
    requesterUserId: bigint,
  ): Promise<void> {
    const ownerUserId = request.document.ownerUserId;
    if (ownerUserId === requesterUserId) {
      return;
    }

    await this.notificationService.archiveByDedupeKey(
      ownerUserId,
      'dms',
      [
        'dms',
        'access-request',
        'created',
        ownerUserId.toString(),
        request.accessRequestId.toString(),
      ].join(':'),
    );
  }

  private async notifyDirectGrantCreated(
    documentId: bigint,
    relativePath: string,
    recipientUserId: bigint,
    actorUserId: bigint,
    grantRole: DmsDocumentAccessRequestRole,
  ): Promise<void> {
    if (recipientUserId === actorUserId) {
      return;
    }

    const roleLabel = grantRole === 'write' ? '쓰기' : '읽기';
    await this.notificationService.notifyUser({
      recipientUserId,
      actorUserId,
      sourceApp: 'dms',
      notificationType: 'dms.document-access-grant.created',
      severity: 'success',
      title: `문서 ${roleLabel} 권한 부여`,
      message: `${relativePath} 문서의 ${roleLabel} 권한이 부여되었습니다.`,
      reference: {
        type: 'dms.document',
        id: documentId.toString(),
        path: relativePath,
      },
      action: {
        type: 'open-dms-document',
        label: '문서 열기',
        payload: {
          documentId: documentId.toString(),
          path: relativePath,
        },
      },
      dedupeKey: [
        'dms',
        'access-grant',
        'created',
        recipientUserId.toString(),
        documentId.toString(),
        grantRole,
      ].join(':'),
    });
  }

  private async notifyGrantRevoked(
    documentId: bigint,
    relativePath: string,
    grant: Pick<AccessRequestGrantRecord, 'documentGrantId' | 'principalType' | 'principalRef' | 'roleCode'>,
    actorUserId: bigint,
  ): Promise<void> {
    if (grant.principalType !== 'user' || !grant.principalRef || !/^\d+$/.test(grant.principalRef)) {
      return;
    }

    const recipientUserId = BigInt(grant.principalRef);
    if (recipientUserId === actorUserId) {
      return;
    }

    const roleLabel = grant.roleCode === 'write' ? '쓰기' : grant.roleCode === 'manage' ? '관리' : '읽기';
    await this.notificationService.notifyUser({
      recipientUserId,
      actorUserId,
      sourceApp: 'dms',
      notificationType: 'dms.document-access-grant.revoked',
      severity: 'warning',
      title: `문서 ${roleLabel} 권한 회수`,
      message: `${relativePath} 문서의 ${roleLabel} 권한이 회수되었습니다.`,
      reference: {
        type: 'dms.document',
        id: documentId.toString(),
        path: relativePath,
      },
      action: {
        type: 'open-dms-settings-section',
        label: '상태 보기',
        payload: {
          section: 'access-requests',
          documentId: documentId.toString(),
          path: relativePath,
        },
      },
      dedupeKey: [
        'dms',
        'access-grant',
        'revoked',
        recipientUserId.toString(),
        grant.documentGrantId.toString(),
      ].join(':'),
    });
  }

  private async notifyOwnershipTransferred(
    documentId: bigint,
    relativePath: string,
    previousOwnerUserId: bigint,
    newOwnerUserId: bigint,
    actorUserId: bigint,
  ): Promise<void> {
    await this.notificationService.notifyMany([
      {
        recipientUserId: newOwnerUserId,
        actorUserId,
        sourceApp: 'dms',
        notificationType: 'dms.document-ownership.transferred-in',
        severity: 'success',
        title: '문서 소유권 이전',
        message: `${relativePath} 문서의 소유자가 되었습니다.`,
        reference: {
          type: 'dms.document',
          id: documentId.toString(),
          path: relativePath,
        },
        action: {
          type: 'open-dms-document',
          label: '문서 열기',
          payload: {
            documentId: documentId.toString(),
            path: relativePath,
          },
        },
        dedupeKey: [
          'dms',
          'ownership',
          'transferred-in',
          newOwnerUserId.toString(),
          documentId.toString(),
        ].join(':'),
      },
      {
        recipientUserId: previousOwnerUserId,
        actorUserId,
        sourceApp: 'dms',
        notificationType: 'dms.document-ownership.transferred-out',
        severity: 'info',
        title: '문서 소유권 이전 완료',
        message: `${relativePath} 문서의 소유권이 이전되었습니다.`,
        reference: {
          type: 'dms.document',
          id: documentId.toString(),
          path: relativePath,
        },
        action: {
          type: 'open-dms-settings-section',
          label: '상태 보기',
          payload: {
            section: 'access-requests',
            documentId: documentId.toString(),
            path: relativePath,
          },
        },
        dedupeKey: [
          'dms',
          'ownership',
          'transferred-out',
          previousOwnerUserId.toString(),
          documentId.toString(),
        ].join(':'),
      },
    ]);
  }

  private parseFutureDate(value: string | undefined, fieldName: string): Date | null {
    if (!value?.trim()) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName}가 올바른 날짜 형식이 아닙니다.`);
    }
    if (parsed.getTime() <= Date.now()) {
      throw new BadRequestException(`${fieldName}는 현재 시각 이후여야 합니다.`);
    }
    return parsed;
  }

  private async loadActors(
    userIds: Array<bigint | null>,
  ): Promise<Map<string, DmsDocumentAccessRequestActor>> {
    const uniqueIds = Array.from(new Set(
      userIds
        .filter((userId): userId is bigint => Boolean(userId))
        .map((userId) => userId.toString()),
    ));

    if (uniqueIds.length === 0) {
      return new Map();
    }

    const users = await this.db.client.user.findMany({
      where: {
        id: {
          in: uniqueIds.map((userId) => BigInt(userId)),
        },
      },
      select: {
        id: true,
        userName: true,
        displayName: true,
        authAccount: {
          select: {
            loginId: true,
          },
        },
      },
    });

    return new Map(users.map((user) => [
      user.id.toString(),
      {
        userId: user.id.toString(),
        loginId: user.authAccount?.loginId ?? user.userName,
        displayName: user.displayName ?? undefined,
      },
    ]));
  }

  private toAccessRequestSummary(
    request: AccessRequestRecord,
    actors: Map<string, DmsDocumentAccessRequestActor>,
    canRespond: boolean,
  ): DmsDocumentAccessRequestSummary {
    const rootDir = configService.getDocDir();
    const absolutePath = resolveAbsolutePath(request.document.relativePath, rootDir);
    const presentation = resolveDocumentPresentation(
      absolutePath,
      rootDir,
      path.basename(request.document.relativePath, '.md'),
    );
    const metadata = isRecord(request.document.metadataJson) ? request.document.metadataJson : null;
    const documentTitle = typeof metadata?.['title'] === 'string' && metadata['title'].trim().length > 0
      ? metadata['title'].trim()
      : presentation.title;

    const baseState = toRequestState(request);
    const grant = request.generatedGrant;
    const grantRevokedAt = grant?.revokedAt;
    const grantExpiresAt = grant?.expiresAt;
    const isApproved = baseState.status === 'approved';
    const isRevoked = isApproved && grantRevokedAt instanceof Date;
    const isExpired = isApproved
      && !isRevoked
      && grantExpiresAt instanceof Date
      && grantExpiresAt.getTime() < Date.now();
    const effectiveStatus = isRevoked
      ? 'revoked'
      : isExpired
        ? 'expired'
        : baseState.status;

    return {
      ...baseState,
      status: effectiveStatus,
      documentId: request.document.documentId.toString(),
      path: request.document.relativePath,
      documentTitle,
      requestedRole: request.requestedRole as DmsDocumentAccessRequestRole,
      requester: actors.get(request.requesterUserId.toString()) ?? {
        userId: request.requesterUserId.toString(),
        loginId: request.requesterUserId.toString(),
      },
      responder: request.respondedByUserId
        ? actors.get(request.respondedByUserId.toString())
        : undefined,
      grantId: grant?.documentGrantId.toString(),
      grantExpiresAt: toIsoString(grantExpiresAt),
      canRespond,
    };
  }


  private resolveDocumentPath(inputPath: string) {
    const { targetPath, valid, safeRelPath } = contentService.resolveContentPath(inputPath);
    const relativePath = this.normalizeRelativePath(safeRelPath);
    if (!valid || !relativePath || !/\.md$/i.test(relativePath)) {
      throw new BadRequestException('유효한 마크다운 문서 경로가 필요합니다.');
    }

    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    return { relativePath, absolutePath: targetPath };
  }

  private normalizeRelativePath(inputPath: string): string {
    return normalizePath(inputPath.trim().replace(/^\/+/, ''));
  }

}
