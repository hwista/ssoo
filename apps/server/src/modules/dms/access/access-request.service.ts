import crypto from 'crypto';
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
  DocumentComment,
  DocumentPermissionGrant,
  RejectDmsDocumentAccessRequestPayload,
  SearchResultItem,
  SourceFileMeta,
} from '@ssoo/types/dms';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { configService } from '../runtime/dms-config.service.js';
import { contentService } from '../runtime/content.service.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
import { gitService, type GitRemoteParityStatus } from '../runtime/git.service.js';
import { normalizePath } from '../runtime/path-utils.js';
import {
  listMarkdownFiles,
  resolveAbsolutePath,
  resolveDocumentPresentation,
} from '../search/search.helpers.js';
import { DocumentAclService } from './document-acl.service.js';
import { DocumentControlPlaneService } from './document-control-plane.service.js';

const READ_REQUEST_ROLE = 'read';
const ACTIVE_REQUEST_SOURCE = 'dms.access.request';
const ACTIVE_REQUEST_ACTIVITY = 'dms.access.request.sync-document';
const CONTROL_PLANE_SYNC_MAX_AGE_MS = 30_000;
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

interface AccessRequestGrantRecord {
  documentGrantId: bigint;
  documentId?: bigint;
  principalType?: string;
  principalRef?: string;
  roleCode?: string;
  expiresAt: Date | null;
  grantedAt?: Date;
  grantSourceCode?: string | null;
}

interface AccessRequestRecord {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toIsoString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

function toRequestState(record: AccessRequestRecord): DmsDocumentAccessRequestState {
  return {
    requestId: record.accessRequestId.toString(),
    status: record.statusCode as DmsDocumentAccessRequestStatus,
    requestedAt: record.createdAt.toISOString(),
    requestMessage: record.requestMessage ?? undefined,
    requestedExpiresAt: toIsoString(record.requestedExpiresAt),
    respondedAt: toIsoString(record.respondedAt),
    responseMessage: record.responseMessage ?? undefined,
  };
}

function buildContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

@Injectable()
export class AccessRequestService {
  private lastControlPlaneSyncAt = 0;
  private controlPlaneSyncPromise: Promise<void> | null = null;
  private repairOwnerUserIdPromise: Promise<bigint | null> | null = null;
  private deferredGitBootstrapRoot: string | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly documentAclService: DocumentAclService,
    private readonly documentControlPlaneService: DocumentControlPlaneService,
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
    const document = await this.ensureDocumentRecord(relativePath);
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
      document: Awaited<ReturnType<AccessRequestService['ensureDocumentRecord']>>;
      absolutePath: string;
      relativePath: string;
    }> = [];
    const fallbackDocuments: DmsManagedDocumentSummary[] = [];

