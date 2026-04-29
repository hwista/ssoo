import fs from 'fs';
import path from 'path';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type {
  ApproveDmsDocumentAccessRequestPayload,
  CreateDmsDocumentAccessRequestPayload,
  DmsDocumentAccessRequestActor,
  DmsDocumentAccessRequestListQuery,
  DmsDocumentAccessRequestState,
  DmsDocumentAccessRequestStatus,
  DmsDocumentAccessRequestSummary,
  DmsManagedDocumentSummary,
  DocumentPermissionGrant,
  RejectDmsDocumentAccessRequestPayload,
  SearchResultItem,
  TransferDocumentOwnershipResult,
} from '@ssoo/types/dms';
import { DatabaseService } from '../../../database/database.service.js';
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

const READ_REQUEST_ROLE = 'read';
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
  ) {}

  async createReadRequest(
    user: TokenPayload,
    payload: CreateDmsDocumentAccessRequestPayload,
  ): Promise<DmsDocumentAccessRequestSummary> {
    await this.ensureRepoControlPlaneSynced();
    const { absolutePath, relativePath } = this.resolveDocumentPath(payload.path);
    const access = this.documentAclService.describeSearchResultAccess(user, absolutePath);
    if (access.isReadable) {
      throw new BadRequestException('이미 문서를 읽을 수 있습니다.');
    }
    if (!access.canRequestRead) {
      throw new BadRequestException('읽기 권한을 요청할 수 없는 문서입니다.');
    }

    const requestedExpiresAt = this.parseFutureDate(payload.requestedExpiresAt, 'requestedExpiresAt');
    const document = await this.documentRecordService.ensureDocumentRecord(relativePath);
    const requesterUserId = BigInt(user.userId);

    const existingPending = await this.db.client.dmsDocumentAccessRequest.findFirst({
      where: {
        documentId: document.documentId,
        requesterUserId,
        requestedRole: READ_REQUEST_ROLE,
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
        requestedRole: READ_REQUEST_ROLE,
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
    ]);
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
        requestedRole: READ_REQUEST_ROLE,
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
        requestedRole: READ_REQUEST_ROLE,
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
        && this.documentAclService.isManageableAbsolutePath(user, absolutePath);
    });

    const actors = await this.loadActors(
      manageable.flatMap((request) => [request.requesterUserId, request.respondedByUserId]),
    );

    return manageable.map((request) => this.toAccessRequestSummary(request, actors, true));
  }

  async listManageableDocuments(user: TokenPayload): Promise<DmsManagedDocumentSummary[]> {
    await this.ensureRepoControlPlaneSynced();
    const rootDir = configService.getDocDir();
    const manageablePaths = listMarkdownFiles(rootDir)
      .filter((absolutePath) => this.documentAclService.isManageableAbsolutePath(user, absolutePath))
      .sort((left, right) => left.localeCompare(right));

    if (manageablePaths.length === 0) {
      return [];
    }

    const syncedDocuments: Array<{
      document: Awaited<ReturnType<DocumentRecordService['ensureDocumentRecord']>>;
      absolutePath: string;
      relativePath: string;
    }> = [];
    const fallbackDocuments: DmsManagedDocumentSummary[] = [];

    for (const absolutePath of manageablePaths) {
      const relativePath = this.normalizeRelativePath(path.relative(rootDir, absolutePath));
      try {
        const document = await this.documentRecordService.ensureDocumentRecord(relativePath);
        syncedDocuments.push({ document, absolutePath, relativePath });
      } catch {
        fallbackDocuments.push(buildFallbackManagedDocumentSummary(absolutePath, relativePath, rootDir));
      }
    }

    if (syncedDocuments.length === 0) {
      return fallbackDocuments;
    }

    const requests = await this.db.client.dmsDocumentAccessRequest.findMany({
      where: {
        documentId: { in: syncedDocuments.map(({ document }) => document.documentId) },
        requestedRole: READ_REQUEST_ROLE,
        isActive: true,
      },
      select: {
        documentId: true,
        statusCode: true,
      },
    });

    const requestsByDocumentId = new Map<string, Array<{ statusCode: string }>>();
    for (const request of requests) {
      const key = request.documentId.toString();
      const current = requestsByDocumentId.get(key) ?? [];
      current.push({ statusCode: request.statusCode });
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

    const rootDir = configService.getDocDir();
    const absolutePath = resolveAbsolutePath(document.relativePath, rootDir);
    if (!this.documentAclService.isManageableAbsolutePath(user, absolutePath)) {
      throw new ForbiddenException('문서 소유권을 이전할 권한이 없습니다.');
    }

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

    logger.info(
      `Document ${documentId} ownership transferred: user ${previousOwnerUserId} → user ${newOwner.id} (${newOwnerLoginId}) by user ${user.userId}`,
    );

    return {
      documentId: document.documentId.toString(),
      previousOwnerUserId: previousOwnerUserId.toString(),
      newOwnerUserId: newOwner.id.toString(),
      newOwnerLoginId: newOwner.authAccount!.loginId,
    };
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

    const rootDir = configService.getDocDir();
    const absolutePath = resolveAbsolutePath(document.relativePath, rootDir);
    if (!this.documentAclService.isManageableAbsolutePath(user, absolutePath)) {
      throw new ForbiddenException('grant를 취소할 권한이 없습니다.');
    }

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

    logger.info(
      `Grant ${grantId} revoked for document ${documentId} by user ${user.userId}`,
    );

    return { grantId: grant.documentGrantId.toString(), documentId: document.documentId.toString() };
  }

  async approveReadRequest(
    user: TokenPayload,
    accessRequestId: string,
    payload: ApproveDmsDocumentAccessRequestPayload,
  ): Promise<DmsDocumentAccessRequestSummary> {
    const request = await this.getRequestByIdOrThrow(accessRequestId);
    this.assertPendingRequest(request);

    const { absolutePath } = this.resolveDocumentPath(request.document.relativePath);
    if (!this.documentAclService.isManageableAbsolutePath(user, absolutePath)) {
      throw new ForbiddenException('요청을 승인할 권한이 없습니다.');
    }

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
          roleCode: READ_REQUEST_ROLE,
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
            roleCode: READ_REQUEST_ROLE,
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
    const actors = await this.loadActors([
      approved.requesterUserId,
      approved.respondedByUserId,
    ]);
    return this.toAccessRequestSummary(approved, actors, true);
  }

  async rejectReadRequest(
    user: TokenPayload,
    accessRequestId: string,
    payload: RejectDmsDocumentAccessRequestPayload,
  ): Promise<DmsDocumentAccessRequestSummary> {
    const request = await this.getRequestByIdOrThrow(accessRequestId);
    this.assertPendingRequest(request);

    const { absolutePath } = this.resolveDocumentPath(request.document.relativePath);
    if (!this.documentAclService.isManageableAbsolutePath(user, absolutePath)) {
      throw new ForbiddenException('요청을 거절할 권한이 없습니다.');
    }

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
    return this.toAccessRequestSummary(rejected, actors, true);
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
        requestedRole: READ_REQUEST_ROLE,
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
    if (request.requestedRole !== READ_REQUEST_ROLE) {
      throw new BadRequestException('현재는 읽기 권한 요청만 처리할 수 있습니다.');
    }

    if (request.statusCode !== 'pending') {
      throw new BadRequestException('이미 처리된 요청입니다.');
    }
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

    return {
      ...toRequestState(request),
      documentId: request.document.documentId.toString(),
      path: request.document.relativePath,
      documentTitle,
      requestedRole: READ_REQUEST_ROLE,
      requester: actors.get(request.requesterUserId.toString()) ?? {
        userId: request.requesterUserId.toString(),
        loginId: request.requesterUserId.toString(),
      },
      responder: request.respondedByUserId
        ? actors.get(request.respondedByUserId.toString())
        : undefined,
      grantId: request.generatedGrant?.documentGrantId.toString(),
      grantExpiresAt: toIsoString(request.generatedGrant?.expiresAt),
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
