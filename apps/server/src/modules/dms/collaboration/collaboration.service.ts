import path from 'node:path';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import type { DocumentIsolationState, DocumentMutationAction } from '@ssoo/types/dms';
import { CommonNotificationService } from '../../common/notification/notification.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { UserService } from '../../common/user/user.service.js';
import { DmsEventsGateway } from '../events/dms-events.gateway.js';
import { gitService, type GitCommitAuthor, type GitRemoteParityStatus, type GitSyncStatus } from '../runtime/git.service.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
import { configService } from '../runtime/dms-config.service.js';
import {
  PRESENCE_TTL_MS,
  buildPresenceKey,
  filterGitManagedDocumentPaths,
  getTimestampMs,
  hasSameSerializedValue,
  isExpired,
  isGitManagedDocumentPath,
  normalizePath,
  pathsOverlap,
  resolveGitManagedPrimaryPath,
} from './collaboration-paths.util.js';
import {
  type PathReleaseOverride,
  sanitizeIsolationState,
  sanitizePathOverride,
  sanitizePublishState,
  sanitizeSoftLock,
} from './collaboration-sanitizers.util.js';
import {
  BLOCKED_MUTATION_ACTIONS,
  buildIsolationException,
  buildOperatorLockIsolation,
  isForceUnlockActive,
  resolveRefreshError,
  resolveRefreshStatus,
  resolveTrackedPaths,
  shouldAutoReleasePublishIsolation,
} from './collaboration-isolation.util.js';
import {
  type PersistedState,
  hydrateSanitizedMap,
  readPersistedStateFile,
  writePersistedStateFile,
} from './collaboration-state.io.js';

const logger = createDmsLogger('DmsCollaborationService');
const STATE_FILE = '.dms-collaboration-state.json';
const TAKEOVER_REQUEST_TTL_MS = 30_000;
const TAKEOVER_REQUEST_EXPIRED_RETENTION_MS = 5 * 60_000;

type CollaborationMode = 'view' | 'edit';
export type PublishStatus = 'clean' | 'dirty-uncommitted' | 'publishing' | 'committed-unpushed' | 'sync-blocked' | 'push-failed';

export interface CollaborationMember {
  userId: string;
  loginId: string;
  displayName: string;
  email: string;
  sessionId: string;
  mode: CollaborationMode;
  joinedAt: string;
  lastSeenAt: string;
}

export interface DocumentPublishState {
  path: string;
  status: PublishStatus;
  operationType?: string;
  affectedPaths?: string[];
  lastActorLoginId?: string;
  lastActorDisplayName?: string;
  lastQueuedAt?: string;
  lastCommitHash?: string;
  lastError?: string;
  lastPublishedAt?: string;
  retryCount?: number;
  syncStatus?: GitSyncStatus;
}

export interface DocumentSoftLock {
  path: string;
  userId: string;
  loginId: string;
  displayName: string;
  email: string;
  sessionId: string;
  acquiredAt: string;
  lastSeenAt: string;
}

export interface DocumentCollaborationSnapshot {
  path: string;
  members: CollaborationMember[];
  publishState: DocumentPublishState;
  softLock: DocumentSoftLock | null;
  isolation: DocumentIsolationState | null;
}

export interface SoftLockTakeoverActor {
  userId: string;
  loginId: string;
  displayName: string;
  email: string;
  sessionId: string;
}

export interface SoftLockTakeoverRequest {
  requestId: string;
  path: string;
  requester: SoftLockTakeoverActor;
  owner: SoftLockTakeoverActor;
  requestedAt: string;
  expiresAt: string;
}

export interface SoftLockTakeoverResult {
  status: 'granted' | 'requested';
  snapshot: DocumentCollaborationSnapshot;
  request?: SoftLockTakeoverRequest;
}

export interface SoftLockTakeoverResponse {
  requestId: string;
  path: string;
  status: 'approved' | 'rejected' | 'expired';
  snapshot: DocumentCollaborationSnapshot;
  message?: string;
}

export interface SoftLockTakeoverPendingState {
  requesterRequest: SoftLockTakeoverRequest | null;
  ownerRequest: SoftLockTakeoverRequest | null;
}

interface ActorProfile {
  displayName: string;
  email: string;
}

interface PublishJob {
  primaryPath: string;
  affectedPaths: Set<string>;
  operationType: string;
  actor: TokenPayload;
  queuedAt: string;
  timer: NodeJS.Timeout | null;
  processing: boolean;
}

@Injectable()
export class CollaborationService implements OnModuleDestroy {
  private readonly presenceByPath = new Map<string, Map<string, CollaborationMember>>();
  private readonly publishStateByPath = new Map<string, DocumentPublishState>();
  private readonly softLockByPath = new Map<string, DocumentSoftLock>();
  private readonly softLockTakeoverRequestsById = new Map<string, SoftLockTakeoverRequest>();
  private readonly pathIsolationByPath = new Map<string, DocumentIsolationState>();
  private readonly pathOverrideByPath = new Map<string, PathReleaseOverride>();
  private readonly publishJobsByPath = new Map<string, PublishJob>();
  private readonly actorCache = new Map<string, ActorProfile>();
  private readonly stateFilePath: string;

  constructor(
    private readonly userService: UserService,
    private readonly notificationService: CommonNotificationService,
    @Optional() private readonly eventsGateway?: DmsEventsGateway,
  ) {
    this.stateFilePath = path.join(configService.getAppRoot(), STATE_FILE);
    this.loadPersistedState();
  }

  onModuleDestroy(): void {
    for (const job of this.publishJobsByPath.values()) {
      if (job.timer) clearTimeout(job.timer);
    }
    this.publishJobsByPath.clear();
    this.persistState();
  }

  async heartbeat(input: {
    path: string;
    currentUser: TokenPayload;
    sessionId?: string;
    mode?: CollaborationMode;
  }): Promise<DocumentCollaborationSnapshot> {
    const normalizedPath = normalizePath(input.path);
    const actor = await this.resolveActorProfile(input.currentUser);
    const sessionId = this.resolveSessionId(input.currentUser, input.sessionId);
    const key = buildPresenceKey(input.currentUser.userId, sessionId);
    const now = new Date().toISOString();
    const mode = input.mode ?? 'view';

    this.cleanupInactiveMembers(normalizedPath);
    this.cleanupInactiveLock(normalizedPath);
    const members = this.getOrCreatePresence(normalizedPath);
    const existing = members.get(key);

    if (mode === 'edit') {
      this.assertCanEnterEditMode(normalizedPath, input.currentUser, sessionId);
      this.touchOrAcquireSoftLock(normalizedPath, input.currentUser, actor, sessionId, now);
    } else {
      this.releaseOwnSoftLock(normalizedPath, input.currentUser, sessionId);
    }

    members.set(key, {
      userId: input.currentUser.userId,
      loginId: input.currentUser.loginId,
      displayName: actor.displayName,
      email: actor.email,
      sessionId,
      mode,
      joinedAt: existing?.joinedAt ?? now,
      lastSeenAt: now,
    });

    const snapshot = this.getSnapshot(normalizedPath);
    this.emitCollaborationChanged(normalizedPath, snapshot, existing ? (mode === existing.mode ? 'join' : 'mode') : 'join');
    return snapshot;
  }

