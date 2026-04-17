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
  RejectDmsDocumentAccessRequestPayload,
  SearchResultItem,
} from '@ssoo/types/dms';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { configService } from '../runtime/dms-config.service.js';
import { contentService } from '../runtime/content.service.js';
import { normalizePath } from '../runtime/path-utils.js';
import {
  resolveAbsolutePath,
  resolveDocumentPresentation,
} from '../search/search.helpers.js';
import { DocumentAclService } from './document-acl.service.js';

const READ_REQUEST_ROLE = 'read';
const ACTIVE_REQUEST_SOURCE = 'dms.access.request';
const ACTIVE_REQUEST_ACTIVITY = 'dms.access.request.sync-document';

interface AccessRequestDocumentRecord {
  documentId: bigint;
  relativePath: string;
  visibilityScope: string;
  targetOrgId: bigint | null;
  ownerUserId: bigint;
  metadataJson: Prisma.JsonValue | null;
}

interface AccessRequestGrantRecord {
  documentGrantId: bigint;
  expiresAt: Date | null;
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
  constructor(
    private readonly db: DatabaseService,
    private readonly documentAclService: DocumentAclService,
  ) {}

  async createReadRequest(
    user: TokenPayload,
    payload: CreateDmsDocumentAccessRequestPayload,
  ): Promise<DmsDocumentAccessRequestSummary> {
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

    await this.syncApprovedGrantToSidecar(approved, user.loginId);
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

  private async ensureDocumentRecord(relativePath: string) {
    const absolutePath = resolveAbsolutePath(relativePath, configService.getDocDir());
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const sidecar = contentService.readSidecar(absolutePath);
    const existing = await this.db.client.dmsDocument.findUnique({
      where: {
        relativePath,
      },
      select: {
        documentId: true,
        ownerUserId: true,
        latestGitCommitHash: true,
        lastSyncedAt: true,
      },
    });

    const ownerUserId = await this.resolveOwnerUserId(sidecar, existing?.ownerUserId ?? null);
    const visibilityScope = this.extractVisibilityScope(sidecar);
    const targetOrgId = this.extractTargetOrgId(sidecar);
    const revisionSeq = this.extractRevisionSeq(sidecar) ?? 1;
    const contentHash = this.extractContentHash(sidecar) ?? buildContentHash(content);
    const metadataJson = sidecar
      ? JSON.parse(JSON.stringify(sidecar)) as Prisma.InputJsonValue
      : undefined;

    return this.db.client.dmsDocument.upsert({
      where: {
        relativePath,
      },
      create: {
        relativePath,
        visibilityScope,
        targetOrgId,
        ownerUserId,
        documentStatusCode: 'active',
        syncStatusCode: 'synced',
        revisionSeq,
        contentHash,
        latestGitCommitHash: existing?.latestGitCommitHash ?? undefined,
        metadataJson,
        lastScannedAt: new Date(),
        lastSyncedAt: new Date(),
        lastReconciledAt: new Date(),
        createdBy: ownerUserId,
        updatedBy: ownerUserId,
        lastSource: ACTIVE_REQUEST_SOURCE,
        lastActivity: ACTIVE_REQUEST_ACTIVITY,
      },
      update: {
        visibilityScope,
        targetOrgId,
        ownerUserId,
        documentStatusCode: 'active',
        syncStatusCode: 'synced',
        revisionSeq,
        contentHash,
        metadataJson,
        lastScannedAt: new Date(),
        lastSyncedAt: existing?.lastSyncedAt ?? new Date(),
        lastReconciledAt: new Date(),
        updatedBy: ownerUserId,
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
        metadataJson: true,
      },
    });
  }

  private async resolveOwnerUserId(
    sidecar: Record<string, unknown> | null,
    fallbackOwnerUserId: bigint | null,
  ): Promise<bigint> {
    const sidecarOwnerId = typeof sidecar?.['ownerId'] === 'string'
      ? sidecar['ownerId'].trim()
      : '';
    if (/^\d+$/.test(sidecarOwnerId)) {
      return BigInt(sidecarOwnerId);
    }

    const candidateLoginId = typeof sidecar?.['ownerLoginId'] === 'string' && sidecar['ownerLoginId'].trim()
      ? sidecar['ownerLoginId'].trim()
      : typeof sidecar?.['author'] === 'string' && sidecar['author'].trim()
        ? sidecar['author'].trim()
        : '';

    if (candidateLoginId) {
      const owner = await this.db.client.userAuth.findUnique({
        where: {
          loginId: candidateLoginId,
        },
        select: {
          userId: true,
        },
      });

      if (owner) {
        return owner.userId;
      }
    }

    if (fallbackOwnerUserId) {
      return fallbackOwnerUserId;
    }

    throw new BadRequestException('문서 owner 정보를 찾을 수 없습니다.');
  }

  private extractVisibilityScope(sidecar: Record<string, unknown> | null) {
    const visibility = sidecar?.['visibility'];
    if (
      isRecord(visibility)
      && (visibility.scope === 'public' || visibility.scope === 'organization' || visibility.scope === 'self')
    ) {
      return visibility.scope;
    }

    return 'self';
  }

  private extractTargetOrgId(sidecar: Record<string, unknown> | null) {
    const visibility = sidecar?.['visibility'];
    if (!isRecord(visibility) || typeof visibility.targetOrgId !== 'string') {
      return null;
    }

    const trimmed = visibility.targetOrgId.trim();
    return /^\d+$/.test(trimmed) ? BigInt(trimmed) : null;
  }

  private extractRevisionSeq(sidecar: Record<string, unknown> | null) {
    return typeof sidecar?.['revisionSeq'] === 'number'
      ? sidecar['revisionSeq']
      : undefined;
  }

  private extractContentHash(sidecar: Record<string, unknown> | null) {
    return typeof sidecar?.['contentHash'] === 'string' && sidecar['contentHash'].trim()
      ? sidecar['contentHash'].trim()
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

    return {
      ...toRequestState(request),
      documentId: request.document.documentId.toString(),
      path: request.document.relativePath,
      documentTitle: presentation.title,
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

  private async syncApprovedGrantToSidecar(
    request: AccessRequestRecord,
    responderLoginId: string,
  ): Promise<void> {
    const { absolutePath } = this.resolveDocumentPath(request.document.relativePath);
    const existingSidecar = contentService.readSidecar(absolutePath)
      ?? (isRecord(request.document.metadataJson) ? request.document.metadataJson : null);
    const currentGrants = Array.isArray(existingSidecar?.['grants'])
      ? existingSidecar['grants']
      : [];
    const nextGrant = {
      principalType: 'user',
      principalId: request.requesterUserId.toString(),
      role: READ_REQUEST_ROLE,
      expiresAt: toIsoString(request.generatedGrant?.expiresAt),
      grantedAt: toIsoString(request.respondedAt) ?? new Date().toISOString(),
      grantedBy: responderLoginId,
      source: 'request',
    };

    const nextGrants = [
      ...currentGrants.filter((grant) => !(
        isRecord(grant)
        && grant.principalType === 'user'
        && grant.role === READ_REQUEST_ROLE
        && grant.principalId === request.requesterUserId.toString()
      )),
      nextGrant,
    ];

    contentService.writeSidecar(absolutePath, {
      ...(existingSidecar ?? {}),
      grants: nextGrants,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: responderLoginId,
    });
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