    for (const absolutePath of manageablePaths) {
      const relativePath = this.normalizeRelativePath(path.relative(rootDir, absolutePath));
      try {
        const document = await this.ensureDocumentRecord(relativePath);
        syncedDocuments.push({ document, absolutePath, relativePath });
      } catch {
        fallbackDocuments.push(this.buildFallbackManagedDocumentSummary(absolutePath, relativePath, rootDir));
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
      const grant = this.toDocumentPermissionGrant(grantRow);
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
      const grants = grantsByDocumentId.get(document.documentId.toString()) ?? this.extractGrants(metadata);
      const grantSummary = this.buildGrantSummary(grants);
      const requestSummary = this.buildRequestSummary(
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
    const now = Date.now();
    if (!force && now - this.lastControlPlaneSyncAt < CONTROL_PLANE_SYNC_MAX_AGE_MS) {
      return;
    }
    if (this.controlPlaneSyncPromise) {
      await this.controlPlaneSyncPromise;
      return;
    }

    this.controlPlaneSyncPromise = (async () => {
      try {
        await this.ensureGitContentPlaneReady();
        const repoParity = await this.inspectRepoMutationParity();
        if (!repoParity.canTreatLocalAsCanonical) {
          // GAP 3: remote ahead → try pull-then-sync before giving up
          const pullRecovered = await this.tryPullAndRecover(repoParity);
          if (!pullRecovered) {
            logger.warn('문서 repo -> control-plane 동기화 보류 (원격 parity 확인 필요)', {
              force,
              reason: repoParity.reason,
              syncStatus: repoParity.syncStatus
                ? {
                    remote: repoParity.syncStatus.remote,
                    remoteConfigured: repoParity.syncStatus.remoteConfigured,
                    remoteExists: repoParity.syncStatus.remoteExists,
                    remoteAhead: repoParity.syncStatus.remoteAhead,
                    localAhead: repoParity.syncStatus.localAhead,
                    diverged: repoParity.syncStatus.diverged,
                  }
                : undefined,
            });
            await this.documentControlPlaneService.refreshCache();
            this.lastControlPlaneSyncAt = Date.now();
            return;
          }
        }
        await this.syncRepoControlPlane(force);
        await this.documentControlPlaneService.refreshCache();
        this.lastControlPlaneSyncAt = Date.now();
      } catch (error) {
        logger.warn('문서 control-plane 동기화 실패', error instanceof Error ? { message: error.message } : undefined);
        throw error;
      } finally {
        this.controlPlaneSyncPromise = null;
      }
    })();

    await this.controlPlaneSyncPromise;
  }

  private async inspectRepoMutationParity(): Promise<GitRemoteParityStatus> {
    const parityResult = await gitService.inspectRemoteParity('origin');
    if (parityResult.success) {
      return parityResult.data;
    }

    return {
      remote: 'origin',
      verified: false,
      canTreatLocalAsCanonical: false,
      reason: `PARITY_CHECK_FAILED: ${parityResult.error}`,
    };
  }

  /**
   * remote가 ahead인 경우 fast-forward pull을 시도하여 parity를 회복합니다.
   * diverged 상태에서는 pull하지 않습니다.
   * @returns true면 pull 성공 → syncRepoControlPlane 진행 가능
   */
  private async tryPullAndRecover(parity: GitRemoteParityStatus): Promise<boolean> {
    const sync = parity.syncStatus;
    if (!sync) return false;

    // remote ahead + local not ahead → fast-forward 가능
    if (sync.remoteAhead && !sync.localAhead && !sync.diverged) {
      const result = await gitService.pullFastForward('origin');
      if (result.pulled) {
        logger.info('런타임 auto-pull 성공 (remote → local ff-only)', {
          behindCount: sync.behindCount,
          pulledCommits: result.commitCount,
        });
        return true;
      }
      logger.warn('런타임 auto-pull 스킵', { reason: result.reason });
      return false;
    }

    return false;
  }

  async syncDocumentProjection(
    relativePath: string,
    metadataOverride?: Record<string, unknown> | null,
  ): Promise<void> {
    const normalized = this.normalizeRelativePath(relativePath);
    await this.ensureGitContentPlaneReady();
    await this.ensureDocumentRecord(normalized, metadataOverride);
    await this.documentControlPlaneService.refreshProjectedMetadataByRelativePath(normalized);
    this.lastControlPlaneSyncAt = Date.now();
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

    await this.ensureGitContentPlaneReady();
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
    const metadataSource = this.ensureDocumentMetadataSeed(
      this.mergeCanonicalMetadataSource(existing.metadataJson, metadataOverride),
      absolutePath,
      content,
    );
    const owner = await this.resolveCanonicalOwnerIdentity(metadataSource, existing.ownerUserId);
    const canonicalMetadata = this.normalizeCanonicalMetadata(metadataSource, owner);
    const visibilityScope = this.extractVisibilityScope(canonicalMetadata);
    const targetOrgId = this.extractTargetOrgId(canonicalMetadata);
    const revisionSeq = this.extractRevisionSeq(canonicalMetadata) ?? 1;
    const contentHash = this.extractContentHash(canonicalMetadata) ?? buildContentHash(content);
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
    await this.syncDocumentProjectionRelations(existing.documentId, nextNormalized, canonicalMetadata, owner.userId);
    this.documentControlPlaneService.clearCachedMetadataByRelativePath(previousNormalized);
    await this.documentControlPlaneService.refreshProjectedMetadataByRelativePath(nextNormalized);
    this.lastControlPlaneSyncAt = Date.now();
  }

  private async ensureGitContentPlaneReady(): Promise<void> {
    const rootDir = configService.getDocDir();
    const workingTreeEntries = fs.existsSync(rootDir)
      ? fs.readdirSync(rootDir)
      : [];
    const hasGitRepository = workingTreeEntries.includes('.git');
    const visibleEntries = workingTreeEntries.filter((entry) => entry !== '.git');
    const shouldInitializeGit = hasGitRepository || workingTreeEntries.length === 0;

    if (!shouldInitializeGit) {
      if (!hasGitRepository && this.deferredGitBootstrapRoot !== rootDir) {
        this.deferredGitBootstrapRoot = rootDir;
        logger.warn('Git content-plane bootstrap 보류 (reconcile 필요)', {
          rootDir,
          visibleEntryCount: visibleEntries.length,
          bootstrapRemoteConfigured: Boolean(configService.getGitBootstrapRemoteUrl()),
        });
      }
      return;
    }

    this.deferredGitBootstrapRoot = null;
    const initResult = await gitService.initialize();
    if (!initResult.success) {
      throw new Error(`Git content-plane bootstrap failed: ${initResult.error}`);
    }
  }

  private async syncRepoControlPlane(force: boolean): Promise<void> {
    const rootDir = configService.getDocDir();
    const markdownFiles = listMarkdownFiles(rootDir);
    const scannedRelativePaths = new Set<string>();
    let synced = 0;
    let repaired = 0;
    let failed = 0;

    for (const absolutePath of markdownFiles) {
      const relativePath = this.normalizeRelativePath(path.relative(rootDir, absolutePath));
      scannedRelativePaths.add(relativePath);
      try {
        await this.ensureDocumentRecord(relativePath);
        synced += 1;
      } catch (error) {
        try {
          await this.upsertRepairNeededDocument(relativePath, absolutePath, error);
          repaired += 1;
        } catch (repairError) {
          failed += 1;
          logger.warn('repair-needed 문서 동기화도 실패', {
            relativePath,
            error: repairError instanceof Error ? repairError.message : String(repairError),
          });
        }
      }
    }

    const deactivated = await this.deactivateMissingDocuments(scannedRelativePaths);

    logger.info('문서 repo -> control-plane 동기화 완료', {
      force,
      scanned: markdownFiles.length,
      synced,
      repaired,
      failed,
      deactivated,
    });
  }

  private async deactivateMissingDocuments(scannedRelativePaths: ReadonlySet<string>): Promise<number> {
    const activeDocuments = await this.db.client.dmsDocument.findMany({
      where: {
        isActive: true,
        documentStatusCode: 'active',
      },
      select: {
        documentId: true,
        relativePath: true,
      },
    });

    const missingDocumentIds = activeDocuments
      .filter((document) => !scannedRelativePaths.has(document.relativePath))
      .map((document) => document.documentId);
    if (missingDocumentIds.length === 0) {
      return 0;
    }

    const reconciledAt = new Date();
    await this.db.client.$transaction(async (tx) => {
      await tx.dmsDocument.updateMany({
        where: {
          documentId: { in: missingDocumentIds },
        },
        data: {
          documentStatusCode: 'deleted',
          syncStatusCode: 'deleted',
          isActive: false,
          lastReconciledAt: reconciledAt,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.request.sync-document.deactivate-missing',
        },
      });
      await tx.dmsDocumentSourceFile.updateMany({
        where: {
          documentId: { in: missingDocumentIds },
          isActive: true,
        },
        data: {
          isActive: false,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.request.sync-document.deactivate-missing',
        },
      });
      await tx.dmsDocumentPathHistory.updateMany({
        where: {
          documentId: { in: missingDocumentIds },
          isActive: true,
        },
        data: {
          isActive: false,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.request.sync-document.deactivate-missing',
        },
      });
      await tx.dmsDocumentComment.updateMany({
        where: {
          documentId: { in: missingDocumentIds },
          isActive: true,
        },
        data: {
          isActive: false,
          lastSource: ACTIVE_REQUEST_SOURCE,
          lastActivity: 'dms.access.request.sync-document.deactivate-missing',
        },
      });
    });

    return missingDocumentIds.length;
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

  private async upsertRepairNeededDocument(
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
      this.mergeCanonicalMetadataSource(existing?.metadataJson),
      absolutePath,
      content,
    );
    const fallbackOwner = await this.resolveCanonicalOwnerIdentity(metadataSource, repairOwnerUserId);
    const canonicalMetadata = this.normalizeCanonicalMetadata(metadataSource, {
      ...fallbackOwner,
      repaired: true,
      repairReason: cause instanceof Error ? cause.message : String(cause),
    });
    const visibilityScope = this.extractVisibilityScope(canonicalMetadata);
    const targetOrgId = this.extractTargetOrgId(canonicalMetadata);
    const revisionSeq = this.extractRevisionSeq(canonicalMetadata) ?? 1;
    const contentHash = this.extractContentHash(canonicalMetadata) ?? buildContentHash(content);
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
      await this.syncDocumentProjectionRelations(existing.documentId, relativePath, canonicalMetadata, fallbackOwner.userId);
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
    await this.syncDocumentProjectionRelations(created.documentId, relativePath, canonicalMetadata, fallbackOwner.userId);
  }

  private async resolveCanonicalOwnerIdentity(
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

  private mergeCanonicalMetadataSource(
    persistedMetadataJson: Prisma.JsonValue | null | undefined,
    metadataOverride?: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    const persistedMetadata = isRecord(persistedMetadataJson) ? persistedMetadataJson : null;
    const merged = {
      ...(persistedMetadata ?? {}),
      ...(metadataOverride ?? {}),
    };

    return Object.keys(merged).length > 0 ? merged : null;
  }

  private ensureDocumentMetadataSeed(
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

  private normalizeCanonicalMetadata(
    metadata: Record<string, unknown> | null,
    owner: { userId: bigint; loginId: string; repaired: boolean; repairReason?: string },
  ): Record<string, unknown> {
    const next = {
      ...(metadata ?? {}),
      ownerId: owner.userId.toString(),
      ownerLoginId: owner.loginId,
      author: owner.loginId,
      lastModifiedBy: typeof metadata?.['lastModifiedBy'] === 'string' && metadata['lastModifiedBy'].trim()
        ? metadata['lastModifiedBy'].trim()
        : owner.loginId,
      visibility: isRecord(metadata?.['visibility'])
        ? metadata?.['visibility']
        : { scope: 'self' },
      grants: Array.isArray(metadata?.['grants']) ? metadata['grants'] : [],
      controlPlaneRepair: owner.repaired
        ? {
            needed: true,
            reason: owner.repairReason ?? 'owner/author normalized during control-plane sync',
            repairedAt: new Date().toISOString(),
          }
        : undefined,
    } as Record<string, unknown>;

    if (!owner.repaired) {
      delete next.controlPlaneRepair;
    }

    return next;
  }

  private async ensureDocumentRecord(
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

    const metadataSource = this.mergeCanonicalMetadataSource(
      existing?.metadataJson,
      metadataOverride,
    );
    const seededMetadataSource = this.ensureDocumentMetadataSeed(
      metadataSource,
      absolutePath,
      content,
    );
    const owner = await this.resolveCanonicalOwnerIdentity(seededMetadataSource, existing?.ownerUserId ?? null);
    const canonicalMetadata = this.normalizeCanonicalMetadata(seededMetadataSource, owner);
    const visibilityScope = this.extractVisibilityScope(canonicalMetadata);
    const targetOrgId = this.extractTargetOrgId(canonicalMetadata);
    const revisionSeq = this.extractRevisionSeq(canonicalMetadata) ?? 1;
    const contentHash = this.extractContentHash(canonicalMetadata) ?? buildContentHash(content);
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
      await this.syncDocumentProjectionRelations(updated.documentId, relativePath, canonicalMetadata, owner.userId);
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
    await this.syncDocumentProjectionRelations(created.documentId, relativePath, canonicalMetadata, owner.userId);
    return created;
  }

  private extractVisibilityScope(metadata: Record<string, unknown> | null) {
    const visibility = metadata?.['visibility'];
    if (
      isRecord(visibility)
      && (visibility.scope === 'public' || visibility.scope === 'organization' || visibility.scope === 'self')
    ) {
      return visibility.scope;
    }

    return 'self';
  }

  private extractTargetOrgId(metadata: Record<string, unknown> | null) {
    const visibility = metadata?.['visibility'];
    if (!isRecord(visibility) || typeof visibility.targetOrgId !== 'string') {
      return null;
    }

    const trimmed = visibility.targetOrgId.trim();
    return /^\d+$/.test(trimmed) ? BigInt(trimmed) : null;
  }

  private extractRevisionSeq(metadata: Record<string, unknown> | null) {
    return typeof metadata?.['revisionSeq'] === 'number'
      ? metadata['revisionSeq']
      : undefined;
  }

  private extractContentHash(metadata: Record<string, unknown> | null) {
    return typeof metadata?.['contentHash'] === 'string' && metadata['contentHash'].trim()
      ? metadata['contentHash'].trim()
      : undefined;
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

  private extractGrants(metadata: Record<string, unknown> | null): DocumentPermissionGrant[] {
    if (!Array.isArray(metadata?.['grants'])) {
      return [];
    }

    return metadata['grants'].flatMap((grant) => {
      if (!isRecord(grant)) {
        return [];
      }

      const principalId = typeof grant['principalId'] === 'string' ? grant['principalId'].trim() : '';
      const principalType = grant['principalType'];
      const role = grant['role'];
      if (!principalId || (principalType !== 'user' && principalType !== 'organization' && principalType !== 'team' && principalType !== 'group')) {
        return [];
      }
      if (role !== 'read' && role !== 'write' && role !== 'manage') {
        return [];
      }

      return [{
        principalId,
        principalType,
        role,
        expiresAt: typeof grant['expiresAt'] === 'string' ? grant['expiresAt'] : undefined,
        grantedAt: typeof grant['grantedAt'] === 'string' ? grant['grantedAt'] : undefined,
        grantedBy: typeof grant['grantedBy'] === 'string' ? grant['grantedBy'] : undefined,
        source: grant['source'] === 'request'
          || grant['source'] === 'share'
          || grant['source'] === 'migration'
          || grant['source'] === 'owner-default'
          ? grant['source']
          : undefined,
      } satisfies DocumentPermissionGrant];
    });
  }

  private buildGrantSummary(grants: DocumentPermissionGrant[]) {
    const summary = {
      total: grants.length,
      read: 0,
      write: 0,
      manage: 0,
      expired: 0,
    };

    for (const grant of grants) {
      if (grant.role === 'read') summary.read += 1;
      if (grant.role === 'write') summary.write += 1;
      if (grant.role === 'manage') summary.manage += 1;
      if (grant.expiresAt && Date.parse(grant.expiresAt) < Date.now()) summary.expired += 1;
    }

    return summary;
  }

  private buildRequestSummary(requests: Array<{ statusCode: string }>) {
    const summary = {
      total: requests.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    for (const request of requests) {
      if (request.statusCode === 'pending') summary.pending += 1;
      if (request.statusCode === 'approved') summary.approved += 1;
      if (request.statusCode === 'rejected') summary.rejected += 1;
    }

    return summary;
  }

  private buildFallbackManagedDocumentSummary(
    absolutePath: string,
    relativePath: string,
    rootDir: string,
  ): DmsManagedDocumentSummary {
    const presentation = resolveDocumentPresentation(
      absolutePath,
      rootDir,
      path.basename(relativePath, '.md'),
    );
    return {
      documentId: `fallback:${relativePath}`,
      path: relativePath,
      documentTitle: presentation.title,
      owner: {
        userId: `unknown:${relativePath}`,
        loginId: 'unknown',
      },
      visibilityScope: 'legacy',
      syncStatusCode: 'repair_needed',
      repairReason: 'control-plane metadata sync failed',
      grants: [],
      grantSummary: this.buildGrantSummary([]),
      requestSummary: this.buildRequestSummary([]),
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

  private async syncDocumentProjectionRelations(
    documentId: bigint,
    relativePath: string,
    metadata: Record<string, unknown> | null,
    actorUserId: bigint,
  ): Promise<void> {
    await Promise.all([
      this.syncDocumentSourceFiles(documentId, metadata, actorUserId),
      this.syncDocumentPathHistory(documentId, relativePath, metadata, actorUserId),
      this.syncDocumentComments(documentId, metadata, actorUserId),
    ]);
  }

  private async syncDocumentSourceFiles(
    documentId: bigint,
    metadata: Record<string, unknown> | null,
    actorUserId: bigint,
  ): Promise<void> {
    const sourceFiles = this.normalizeSourceFiles(metadata);
    await this.db.client.dmsDocumentSourceFile.deleteMany({ where: { documentId } });
    if (sourceFiles.length === 0) {
      return;
    }

    await this.db.client.dmsDocumentSourceFile.createMany({
      data: sourceFiles.map((sourceFile, index) => ({
        documentId,
        sourceName: sourceFile.name,
        sourcePath: sourceFile.path,
        mediaType: sourceFile.type ?? null,
        fileSize: sourceFile.size ?? null,
        url: sourceFile.url ?? null,
        storageUri: sourceFile.storageUri ?? null,
        providerCode: sourceFile.provider ?? null,
        versionId: sourceFile.versionId ?? null,
        etag: sourceFile.etag ?? null,
        checksum: sourceFile.checksum ?? null,
        originCode: sourceFile.origin ?? null,
        statusCode: sourceFile.status ?? null,
        storageMode: sourceFile.storage ?? null,
        kindCode: sourceFile.kind ?? null,
        sortOrder: index,
        projectionJson: this.toSourceFileProjectionJson(sourceFile),
        createdBy: actorUserId,
        updatedBy: actorUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: ACTIVE_REQUEST_ACTIVITY,
      })),
    });
  }

  private async syncDocumentPathHistory(
    documentId: bigint,
    relativePath: string,
    metadata: Record<string, unknown> | null,
    actorUserId: bigint,
  ): Promise<void> {
    const pathHistory = this.normalizePathHistory(relativePath, metadata);
    await this.db.client.dmsDocumentPathHistory.deleteMany({ where: { documentId } });
    if (pathHistory.length === 0) {
      return;
    }

    await this.db.client.dmsDocumentPathHistory.createMany({
      data: pathHistory.map((entry) => ({
        documentId,
        relativePath: entry.path,
        previousRelativePath: entry.previousRelativePath ?? null,
        reasonCode: entry.reasonCode,
        changedAt: entry.changedAt,
        changedByUserId: actorUserId,
        createdBy: actorUserId,
        updatedBy: actorUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: ACTIVE_REQUEST_ACTIVITY,
      })),
    });
  }

  private async syncDocumentComments(
    documentId: bigint,
    metadata: Record<string, unknown> | null,
    actorUserId: bigint,
  ): Promise<void> {
    const comments = this.normalizeComments(metadata);
    await this.db.client.dmsDocumentComment.deleteMany({ where: { documentId } });
    if (comments.length === 0) {
      return;
    }

    await this.db.client.dmsDocumentComment.createMany({
      data: comments.map((comment, index) => ({
        documentId,
        commentKey: comment.id,
        parentCommentKey: comment.parentId ?? null,
        commentContent: comment.content,
        authorName: comment.author,
        authorEmail: comment.email ?? null,
        avatarUrl: comment.avatarUrl ?? null,
        commentCreatedAt: new Date(comment.createdAt),
        commentDeletedAt: comment.deletedAt ? new Date(comment.deletedAt) : null,
        sortOrder: index,
        isActive: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: ACTIVE_REQUEST_ACTIVITY,
      })),
    });
  }

  private normalizeSourceFiles(metadata: Record<string, unknown> | null): SourceFileMeta[] {
    const value = metadata?.['sourceFiles'] ?? metadata?.['referenceFiles'];
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((entry) => {
      if (!isRecord(entry)) {
        return [];
      }

      const name = typeof entry['name'] === 'string' ? entry['name'].trim() : '';
      const sourcePath = typeof entry['path'] === 'string' ? entry['path'].trim() : '';
      if (!name || !sourcePath) {
        return [];
      }

      const normalizedImages = Array.isArray(entry['images'])
        ? entry['images'].flatMap((image) => {
            if (
              !isRecord(image)
              || typeof image['base64'] !== 'string'
              || typeof image['mimeType'] !== 'string'
              || typeof image['name'] !== 'string'
              || typeof image['size'] !== 'number'
            ) {
              return [];
            }

            return [{
              base64: image['base64'],
              mimeType: image['mimeType'],
              name: image['name'],
              size: image['size'],
            }];
          })
        : undefined;

      return [{
        name,
        path: sourcePath,
        type: typeof entry['type'] === 'string' ? entry['type'] : undefined,
        size: typeof entry['size'] === 'number' && Number.isFinite(entry['size']) ? entry['size'] : undefined,
        url: typeof entry['url'] === 'string' ? entry['url'] : undefined,
        storageUri: typeof entry['storageUri'] === 'string' ? entry['storageUri'] : undefined,
        provider: typeof entry['provider'] === 'string' ? entry['provider'] : undefined,
        versionId: typeof entry['versionId'] === 'string' ? entry['versionId'] : undefined,
        etag: typeof entry['etag'] === 'string' ? entry['etag'] : undefined,
        checksum: typeof entry['checksum'] === 'string' ? entry['checksum'] : undefined,
        origin: this.normalizeSourceFileOrigin(entry['origin']),
        status: this.normalizeSourceFileStatus(entry['status']),
        textContent: typeof entry['textContent'] === 'string' ? entry['textContent'] : undefined,
        storage: this.normalizeSourceFileStorage(entry['storage']),
        kind: this.normalizeSourceFileKind(entry['kind']),
        tempId: typeof entry['tempId'] === 'string' ? entry['tempId'] : undefined,
        images: normalizedImages,
      }];
    });
  }

  private normalizePathHistory(
    relativePath: string,
    metadata: Record<string, unknown> | null,
  ): Array<{
    path: string;
    previousRelativePath?: string;
    changedAt: Date;
    reasonCode: 'create' | 'rename' | 'move' | 'reconcile';
  }> {
    const rawEntries = Array.isArray(metadata?.['pathHistory']) ? metadata['pathHistory'] : [];
    const normalized = rawEntries.flatMap((entry) => {
      if (
        !isRecord(entry)
        || typeof entry['path'] !== 'string'
        || typeof entry['changedAt'] !== 'string'
      ) {
        return [];
      }

      const pathValue = entry['path'].trim();
      const changedAt = new Date(entry['changedAt']);
      if (!pathValue || Number.isNaN(changedAt.getTime())) {
        return [];
      }

      const reason = entry['reason'];
      const reasonCode: 'create' | 'rename' | 'move' | 'reconcile' = (
        reason === 'rename' || reason === 'move' || reason === 'reconcile'
          ? reason
          : 'create'
      );
      return [{
        path: pathValue,
        previousRelativePath: typeof entry['previousRelativePath'] === 'string'
          ? entry['previousRelativePath'].trim()
          : undefined,
        changedAt,
        reasonCode,
      }];
    });

    if (normalized.length > 0) {
      return normalized;
    }

    return [{
      path: relativePath,
      changedAt: new Date(),
      reasonCode: 'create',
    }];
  }

  private normalizeComments(metadata: Record<string, unknown> | null): DocumentComment[] {
    const rawEntries = Array.isArray(metadata?.['comments']) ? metadata['comments'] : [];
    const seen = new Set<string>();

    return rawEntries.flatMap((entry) => {
      if (!isRecord(entry)) {
        return [];
      }

      const id = typeof entry['id'] === 'string' ? entry['id'].trim() : '';
      const author = typeof entry['author'] === 'string' ? entry['author'].trim() : '';
      const content = typeof entry['content'] === 'string' ? entry['content'].trim() : '';
      const createdAtValue = typeof entry['createdAt'] === 'string' ? entry['createdAt'].trim() : '';
      const createdAt = new Date(createdAtValue);
      if (!id || seen.has(id) || !author || !content || Number.isNaN(createdAt.getTime())) {
        return [];
      }

      seen.add(id);

      const parentId = typeof entry['parentId'] === 'string' && entry['parentId'].trim().length > 0
        ? entry['parentId'].trim()
        : undefined;
      const deletedAtValue = typeof entry['deletedAt'] === 'string' ? entry['deletedAt'].trim() : '';
      const deletedAt = deletedAtValue ? new Date(deletedAtValue) : null;

      return [{
        id,
        author,
        content,
        createdAt: createdAt.toISOString(),
        email: typeof entry['email'] === 'string' ? entry['email'].trim() || undefined : undefined,
        avatarUrl: typeof entry['avatarUrl'] === 'string' ? entry['avatarUrl'].trim() || undefined : undefined,
        parentId,
        deletedAt: deletedAt && !Number.isNaN(deletedAt.getTime()) ? deletedAt.toISOString() : undefined,
      }];
    });
  }

  private normalizeSourceFileOrigin(value: unknown): SourceFileMeta['origin'] | undefined {
    return value === 'manual'
      || value === 'ingest'
      || value === 'teams'
      || value === 'network_drive'
      || value === 'reference'
      || value === 'template'
      || value === 'picker'
      || value === 'assistant'
      || value === 'current-document'
      || value === 'template-selected'
      ? value
      : undefined;
  }

  private normalizeSourceFileStatus(value: unknown): SourceFileMeta['status'] | undefined {
    return value === 'draft' || value === 'pending_confirm' || value === 'published'
      ? value
      : undefined;
  }

  private normalizeSourceFileStorage(value: unknown): SourceFileMeta['storage'] | undefined {
    return value === 'path' || value === 'inline' ? value : undefined;
  }

  private normalizeSourceFileKind(value: unknown): SourceFileMeta['kind'] | undefined {
    return value === 'document' || value === 'file' ? value : undefined;
  }

  private toSourceFileProjectionJson(sourceFile: SourceFileMeta): Prisma.InputJsonValue | undefined {
    const projection = {
      ...(sourceFile.tempId ? { tempId: sourceFile.tempId } : {}),
      ...(sourceFile.textContent ? { textContent: sourceFile.textContent } : {}),
      ...(sourceFile.images ? { images: sourceFile.images } : {}),
    };

    return Object.keys(projection).length > 0
      ? JSON.parse(JSON.stringify(projection)) as Prisma.InputJsonValue
      : undefined;
  }

  private toDocumentPermissionGrant(grant: AccessRequestGrantRecord): DocumentPermissionGrant | null {
    if (
      !grant.principalRef
      || (grant.principalType !== 'user'
        && grant.principalType !== 'organization'
        && grant.principalType !== 'team'
        && grant.principalType !== 'group')
      || (grant.roleCode !== 'read' && grant.roleCode !== 'write' && grant.roleCode !== 'manage')
    ) {
      return null;
    }

    return {
      principalId: grant.principalRef,
      principalType: grant.principalType,
      role: grant.roleCode,
      expiresAt: toIsoString(grant.expiresAt),
      grantedAt: grant.grantedAt?.toISOString(),
      source: grant.grantSourceCode === 'request'
        || grant.grantSourceCode === 'share'
        || grant.grantSourceCode === 'migration'
        || grant.grantSourceCode === 'owner-default'
        ? grant.grantSourceCode
        : undefined,
    };
  }
}