  async renewSoftLock(input: {
    path: string;
    currentUser: TokenPayload;
    sessionId?: string;
  }): Promise<DocumentCollaborationSnapshot> {
    const normalizedPath = normalizePath(input.path);
    const sessionId = this.resolveSessionId(input.currentUser, input.sessionId);
    const actor = await this.resolveActorProfile(input.currentUser);
    const now = new Date().toISOString();

    this.cleanupInactiveMembers(normalizedPath);
    this.cleanupInactiveLock(normalizedPath);
    this.assertCanEnterEditMode(normalizedPath, input.currentUser, sessionId);
    this.touchOrAcquireSoftLock(normalizedPath, input.currentUser, actor, sessionId, now);
    this.upsertPresenceMember(normalizedPath, {
      userId: input.currentUser.userId,
      loginId: input.currentUser.loginId,
      displayName: actor.displayName,
      email: actor.email,
      sessionId,
    }, 'edit', now);

    const snapshot = this.getSnapshot(normalizedPath);
    this.emitCollaborationChanged(normalizedPath, snapshot, 'lock');
    return snapshot;
  }

  async takeover(input: { path: string; currentUser: TokenPayload; sessionId?: string }): Promise<SoftLockTakeoverResult> {
    const normalizedPath = normalizePath(input.path);
    if (configService.isUserSurfaceHiddenPath(normalizedPath)) {
      throw new BadRequestException('DMS 사용자 문서 표면에서 제외된 경로입니다.');
    }

    const actor = await this.resolveActorProfile(input.currentUser);
    const sessionId = this.resolveSessionId(input.currentUser, input.sessionId);
    const now = new Date().toISOString();
    this.cleanupInactiveMembers(normalizedPath);
    this.cleanupInactiveLock(normalizedPath);
    this.cleanupStaleTakeoverRequests(normalizedPath);

    const existing = this.softLockByPath.get(normalizedPath);
    if (!existing || !this.isSoftLockActive(existing) || this.isSoftLockOwnedBy(existing, input.currentUser, sessionId)) {
      this.softLockByPath.set(normalizedPath, {
        path: normalizedPath,
        userId: input.currentUser.userId,
        loginId: input.currentUser.loginId,
        displayName: actor.displayName,
        email: actor.email,
        sessionId,
        acquiredAt: existing?.acquiredAt ?? now,
        lastSeenAt: now,
      });
      this.upsertPresenceMember(normalizedPath, {
        userId: input.currentUser.userId,
        loginId: input.currentUser.loginId,
        displayName: actor.displayName,
        email: actor.email,
        sessionId,
      }, 'edit', now);
      this.persistState();
      const snapshot = this.getSnapshot(normalizedPath);
      this.emitCollaborationChanged(normalizedPath, snapshot, 'takeover');
      return { status: 'granted', snapshot };
    }

    const existingRequest = this.findActiveTakeoverRequest(
      normalizedPath,
      input.currentUser.userId,
      existing.userId,
    );
    if (existingRequest) {
      return {
        status: 'requested',
        request: existingRequest,
        snapshot: this.getSnapshot(normalizedPath),
      };
    }

    const request: SoftLockTakeoverRequest = {
      requestId: this.createTakeoverRequestId(),
      path: normalizedPath,
      requester: {
        userId: input.currentUser.userId,
        loginId: input.currentUser.loginId,
        displayName: actor.displayName,
        email: actor.email,
        sessionId,
      },
      owner: {
        userId: existing.userId,
        loginId: existing.loginId,
        displayName: existing.displayName,
        email: existing.email,
        sessionId: existing.sessionId,
      },
      requestedAt: now,
      expiresAt: new Date(Date.now() + TAKEOVER_REQUEST_TTL_MS).toISOString(),
    };
    this.softLockTakeoverRequestsById.set(request.requestId, request);
    await this.notifyTakeoverRequested(request, input.currentUser);
    this.eventsGateway?.emitLockTakeoverRequested(existing.userId, request);

    return {
      status: 'requested',
      request,
      snapshot: this.getSnapshot(normalizedPath),
    };
  }

  async respondToTakeover(input: {
    requestId: string;
    approved: boolean;
    currentUser: TokenPayload;
  }): Promise<SoftLockTakeoverResponse> {
    const request = this.softLockTakeoverRequestsById.get(input.requestId);
    if (!request) {
      throw new BadRequestException('처리할 편집 잠금 요청을 찾을 수 없습니다.');
    }
    if (request.owner.userId !== input.currentUser.userId) {
      throw new ForbiddenException('편집 잠금 요청은 현재 잠금 보유자만 처리할 수 있습니다.');
    }

    const now = new Date().toISOString();
    const expired = getTimestampMs(request.expiresAt) <= Date.now();
    if (expired) {
      this.softLockTakeoverRequestsById.delete(request.requestId);
      const currentLock = this.softLockByPath.get(request.path);
      if (!currentLock || (
        currentLock.userId === request.owner.userId
        && currentLock.sessionId === request.owner.sessionId
      )) {
        this.touchOwnerSoftLock(request.path, request.owner, now);
      }
      const snapshot = this.getSnapshot(request.path);
      const response: SoftLockTakeoverResponse = {
        requestId: request.requestId,
        path: request.path,
        status: 'expired',
        snapshot,
        message: '편집 잠금 요청이 만료되었습니다.',
      };
      this.emitCollaborationChanged(request.path, snapshot, 'lock');
      this.eventsGateway?.emitLockTakeoverResponded(request.requester.userId, response);
      await this.notificationService.archiveByDedupeKey(BigInt(request.owner.userId), 'dms', this.getTakeoverOwnerDedupeKey(request.requestId));
      await this.notifyTakeoverResponded(request, response);
      return response;
    }

    this.softLockTakeoverRequestsById.delete(request.requestId);

    if (input.approved) {
      this.softLockByPath.set(request.path, {
        path: request.path,
        userId: request.requester.userId,
        loginId: request.requester.loginId,
        displayName: request.requester.displayName,
        email: request.requester.email,
        sessionId: request.requester.sessionId,
        acquiredAt: now,
        lastSeenAt: now,
      });
      this.upsertPresenceMember(request.path, request.requester, 'edit', now);
      this.upsertPresenceMember(request.path, request.owner, 'view', now);
      this.persistState();

      const snapshot = this.getSnapshot(request.path);
      const response: SoftLockTakeoverResponse = {
        requestId: request.requestId,
        path: request.path,
        status: 'approved',
        snapshot,
        message: '편집 잠금 요청이 승인되었습니다.',
      };
      this.emitCollaborationChanged(request.path, snapshot, 'takeover');
      this.eventsGateway?.emitLockTakeoverResponded(request.requester.userId, response);
      await this.notificationService.archiveByDedupeKey(BigInt(request.owner.userId), 'dms', this.getTakeoverOwnerDedupeKey(request.requestId));
      await this.notifyTakeoverResponded(request, response);
      return response;
    }

    this.touchOwnerSoftLock(request.path, request.owner, now);
    const snapshot = this.getSnapshot(request.path);
    const response: SoftLockTakeoverResponse = {
      requestId: request.requestId,
      path: request.path,
      status: 'rejected',
      snapshot,
      message: '편집 잠금 보유자가 편집을 계속합니다.',
    };
    this.emitCollaborationChanged(request.path, snapshot, 'lock');
    this.eventsGateway?.emitLockTakeoverResponded(request.requester.userId, response);
    await this.notificationService.archiveByDedupeKey(BigInt(request.owner.userId), 'dms', this.getTakeoverOwnerDedupeKey(request.requestId));
    await this.notifyTakeoverResponded(request, response);
    return response;
  }

  getTakeoverPendingState(input: { path: string; currentUser: TokenPayload }): SoftLockTakeoverPendingState {
    const normalizedPath = normalizePath(input.path);
    this.cleanupInactiveMembers(normalizedPath);
    this.cleanupInactiveLock(normalizedPath);
    this.cleanupStaleTakeoverRequests(normalizedPath);

    const activeRequests = Array.from(this.softLockTakeoverRequestsById.values())
      .filter((request) => request.path === normalizedPath && this.isTakeoverRequestProcessable(request))
      .sort((a, b) => getTimestampMs(b.requestedAt) - getTimestampMs(a.requestedAt));

    return {
      requesterRequest: activeRequests.find((request) => request.requester.userId === input.currentUser.userId) ?? null,
      ownerRequest: activeRequests.find((request) => request.owner.userId === input.currentUser.userId) ?? null,
    };
  }

  leave(input: { path: string; currentUser: TokenPayload; sessionId?: string }): DocumentCollaborationSnapshot {
    const normalizedPath = normalizePath(input.path);
    const sessionId = this.resolveSessionId(input.currentUser, input.sessionId);
    const key = buildPresenceKey(input.currentUser.userId, sessionId);
    const members = this.presenceByPath.get(normalizedPath);
    members?.delete(key);
    if (members?.size === 0) this.presenceByPath.delete(normalizedPath);

    const lock = this.softLockByPath.get(normalizedPath);
    if (lock && lock.userId === input.currentUser.userId && lock.sessionId === sessionId) {
      this.softLockByPath.delete(normalizedPath);
      this.persistState();
    }

    const snapshot = this.getSnapshot(normalizedPath);
    this.emitCollaborationChanged(normalizedPath, snapshot, 'leave');
    return snapshot;
  }

  getSnapshot(pathValue: string): DocumentCollaborationSnapshot {
    const normalizedPath = normalizePath(pathValue);
    this.cleanupInactiveMembers(normalizedPath);
    this.cleanupInactiveLock(normalizedPath);
    const publishIsolation = this.findPublishIsolation(normalizedPath);
    const members = Array.from(this.presenceByPath.get(normalizedPath)?.values() ?? []).sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'));
    return {
      path: normalizedPath,
      members,
      publishState: this.getPublishState(normalizePath(publishIsolation?.primaryPath ?? normalizedPath)),
      softLock: this.softLockByPath.get(normalizedPath) ?? null,
      isolation: this.getPathIsolation(normalizedPath),
    };
  }

  async refreshPublishState(pathValue: string): Promise<DocumentCollaborationSnapshot> {
    const normalizedPath = normalizePath(pathValue);
    const currentIsolation = this.findPublishIsolation(normalizedPath);
    const primaryPath = this.resolvePublishPrimaryPath(normalizedPath, currentIsolation);
    if (!primaryPath) {
      return this.getSnapshot(normalizedPath);
    }
    const currentState = this.getPublishState(primaryPath);
    const trackedPaths = resolveTrackedPaths(primaryPath, currentState, currentIsolation);
    const pathParity = await this.inspectPathParity(trackedPaths);
    const shouldRelease = shouldAutoReleasePublishIsolation(currentState, currentIsolation, pathParity);
    const nextState: DocumentPublishState = {
      ...currentState,
      path: primaryPath,
      status: shouldRelease
        ? 'clean'
        : resolveRefreshStatus(currentState, currentIsolation, pathParity),
      syncStatus: pathParity.success
        ? pathParity.data.syncStatus ?? currentState.syncStatus
        : currentState.syncStatus,
      lastError: shouldRelease
        ? undefined
        : resolveRefreshError(currentState, pathParity),
    };
    this.publishStateByPath.set(primaryPath, nextState);
    if (shouldRelease) {
      this.releasePublishIsolation(primaryPath, { persist: false });
      this.persistState();
      return this.getSnapshot(normalizedPath);
    }
    if ((nextState.status === 'sync-blocked' || nextState.status === 'push-failed') && (currentState.status !== 'clean' || Boolean(currentIsolation))) {
      this.captureIsolationFromPublishState(primaryPath, nextState, { persist: false });
    }
    this.persistState();
    return this.getSnapshot(normalizedPath);
  }

  async retryPublish(pathValue: string, currentUser: TokenPayload): Promise<DocumentCollaborationSnapshot> {
    const normalizedPath = normalizePath(pathValue);
    const currentIsolation = this.findPublishIsolation(normalizedPath);
    const primaryPath = this.resolvePublishPrimaryPath(normalizedPath, currentIsolation);
    if (!primaryPath) {
      return this.getSnapshot(normalizedPath);
    }
    if (this.isPublishIgnoredPath(primaryPath)) {
      this.publishStateByPath.delete(primaryPath);
      this.releasePublishIsolation(primaryPath, { persist: false });
      this.persistState();
      await this.archivePublishFailure(primaryPath, currentUser);
      return this.getSnapshot(normalizedPath);
    }
    const blockingIsolation = this.findPathIsolation(normalizedPath);
    if (blockingIsolation && blockingIsolation.source !== 'publish') {
      this.assertMutationAllowed({ action: 'publish', paths: [normalizedPath] });
    }
    const currentState = this.getPublishState(primaryPath);
    const parity = await this.inspectPublishParity();
    const parityBlocked = parity.success
      && parity.data.verified
      && !parity.data.canTreatLocalAsCanonical;
    const parityUnavailable = !parity.success
      || (parity.success && !parity.data.verified && !parity.data.canTreatLocalAsCanonical);
    const queuedAt = new Date().toISOString();
    const nextState: DocumentPublishState = {
      ...currentState,
      path: primaryPath,
      status: parityBlocked
        ? 'sync-blocked'
        : (parityUnavailable ? 'push-failed' : 'dirty-uncommitted'),
      retryCount: (currentState.retryCount ?? 0) + 1,
      syncStatus: parity.success
        ? parity.data.syncStatus ?? currentState.syncStatus
        : currentState.syncStatus,
      lastQueuedAt: parityBlocked || parityUnavailable ? currentState.lastQueuedAt : queuedAt,
      lastError: parity.success
        ? (parity.data.canTreatLocalAsCanonical ? undefined : parity.data.reason)
        : parity.error,
    };
    this.publishStateByPath.set(primaryPath, nextState);
    this.persistState();

    if (parityBlocked || parityUnavailable) {
      const isolation = this.captureIsolationFromPublishState(primaryPath, nextState);
      await this.notifyPublishFailure(nextState, currentUser);
      throw buildIsolationException('publish', normalizedPath, isolation ?? {
        path: primaryPath,
        primaryPath,
        status: 'reconcile-needed',
        source: 'publish',
        reasonCode: 'push-failed',
        reason: nextState.lastError ?? '문서 publish 가 실패해 reconcile 전까지 추가 변경이 차단됩니다.',
        isolatedAt: nextState.lastQueuedAt ?? queuedAt,
        blockedActions: [...BLOCKED_MUTATION_ACTIONS],
        affectedPaths: nextState.affectedPaths ?? [primaryPath],
        releaseStrategy: 'mixed',
      });
    }

    if (!parityBlocked && !parityUnavailable) {
      const existing = this.publishJobsByPath.get(primaryPath);
      const retryPaths = Array.from(new Set((currentState.affectedPaths ?? [primaryPath]).map((item) => normalizePath(item)))).filter(Boolean);
      const job: PublishJob = existing ?? {
        primaryPath,
        affectedPaths: new Set<string>(),
        operationType: currentState.operationType ?? 'update',
        actor: currentUser,
        queuedAt,
        timer: null,
        processing: false,
      };
      job.operationType = currentState.operationType ?? job.operationType;
      job.actor = currentUser;
      job.queuedAt = queuedAt;
      retryPaths.forEach((item) => job.affectedPaths.add(item));
      if (job.affectedPaths.size === 0) {
        job.affectedPaths.add(primaryPath);
      }
      if (job.timer) clearTimeout(job.timer);
      job.timer = setTimeout(() => void this.publishJob(primaryPath), 10);
      this.publishJobsByPath.set(primaryPath, job);
    }

    return this.getSnapshot(normalizedPath);
  }

  async listPublishFailures(): Promise<DocumentPublishState[]> {
    const failureStates = Array.from(this.publishStateByPath.values())
      .filter((state) => state.status === 'push-failed' || state.status === 'sync-blocked');

    for (const state of failureStates) {
      if (this.isPublishIgnoredPath(state.path)) {
        this.publishStateByPath.delete(state.path);
        this.releasePublishIsolation(state.path, { persist: false });
        this.persistState();
        continue;
      }

      const currentState = this.getPublishState(state.path);
      const currentIsolation = this.findPublishIsolation(state.path);
      const trackedPaths = resolveTrackedPaths(state.path, currentState, currentIsolation);
      const pathParity = await this.inspectPathParity(trackedPaths);
      if (pathParity.success && shouldAutoReleasePublishIsolation(currentState, currentIsolation, pathParity)) {
        this.publishStateByPath.set(state.path, {
          ...currentState,
          status: 'clean',
          syncStatus: pathParity.data.syncStatus ?? currentState.syncStatus,
          lastError: undefined,
        });
        this.releasePublishIsolation(state.path, { persist: false });
        this.persistState();
      }
    }

    return Array.from(this.publishStateByPath.values())
      .filter((state) => state.status === 'push-failed' || state.status === 'sync-blocked')
      .sort((left, right) => (right.lastQueuedAt ?? '').localeCompare(left.lastQueuedAt ?? ''));
  }

  async forceLockPath(pathValue: string, currentUser: TokenPayload, reason?: string): Promise<DocumentCollaborationSnapshot> {
    const normalizedPath = normalizePath(pathValue);
    if (!isGitManagedDocumentPath(normalizedPath)) {
      logger.warn('비-markdown 경로 force-lock 요청 무시', { path: normalizedPath, actorLoginId: currentUser.loginId });
      return this.getSnapshot(normalizedPath);
    }
    const actor = await this.resolveActorProfile(currentUser);
    this.pathOverrideByPath.set(normalizedPath, {
      path: normalizedPath,
      mode: 'force-lock',
      reason: reason?.trim() || undefined,
      appliedAt: new Date().toISOString(),
      actorUserId: currentUser.userId,
      actorLoginId: currentUser.loginId,
      actorDisplayName: actor.displayName,
    });
    this.persistState();
    logger.info('문서 경로 강제 잠금 적용', { path: normalizedPath, actorLoginId: currentUser.loginId });
    return this.getSnapshot(normalizedPath);
  }

  async forceUnlockPath(pathValue: string, currentUser: TokenPayload): Promise<DocumentCollaborationSnapshot> {
    const normalizedPath = normalizePath(pathValue);
    if (!isGitManagedDocumentPath(normalizedPath)) {
      logger.warn('비-markdown 경로 force-unlock 요청 무시', { path: normalizedPath, actorLoginId: currentUser.loginId });
      return this.getSnapshot(normalizedPath);
    }
    const actor = await this.resolveActorProfile(currentUser);
    const publishIsolation = this.findPublishIsolation(normalizedPath);
    this.pathOverrideByPath.delete(normalizedPath);
    if (publishIsolation) {
      this.pathOverrideByPath.set(normalizedPath, {
        path: normalizedPath,
        mode: 'force-unlock',
        appliedAt: new Date().toISOString(),
        actorUserId: currentUser.userId,
        actorLoginId: currentUser.loginId,
        actorDisplayName: actor.displayName,
      });
    }
    this.persistState();
    logger.info('문서 경로 강제 잠금 해제', {
      path: normalizedPath,
      actorLoginId: currentUser.loginId,
      underlyingIsolation: Boolean(publishIsolation),
    });
    return this.getSnapshot(normalizedPath);
  }

  getPathIsolation(pathValue: string): DocumentIsolationState | null {
    const normalizedPath = normalizePath(pathValue);
    if (!normalizedPath) {
      return null;
    }

    return this.findPathIsolation(normalizedPath);
  }

  assertMutationAllowed(input: { action: DocumentMutationAction; paths: string[] }): void {
    const normalizedPaths = Array.from(new Set(
      input.paths
        .map((item) => normalizePath(item))
        .filter(Boolean),
    ));

    for (const requestedPath of normalizedPaths) {
      const isolation = this.findPathIsolation(requestedPath);
      if (!isolation || !isolation.blockedActions.includes(input.action)) {
        continue;
      }

      throw buildIsolationException(input.action, requestedPath, isolation);
    }
  }

  assertCurrentSoftLockOwner(input: {
    action: DocumentMutationAction;
    path: string;
    currentUser: TokenPayload;
    sessionId?: string;
  }): void {
    const normalizedPath = normalizePath(input.path);
    if (!isGitManagedDocumentPath(normalizedPath)) {
      return;
    }

    const isolation = this.findPathIsolation(normalizedPath);
    if (isolation?.blockedActions.includes(input.action)) {
      throw buildIsolationException(input.action, normalizedPath, isolation);
    }

    this.cleanupInactiveMembers(normalizedPath);
    this.cleanupInactiveLock(normalizedPath);
    const lock = this.softLockByPath.get(normalizedPath);
    if (!lock || !this.isSoftLockActive(lock)) {
      return;
    }

    const sessionId = this.resolveSessionId(input.currentUser, input.sessionId);
    if (!this.isSoftLockOwnedBy(lock, input.currentUser, sessionId)) {
      throw new ConflictException(`${lock.displayName || lock.loginId} 사용자가 편집 중입니다. 현재 편집 잠금 세션만 저장할 수 있습니다.`);
    }
  }

  noteMutation(input: {
    primaryPath: string;
    affectedPaths?: string[];
    gitManagedPaths?: string[];
    operationType: string;
    currentUser: TokenPayload;
    publishDelayMs?: number;
  }): void {
    const affectedPaths = filterGitManagedDocumentPaths(
      input.gitManagedPaths ?? [input.primaryPath, ...(input.affectedPaths ?? [])],
    );
    if (affectedPaths.length === 0) {
      return;
    }

    const publishablePaths = this.filterPublishableDocumentPaths(affectedPaths);
    const normalizedPrimaryPath = normalizePath(input.primaryPath);
    const primaryPath = publishablePaths.includes(normalizedPrimaryPath)
      ? normalizedPrimaryPath
      : publishablePaths[0] ?? null;
    if (primaryPath && publishablePaths.length > 0) {
      const now = new Date().toISOString();
      const currentState = this.getPublishState(primaryPath);
      const nextState: DocumentPublishState = {
        ...currentState,
        path: primaryPath,
        status: 'dirty-uncommitted',
        operationType: input.operationType,
        affectedPaths: publishablePaths,
        lastActorLoginId: input.currentUser.loginId,
        lastQueuedAt: now,
        lastError: undefined,
      };
      this.publishStateByPath.set(primaryPath, nextState);
      this.persistState();

      const existingJob = this.publishJobsByPath.get(primaryPath);
      const job: PublishJob = existingJob ?? {
        primaryPath,
        affectedPaths: new Set<string>(),
        operationType: input.operationType,
        actor: input.currentUser,
        queuedAt: now,
        timer: null,
        processing: false,
      };
      job.operationType = input.operationType;
      job.actor = input.currentUser;
      job.queuedAt = now;
      publishablePaths.forEach((item) => job.affectedPaths.add(item));
      if (job.timer) clearTimeout(job.timer);
      const publishDelayMs = Math.max(0, input.publishDelayMs ?? 4000);
      job.timer = setTimeout(() => void this.publishJob(primaryPath), publishDelayMs);
      this.publishJobsByPath.set(primaryPath, job);
    }

    // WebSocket: 파일 변경 이벤트 전파
    this.eventsGateway?.emitFileChanged({
      action: input.operationType as 'create' | 'update' | 'rename' | 'delete' | 'metadata',
      paths: affectedPaths,
      userId: input.currentUser.userId,
      userName: input.currentUser.userName,
    });
  }

  private async publishJob(primaryPath: string): Promise<void> {
    const job = this.publishJobsByPath.get(primaryPath);
    if (!job || job.processing) return;

    job.processing = true;
    if (job.timer) {
      clearTimeout(job.timer);
      job.timer = null;
    }

    const actor = await this.resolveActorProfile(job.actor);
    try {
      const parity = await this.inspectPublishParity();
      if (!parity.success || !parity.data.canTreatLocalAsCanonical) {
        const blockedByParity = parity.success
          && parity.data.verified
          && !parity.data.canTreatLocalAsCanonical;
        this.publishStateByPath.set(primaryPath, {
          ...this.getPublishState(primaryPath),
          path: primaryPath,
          operationType: job.operationType,
          affectedPaths: Array.from(job.affectedPaths),
          status: blockedByParity ? 'sync-blocked' : 'push-failed',
          syncStatus: parity.success
            ? parity.data.syncStatus ?? this.getPublishState(primaryPath).syncStatus
            : this.getPublishState(primaryPath).syncStatus,
          lastActorLoginId: job.actor.loginId,
          lastActorDisplayName: actor.displayName,
          lastQueuedAt: job.queuedAt,
          lastError: parity.success ? parity.data.reason : parity.error,
        });
        this.captureIsolationFromPublishState(primaryPath, this.getPublishState(primaryPath));
        this.persistState();
        this.eventsGateway?.emitPublishStatus({
          path: primaryPath,
          status: blockedByParity ? 'sync-blocked' : 'push-failed',
          error: parity.success ? parity.data.reason : parity.error,
        });
        this.emitCollaborationChanged(primaryPath, this.getSnapshot(primaryPath), 'publish');
        await this.notifyPublishFailure(this.getPublishState(primaryPath), job.actor);
        return;
      }

      this.publishStateByPath.set(primaryPath, {
        ...this.getPublishState(primaryPath),
        path: primaryPath,
        operationType: job.operationType,
        affectedPaths: Array.from(job.affectedPaths),
        status: 'publishing',
        lastActorLoginId: job.actor.loginId,
        lastActorDisplayName: actor.displayName,
        lastQueuedAt: job.queuedAt,
        syncStatus: parity.data.syncStatus ?? this.getPublishState(primaryPath).syncStatus,
        lastError: undefined,
      });
      this.persistState();
      this.emitCollaborationChanged(primaryPath, this.getSnapshot(primaryPath), 'publish');

      const commitAuthor: GitCommitAuthor = {
        name: actor.displayName,
        email: actor.email,
        loginId: job.actor.loginId,
        userId: job.actor.userId,
      };
      const commitMessage = this.buildCommitMessage(job.operationType, primaryPath, Array.from(job.affectedPaths));
      const footerLines = [
        `DMS-Actor-LoginId: ${job.actor.loginId}`,
        `DMS-Actor-UserId: ${job.actor.userId}`,
        ...(job.actor.sessionId ? [`DMS-Session-Id: ${job.actor.sessionId}`] : []),
      ];
      const commitResult = await gitService.commitFiles(Array.from(job.affectedPaths), commitMessage, commitAuthor, footerLines);
      if (!commitResult.success) {
        const message = commitResult.error || 'Git commit failed';
        if (!message.includes('nothing to commit')) throw new Error(message);
      }

      this.publishStateByPath.set(primaryPath, {
        ...this.getPublishState(primaryPath),
        path: primaryPath,
        status: 'committed-unpushed',
        lastActorLoginId: job.actor.loginId,
        lastActorDisplayName: actor.displayName,
        lastCommitHash: commitResult.success ? commitResult.data.hash : this.getPublishState(primaryPath).lastCommitHash,
      });
      this.persistState();
      this.emitCollaborationChanged(primaryPath, this.getSnapshot(primaryPath), 'publish');

      const pushResult = await gitService.publishCurrentBranch('origin');
      if (!pushResult.success) {
        const syncStatus = await this.fetchSyncStatus();
        const status: PublishStatus = pushResult.error.includes('SYNC_BLOCKED') ? 'sync-blocked' : 'push-failed';
        this.publishStateByPath.set(primaryPath, {
          ...this.getPublishState(primaryPath),
          path: primaryPath,
          status,
          syncStatus: syncStatus.success ? syncStatus.data : undefined,
          lastError: pushResult.error,
          lastActorLoginId: job.actor.loginId,
          lastActorDisplayName: actor.displayName,
        });
        this.captureIsolationFromPublishState(primaryPath, this.getPublishState(primaryPath));
        this.persistState();
        this.eventsGateway?.emitPublishStatus({
          path: primaryPath,
          status,
          error: pushResult.error,
        });
        this.emitCollaborationChanged(primaryPath, this.getSnapshot(primaryPath), 'publish');
        await this.notifyPublishFailure(this.getPublishState(primaryPath), job.actor);
        return;
      }

      const syncStatus = await this.fetchSyncStatus();
      this.publishStateByPath.set(primaryPath, {
        ...this.getPublishState(primaryPath),
        path: primaryPath,
        status: 'clean',
        syncStatus: syncStatus.success ? syncStatus.data : undefined,
        lastActorLoginId: job.actor.loginId,
        lastActorDisplayName: actor.displayName,
        lastPublishedAt: new Date().toISOString(),
        lastError: undefined,
      });
      this.releasePublishIsolation(primaryPath, { persist: false });
      this.persistState();
      await this.archivePublishFailure(primaryPath, job.actor);

      // WebSocket: publish 완료 이벤트
      this.eventsGateway?.emitPublishStatus({
        path: primaryPath,
        status: 'clean',
        commitHash: commitResult.success ? commitResult.data.hash : undefined,
      });
      this.emitCollaborationChanged(primaryPath, this.getSnapshot(primaryPath), 'publish');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('자동 publish 실패', error instanceof Error ? error : new Error(message), { primaryPath });
      this.publishStateByPath.set(primaryPath, {
        ...this.getPublishState(primaryPath),
        path: primaryPath,
        status: 'push-failed',
        lastError: message,
        lastActorLoginId: job.actor.loginId,
      });
      this.captureIsolationFromPublishState(primaryPath, this.getPublishState(primaryPath));
      this.persistState();
      this.eventsGateway?.emitPublishStatus({
        path: primaryPath,
        status: 'push-failed',
        error: message,
      });
      this.emitCollaborationChanged(primaryPath, this.getSnapshot(primaryPath), 'publish');
      await this.notifyPublishFailure(this.getPublishState(primaryPath), job.actor);
    } finally {
      job.processing = false;
      if (this.publishJobsByPath.get(primaryPath) === job) this.publishJobsByPath.delete(primaryPath);
    }
  }

  private async fetchSyncStatus() {
    return gitService.inspectSyncStatus('origin');
  }

  private async notifyPublishFailure(state: DocumentPublishState, actor: TokenPayload): Promise<void> {
    if (state.status !== 'push-failed' && state.status !== 'sync-blocked') {
      return;
    }

    try {
      const title = state.status === 'sync-blocked' ? 'DMS 동기화 차단' : 'DMS publish 실패';
      const actionLabel = state.status === 'sync-blocked' ? '상태 확인' : '수동 publish';
      await this.notificationService.notifyUser({
        recipientUserId: BigInt(actor.userId),
        actorUserId: BigInt(actor.userId),
        sourceApp: 'dms',
        notificationType: 'dms.publish.failed',
        severity: state.status === 'sync-blocked' ? 'warning' : 'error',
        title,
        message: state.lastError
          ? `${state.path}: ${state.lastError}`
          : `${state.path} 문서 publish 복구가 필요합니다.`,
        reference: {
          type: 'dms.document',
          path: state.path,
        },
        action: {
          type: 'retry-dms-publish',
          label: actionLabel,
          payload: {
            path: state.path,
            status: state.status,
          },
        },
        dedupeKey: this.getPublishFailureDedupeKey(actor.userId, state.path),
      });
    } catch (error) {
      logger.warn('publish 실패 알림 생성 실패', {
        path: state.path,
        actorUserId: actor.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async notifyTakeoverRequested(request: SoftLockTakeoverRequest, actor: TokenPayload): Promise<void> {
    if (configService.isUserSurfaceHiddenPath(request.path)) {
      return;
    }

    try {
      await this.notificationService.notifyUser({
        recipientUserId: BigInt(request.owner.userId),
        actorUserId: BigInt(actor.userId),
        sourceApp: 'dms',
        notificationType: 'dms.document-soft-lock.takeover-requested',
        severity: 'warning',
        title: '편집 잠금 해제 요청',
        message: `${request.requester.displayName} 님이 문서 편집 잠금 해제를 요청했습니다.`,
        reference: {
          type: 'dms.document',
          path: request.path,
        },
        action: {
          type: 'open-dms-document',
          label: '요청 처리',
          payload: {
            path: request.path,
            requestId: request.requestId,
            requesterUserId: request.requester.userId,
            requesterName: request.requester.displayName,
          },
        },
        dedupeKey: this.getTakeoverOwnerDedupeKey(request.requestId),
      });
    } catch (error) {
      logger.warn('편집 잠금 요청 알림 생성 실패', {
        path: request.path,
        requestId: request.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async notifyTakeoverResponded(
    request: SoftLockTakeoverRequest,
    response: SoftLockTakeoverResponse,
  ): Promise<void> {
    if (configService.isUserSurfaceHiddenPath(request.path)) {
      return;
    }

    const approved = response.status === 'approved';
    try {
      await this.notificationService.notifyUser({
        recipientUserId: BigInt(request.requester.userId),
        actorUserId: BigInt(request.owner.userId),
        sourceApp: 'dms',
        notificationType: `dms.document-soft-lock.takeover-${response.status}`,
        severity: approved ? 'success' : 'warning',
        title: approved ? '편집 잠금 요청 승인' : '편집 잠금 요청 미승인',
        message: response.message ?? (approved ? '편집 잠금이 이동되었습니다.' : '현재 편집자가 편집을 계속합니다.'),
        reference: {
          type: 'dms.document',
          path: request.path,
        },
        action: {
          type: 'open-dms-document',
          label: '문서 열기',
          payload: {
            path: request.path,
            requestId: request.requestId,
            status: response.status,
          },
        },
        dedupeKey: `dms:soft-lock:takeover:${request.requestId}:requester:${response.status}`,
      });
    } catch (error) {
      logger.warn('편집 잠금 응답 알림 생성 실패', {
        path: request.path,
        requestId: request.requestId,
        status: response.status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async inspectPublishParity(): Promise<{ success: true; data: GitRemoteParityStatus } | { success: false; error: string }> {
    return gitService.inspectRemoteParity('origin');
  }

  private assertCanEnterEditMode(pathValue: string, currentUser: TokenPayload, sessionId: string): void {
    const isolation = this.findPathIsolation(pathValue);
    if (isolation?.blockedActions.includes('write')) {
      throw buildIsolationException('write', pathValue, isolation);
    }

    const existing = this.softLockByPath.get(pathValue);
    if (existing && this.isSoftLockActive(existing) && !this.isSoftLockOwnedBy(existing, currentUser, sessionId)) {
      throw new ConflictException(`${existing.displayName || existing.loginId} 사용자가 편집 중입니다. 잠금 가져오기 요청을 먼저 보내야 합니다.`);
    }
  }

  private touchOrAcquireSoftLock(pathValue: string, currentUser: TokenPayload, actor: ActorProfile, sessionId: string, now: string): void {
    const existing = this.softLockByPath.get(pathValue);
    if (!existing || !this.isSoftLockActive(existing) || this.isSoftLockOwnedBy(existing, currentUser, sessionId)) {
      this.softLockByPath.set(pathValue, {
        path: pathValue,
        userId: currentUser.userId,
        loginId: currentUser.loginId,
        displayName: actor.displayName,
        email: actor.email,
        sessionId,
        acquiredAt: existing?.acquiredAt ?? now,
        lastSeenAt: now,
      });
      this.persistState();
    }
  }

  private resolveSessionId(currentUser: TokenPayload, sessionId?: string): string {
    return sessionId?.trim() || currentUser.sessionId || 'default';
  }

  private isSoftLockOwnedBy(lock: DocumentSoftLock, currentUser: TokenPayload, sessionId: string): boolean {
    return lock.userId === currentUser.userId && lock.sessionId === sessionId;
  }

  private touchOwnerSoftLock(pathValue: string, owner: SoftLockTakeoverActor, now: string): void {
    this.softLockByPath.set(pathValue, {
      path: pathValue,
      userId: owner.userId,
      loginId: owner.loginId,
      displayName: owner.displayName,
      email: owner.email,
      sessionId: owner.sessionId,
      acquiredAt: this.softLockByPath.get(pathValue)?.acquiredAt ?? now,
      lastSeenAt: now,
    });
    this.upsertPresenceMember(pathValue, owner, 'edit', now);
    this.persistState();
  }

  private releaseOwnSoftLock(pathValue: string, currentUser: TokenPayload, sessionId: string): void {
    const existing = this.softLockByPath.get(pathValue);
    if (existing && existing.userId === currentUser.userId && existing.sessionId === sessionId) {
      this.softLockByPath.delete(pathValue);
      this.persistState();
    }
  }

  private upsertPresenceMember(pathValue: string, actor: SoftLockTakeoverActor, mode: CollaborationMode, now: string): void {
    const members = this.getOrCreatePresence(pathValue);
    const key = buildPresenceKey(actor.userId, actor.sessionId);
    const existing = members.get(key);
    members.set(key, {
      userId: actor.userId,
      loginId: actor.loginId,
      displayName: actor.displayName,
      email: actor.email,
      sessionId: actor.sessionId,
      mode,
      joinedAt: existing?.joinedAt ?? now,
      lastSeenAt: now,
    });
  }

  private createTakeoverRequestId(): string {
    return `takeover_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private findActiveTakeoverRequest(
    pathValue: string,
    requesterUserId: string,
    ownerUserId: string,
  ): SoftLockTakeoverRequest | null {
    const requests = Array.from(this.softLockTakeoverRequestsById.values())
      .filter((request) => (
        request.path === pathValue
        && request.requester.userId === requesterUserId
        && request.owner.userId === ownerUserId
        && this.isTakeoverRequestProcessable(request)
      ))
      .sort((a, b) => getTimestampMs(b.requestedAt) - getTimestampMs(a.requestedAt));
    return requests[0] ?? null;
  }

  private cleanupStaleTakeoverRequests(pathValue?: string): void {
    for (const [requestId, request] of this.softLockTakeoverRequestsById.entries()) {
      if (pathValue && request.path !== pathValue) {
        continue;
      }
      if (!this.isTakeoverRequestRetainable(request)) {
        this.softLockTakeoverRequestsById.delete(requestId);
      }
    }
  }

  private isTakeoverRequestProcessable(request: SoftLockTakeoverRequest): boolean {
    if (getTimestampMs(request.expiresAt) <= Date.now()) {
      return false;
    }

    const lock = this.softLockByPath.get(request.path);
    return Boolean(
      lock
      && lock.userId === request.owner.userId
      && lock.sessionId === request.owner.sessionId,
    );
  }

  private isTakeoverRequestRetainable(request: SoftLockTakeoverRequest): boolean {
    const expiresAt = getTimestampMs(request.expiresAt);
    if (expiresAt + TAKEOVER_REQUEST_EXPIRED_RETENTION_MS <= Date.now()) {
      return false;
    }

    const lock = this.softLockByPath.get(request.path);
    return Boolean(
      !lock
      || (
        lock.userId === request.owner.userId
        && lock.sessionId === request.owner.sessionId
      ),
    );
  }

  private getTakeoverOwnerDedupeKey(requestId: string): string {
    return `dms:soft-lock:takeover:${requestId}:owner`;
  }

  private getPublishFailureDedupeKey(actorUserId: string, pathValue: string): string {
    return [
      'dms',
      'publish',
      'failed',
      actorUserId,
      pathValue,
    ].join(':');
  }

  private async archivePublishFailure(pathValue: string, actor: TokenPayload): Promise<void> {
    try {
      await this.notificationService.archiveByDedupeKey(
        BigInt(actor.userId),
        'dms',
        this.getPublishFailureDedupeKey(actor.userId, pathValue),
      );
    } catch (error) {
      logger.warn('publish 실패 알림 archive 실패', {
        path: pathValue,
        actorUserId: actor.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async archiveUserSurfaceHiddenNotifications(): Promise<number> {
    const hiddenPrefixes = configService.getUserSurfaceHiddenPathPrefixes();
    if (hiddenPrefixes.length === 0) {
      return 0;
    }

    try {
      const result = await this.notificationService.archiveByReferencePathPrefixes('dms', hiddenPrefixes);
      return result.count;
    } catch (error) {
      logger.warn('사용자 표면 제외 경로 알림 archive 실패', {
        prefixes: hiddenPrefixes,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  private isSoftLockActive(lock: DocumentSoftLock): boolean {
    return !isExpired(lock.lastSeenAt);
  }

  private emitCollaborationChanged(
    pathValue: string,
    snapshot: DocumentCollaborationSnapshot,
    reason: 'join' | 'mode' | 'leave' | 'lock' | 'takeover' | 'publish' | 'refresh',
  ): void {
    this.eventsGateway?.emitCollaborationChanged({ path: pathValue, snapshot, reason });
  }

  private buildCommitMessage(operationType: string, pathValue: string, affectedPaths: string[]): string {
    const verb = operationType === 'rename' ? 'move' : operationType;
    return affectedPaths.length > 1
      ? `docs(dms): ${verb} ${pathValue} (+${affectedPaths.length - 1} related paths)`
      : `docs(dms): ${verb} ${pathValue}`;
  }

  private async resolveActorProfile(currentUser: TokenPayload): Promise<ActorProfile> {
    const cached = this.actorCache.get(currentUser.userId);
    if (cached) return cached;
    const profile = await this.userService.findProfileById(BigInt(currentUser.userId)).catch(() => null);
    const resolved: ActorProfile = {
      displayName: profile?.displayName?.trim() || profile?.userName?.trim() || currentUser.loginId,
      email: profile?.email?.trim() || `${currentUser.loginId}@dms.local`,
    };
    this.actorCache.set(currentUser.userId, resolved);
    return resolved;
  }

  private getOrCreatePresence(pathValue: string): Map<string, CollaborationMember> {
    const existing = this.presenceByPath.get(pathValue);
    if (existing) return existing;
    const created = new Map<string, CollaborationMember>();
    this.presenceByPath.set(pathValue, created);
    return created;
  }

  private getPublishState(pathValue: string): DocumentPublishState {
    return this.publishStateByPath.get(pathValue) ?? { path: pathValue, status: 'clean', retryCount: 0 };
  }

  private filterPublishableDocumentPaths(paths: string[]): string[] {
    const ignoredPrefixes = configService.getGitPublishIgnoredPathPrefixes();
    if (ignoredPrefixes.length === 0) {
      return paths;
    }

    return paths.filter((item) => !this.isPublishIgnoredPath(item, ignoredPrefixes));
  }

  private isPublishIgnoredPath(pathValue: string, ignoredPrefixes = configService.getGitPublishIgnoredPathPrefixes()): boolean {
    const normalizedPath = normalizePath(pathValue);
    return ignoredPrefixes.some((prefix) => normalizedPath.startsWith(prefix));
  }

  private cleanupInactiveMembers(pathValue: string): void {
    const members = this.presenceByPath.get(pathValue);
    if (!members) return;
    const now = Date.now();
    for (const [key, member] of members.entries()) {
      const isStale = now - new Date(member.lastSeenAt).getTime() > PRESENCE_TTL_MS;
      const isConnectedViewer = member.mode === 'view' && Boolean(this.eventsGateway?.isUserConnected(member.userId));
      if (isStale && !isConnectedViewer) {
        members.delete(key);
      }
    }
    if (members.size === 0) this.presenceByPath.delete(pathValue);
  }

  private cleanupInactiveLock(pathValue: string): void {
    const lock = this.softLockByPath.get(pathValue);
    if (!lock) return;
    if (!this.isSoftLockActive(lock)) {
      this.softLockByPath.delete(pathValue);
      this.persistState();
    }
  }

  private loadPersistedState(): void {
    const parsed = readPersistedStateFile(this.stateFilePath);
    if (!parsed) return;

    const dirty = [
      hydrateSanitizedMap(parsed.publishStates, sanitizePublishState, this.publishStateByPath),
      hydrateSanitizedMap(parsed.softLocks, sanitizeSoftLock, this.softLockByPath, {
        skip: (lock) => isExpired(lock.lastSeenAt),
      }),
      hydrateSanitizedMap(parsed.pathIsolations, sanitizeIsolationState, this.pathIsolationByPath),
      hydrateSanitizedMap(parsed.pathOverrides, sanitizePathOverride, this.pathOverrideByPath),
    ].some(Boolean);

    for (const [pathValue, state] of this.publishStateByPath.entries()) {
      this.captureIsolationFromPublishState(pathValue, state, { persist: false, onlyIfMissing: true });
    }
    if (dirty) {
      this.persistState();
    }
  }

  private persistState(): void {
    const payload: PersistedState = {
      publishStates: Object.fromEntries(this.publishStateByPath.entries()),
      softLocks: Object.fromEntries(this.softLockByPath.entries()),
      pathIsolations: Object.fromEntries(this.pathIsolationByPath.entries()),
      pathOverrides: Object.fromEntries(this.pathOverrideByPath.entries()),
    };
    writePersistedStateFile(this.stateFilePath, payload);
  }

  private resolvePublishPrimaryPath(pathValue: string, isolation: DocumentIsolationState | null): string | null {
    return resolveGitManagedPrimaryPath(
      isolation?.primaryPath ?? pathValue,
      filterGitManagedDocumentPaths([
        pathValue,
        isolation?.primaryPath,
        ...(isolation?.affectedPaths ?? []),
      ]),
    );
  }

  private hasSameSerializedValue(left: unknown, right: unknown): boolean {
    return hasSameSerializedValue(left, right);
  }

  private findPathIsolation(pathValue: string): DocumentIsolationState | null {
    const override = this.pathOverrideByPath.get(pathValue);
    if (override?.mode === 'force-lock') {
      return buildOperatorLockIsolation(override);
    }

    const publishIsolation = this.findPublishIsolation(pathValue);
    if (!publishIsolation) {
      return null;
    }

    if (override?.mode === 'force-unlock' && isForceUnlockActive(override, publishIsolation)) {
      return null;
    }

    return publishIsolation;
  }

  private findPublishIsolation(pathValue: string): DocumentIsolationState | null {
    const direct = this.pathIsolationByPath.get(pathValue);
    if (direct) {
      return direct;
    }

    let matched: DocumentIsolationState | null = null;
    for (const [isolatedPath, isolation] of this.pathIsolationByPath.entries()) {
      if (!pathsOverlap(pathValue, isolatedPath)) {
        continue;
      }

      if (!matched || isolatedPath.length > matched.path.length) {
        matched = isolation;
      }
    }

    return matched;
  }

  private pathsOverlap(left: string, right: string): boolean {
    return pathsOverlap(left, right);
  }

  private captureIsolationFromPublishState(
    primaryPath: string,
    publishState: DocumentPublishState,
    options?: { persist?: boolean; onlyIfMissing?: boolean },
  ): DocumentIsolationState | null {
    const normalizedPrimaryPath = normalizePath(primaryPath);
    if (!isGitManagedDocumentPath(normalizedPrimaryPath)) {
      return null;
    }
    const reasonCode = publishState.status === 'sync-blocked'
      ? 'sync-blocked'
      : publishState.status === 'push-failed'
        ? 'push-failed'
        : null;
    if (!reasonCode) {
      return null;
    }

    const affectedPaths = filterGitManagedDocumentPaths([
      normalizedPrimaryPath,
      ...(publishState.affectedPaths ?? []),
    ]);
    const isolation: DocumentIsolationState = {
      path: normalizedPrimaryPath,
      primaryPath: normalizedPrimaryPath,
      status: 'reconcile-needed',
      source: 'publish',
      reasonCode,
      reason: publishState.lastError
        ?? (reasonCode === 'sync-blocked'
          ? '문서 change set 이 sync-blocked 상태라 reconcile 전까지 추가 변경이 차단됩니다.'
          : '문서 publish 가 실패해 reconcile 전까지 추가 변경이 차단됩니다.'),
      isolatedAt: publishState.lastQueuedAt ?? new Date().toISOString(),
      blockedActions: [...BLOCKED_MUTATION_ACTIONS],
      affectedPaths,
      releaseStrategy: 'mixed',
    };

    for (const affectedPath of affectedPaths) {
      const override = this.pathOverrideByPath.get(affectedPath);
      if (override?.mode === 'force-unlock' && !isForceUnlockActive(override, isolation)) {
        this.pathOverrideByPath.delete(affectedPath);
      }
      if (options?.onlyIfMissing && this.pathIsolationByPath.has(affectedPath)) {
        continue;
      }
      this.pathIsolationByPath.set(affectedPath, {
        ...isolation,
        path: affectedPath,
      });
    }

    if (options?.persist !== false) {
      this.persistState();
    }

    return this.pathIsolationByPath.get(normalizedPrimaryPath) ?? isolation;
  }

  private async inspectPathParity(paths: string[]) {
    return gitService.inspectPathParity(paths, 'origin');
  }

  private releasePublishIsolation(primaryPath: string, options?: { persist?: boolean }): void {
    const normalizedPrimaryPath = normalizePath(primaryPath);
    const releasedPaths: string[] = [];
    for (const [pathValue, isolation] of this.pathIsolationByPath.entries()) {
      if (normalizePath(isolation.primaryPath) !== normalizedPrimaryPath) {
        continue;
      }
      this.pathIsolationByPath.delete(pathValue);
      releasedPaths.push(pathValue);
    }

    for (const releasedPath of releasedPaths) {
      const override = this.pathOverrideByPath.get(releasedPath);
      if (override?.mode === 'force-unlock') {
        this.pathOverrideByPath.delete(releasedPath);
      }
    }

    if (options?.persist !== false) {
      this.persistState();
    }
  }

  private getTimestampMs(value: string): number {
    return getTimestampMs(value);
  }
}
