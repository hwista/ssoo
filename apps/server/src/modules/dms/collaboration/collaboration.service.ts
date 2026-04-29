import fs from 'node:fs';
import path from 'node:path';
import { HttpException, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import type { DocumentIsolationState, DocumentMutationAction } from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { UserService } from '../../common/user/user.service.js';
import { DmsEventsGateway } from '../events/dms-events.gateway.js';
import { gitService, type GitCommitAuthor, type GitPathParityStatus, type GitRemoteParityStatus, type GitSyncStatus } from '../runtime/git.service.js';
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

const logger = createDmsLogger('DmsCollaborationService');
const STATE_FILE = '.dms-collaboration-state.json';
const BLOCKED_MUTATION_ACTIONS: readonly DocumentMutationAction[] = [
  'write',
  'updateMetadata',
  'rename',
  'delete',
  'upload',
  'resync',
  'publish',
];

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

interface PersistedState {
  publishStates: Record<string, DocumentPublishState>;
  softLocks: Record<string, DocumentSoftLock>;
  pathIsolations?: Record<string, DocumentIsolationState>;
  pathOverrides?: Record<string, PathReleaseOverride>;
}

interface PathReleaseOverride {
  path: string;
  mode: 'force-lock' | 'force-unlock';
  reason?: string;
  appliedAt: string;
  actorUserId: string;
  actorLoginId: string;
  actorDisplayName: string;
}

@Injectable()
export class CollaborationService implements OnModuleDestroy {
  private readonly presenceByPath = new Map<string, Map<string, CollaborationMember>>();
  private readonly publishStateByPath = new Map<string, DocumentPublishState>();
  private readonly softLockByPath = new Map<string, DocumentSoftLock>();
  private readonly pathIsolationByPath = new Map<string, DocumentIsolationState>();
  private readonly pathOverrideByPath = new Map<string, PathReleaseOverride>();
  private readonly publishJobsByPath = new Map<string, PublishJob>();
  private readonly actorCache = new Map<string, ActorProfile>();
  private readonly stateFilePath: string;

  constructor(
    private readonly userService: UserService,
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
    const sessionId = input.sessionId?.trim() || input.currentUser.sessionId || 'default';
    const key = buildPresenceKey(input.currentUser.userId, sessionId);
    const now = new Date().toISOString();
    const members = this.getOrCreatePresence(normalizedPath);
    const existing = members.get(key);
    const mode = input.mode ?? 'view';

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

    if (mode === 'edit') {
      this.touchOrAcquireSoftLock(normalizedPath, input.currentUser, actor, sessionId, now);
    }

    this.cleanupInactiveMembers(normalizedPath);
    this.cleanupInactiveLock(normalizedPath);
    return this.getSnapshot(normalizedPath);
  }

  async takeover(input: { path: string; currentUser: TokenPayload; sessionId?: string }): Promise<DocumentCollaborationSnapshot> {
    const normalizedPath = normalizePath(input.path);
    const actor = await this.resolveActorProfile(input.currentUser);
    const sessionId = input.sessionId?.trim() || input.currentUser.sessionId || 'default';
    const now = new Date().toISOString();

    this.softLockByPath.set(normalizedPath, {
      path: normalizedPath,
      userId: input.currentUser.userId,
      loginId: input.currentUser.loginId,
      displayName: actor.displayName,
      email: actor.email,
      sessionId,
      acquiredAt: now,
      lastSeenAt: now,
    });
    this.persistState();

    return this.heartbeat({ path: normalizedPath, currentUser: input.currentUser, sessionId, mode: 'edit' });
  }

  leave(input: { path: string; currentUser: TokenPayload; sessionId?: string }): DocumentCollaborationSnapshot {
    const normalizedPath = normalizePath(input.path);
    const sessionId = input.sessionId?.trim() || input.currentUser.sessionId || 'default';
    const key = buildPresenceKey(input.currentUser.userId, sessionId);
    const members = this.presenceByPath.get(normalizedPath);
    members?.delete(key);
    if (members?.size === 0) this.presenceByPath.delete(normalizedPath);

    const lock = this.softLockByPath.get(normalizedPath);
    if (lock && lock.userId === input.currentUser.userId && lock.sessionId === sessionId) {
      this.softLockByPath.delete(normalizedPath);
      this.persistState();
    }

    return this.getSnapshot(normalizedPath);
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
    const trackedPaths = this.resolveTrackedPaths(primaryPath, currentState, currentIsolation);
    const pathParity = await this.inspectPathParity(trackedPaths);
    const shouldRelease = this.shouldAutoReleasePublishIsolation(currentState, currentIsolation, pathParity);
    const nextState: DocumentPublishState = {
      ...currentState,
      path: primaryPath,
      status: shouldRelease
        ? 'clean'
        : this.resolveRefreshStatus(currentState, currentIsolation, pathParity),
      syncStatus: pathParity.success
        ? pathParity.data.syncStatus ?? currentState.syncStatus
        : currentState.syncStatus,
      lastError: shouldRelease
        ? undefined
        : this.resolveRefreshError(currentState, pathParity),
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
    this.assertMutationAllowed({ action: 'publish', paths: [normalizedPath] });
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
      throw this.buildIsolationException('publish', normalizedPath, isolation ?? {
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

      throw this.buildIsolationException(input.action, requestedPath, isolation);
    }
  }

  noteMutation(input: {
    primaryPath: string;
    affectedPaths?: string[];
    gitManagedPaths?: string[];
    operationType: string;
    currentUser: TokenPayload;
  }): void {
    const affectedPaths = filterGitManagedDocumentPaths(
      input.gitManagedPaths ?? [input.primaryPath, ...(input.affectedPaths ?? [])],
    );
    const primaryPath = resolveGitManagedPrimaryPath(input.primaryPath, affectedPaths);
    if (!primaryPath || affectedPaths.length === 0) {
      return;
    }
    const now = new Date().toISOString();
    const currentState = this.getPublishState(primaryPath);
    const nextState: DocumentPublishState = {
      ...currentState,
      path: primaryPath,
      status: 'dirty-uncommitted',
      operationType: input.operationType,
      affectedPaths,
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
    affectedPaths.forEach((item) => job.affectedPaths.add(item));
    if (job.timer) clearTimeout(job.timer);
    job.timer = setTimeout(() => void this.publishJob(primaryPath), 4000);
    this.publishJobsByPath.set(primaryPath, job);

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

      // WebSocket: publish 완료 이벤트
      this.eventsGateway?.emitPublishStatus({
        path: primaryPath,
        status: 'clean',
        commitHash: commitResult.success ? commitResult.data.hash : undefined,
      });
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
    } finally {
      job.processing = false;
      if (this.publishJobsByPath.get(primaryPath) === job) this.publishJobsByPath.delete(primaryPath);
    }
  }

  private async fetchSyncStatus() {
    return gitService.inspectSyncStatus('origin');
  }

  private async inspectPublishParity(): Promise<{ success: true; data: GitRemoteParityStatus } | { success: false; error: string }> {
    return gitService.inspectRemoteParity('origin');
  }

  private touchOrAcquireSoftLock(pathValue: string, currentUser: TokenPayload, actor: ActorProfile, sessionId: string, now: string): void {
    const existing = this.softLockByPath.get(pathValue);
    if (!existing || isExpired(existing.lastSeenAt) || (existing.userId === currentUser.userId && existing.sessionId === sessionId)) {
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

  private cleanupInactiveMembers(pathValue: string): void {
    const members = this.presenceByPath.get(pathValue);
    if (!members) return;
    const now = Date.now();
    for (const [key, member] of members.entries()) {
      if (now - new Date(member.lastSeenAt).getTime() > PRESENCE_TTL_MS) members.delete(key);
    }
    if (members.size === 0) this.presenceByPath.delete(pathValue);
  }

  private cleanupInactiveLock(pathValue: string): void {
    const lock = this.softLockByPath.get(pathValue);
    if (!lock) return;
    if (isExpired(lock.lastSeenAt)) {
      this.softLockByPath.delete(pathValue);
      this.persistState();
    }
  }

  private loadPersistedState(): void {
    try {
      if (!fs.existsSync(this.stateFilePath)) return;
      const raw = fs.readFileSync(this.stateFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedState;
      let shouldPersistNormalizedState = false;
      for (const [pathValue, state] of Object.entries(parsed.publishStates ?? {})) {
        const sanitized = this.sanitizePublishState(state);
        if (!sanitized) {
          shouldPersistNormalizedState = true;
          continue;
        }
        if (pathValue !== sanitized.path || !hasSameSerializedValue(state, sanitized)) {
          shouldPersistNormalizedState = true;
        }
        this.publishStateByPath.set(sanitized.path, sanitized);
      }
      for (const [pathValue, lock] of Object.entries(parsed.softLocks ?? {})) {
        const sanitized = this.sanitizeSoftLock(lock);
        if (!sanitized || isExpired(sanitized.lastSeenAt)) {
          shouldPersistNormalizedState = true;
          continue;
        }
        if (pathValue !== sanitized.path || !hasSameSerializedValue(lock, sanitized)) {
          shouldPersistNormalizedState = true;
        }
        this.softLockByPath.set(sanitized.path, sanitized);
      }
      for (const [pathValue, isolation] of Object.entries(parsed.pathIsolations ?? {})) {
        const sanitized = this.sanitizeIsolationState(isolation);
        if (!sanitized) {
          shouldPersistNormalizedState = true;
          continue;
        }
        if (pathValue !== sanitized.path || !hasSameSerializedValue(isolation, sanitized)) {
          shouldPersistNormalizedState = true;
        }
        this.pathIsolationByPath.set(sanitized.path, sanitized);
      }
      for (const [pathValue, override] of Object.entries(parsed.pathOverrides ?? {})) {
        const sanitized = this.sanitizePathOverride(override);
        if (!sanitized) {
          shouldPersistNormalizedState = true;
          continue;
        }
        if (pathValue !== sanitized.path || !hasSameSerializedValue(override, sanitized)) {
          shouldPersistNormalizedState = true;
        }
        this.pathOverrideByPath.set(sanitized.path, sanitized);
      }
      for (const [pathValue, state] of this.publishStateByPath.entries()) {
        this.captureIsolationFromPublishState(pathValue, state, { persist: false, onlyIfMissing: true });
      }
      if (shouldPersistNormalizedState) {
        this.persistState();
      }
    } catch (error) {
      logger.warn('collaboration persisted state load 실패', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  private persistState(): void {
    try {
      const payload: PersistedState = {
        publishStates: Object.fromEntries(this.publishStateByPath.entries()),
        softLocks: Object.fromEntries(this.softLockByPath.entries()),
        pathIsolations: Object.fromEntries(this.pathIsolationByPath.entries()),
        pathOverrides: Object.fromEntries(this.pathOverrideByPath.entries()),
      };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
    } catch (error) {
      logger.warn('collaboration persisted state save 실패', error instanceof Error ? { message: error.message } : undefined);
    }
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

  private sanitizePublishState(state: DocumentPublishState): DocumentPublishState | null {
    const affectedPaths = filterGitManagedDocumentPaths([
      state.path,
      ...(state.affectedPaths ?? []),
    ]);
    const primaryPath = resolveGitManagedPrimaryPath(state.path, affectedPaths);
    if (!primaryPath) {
      return null;
    }

    return {
      ...state,
      path: primaryPath,
      affectedPaths,
    };
  }

  private sanitizeSoftLock(lock: DocumentSoftLock): DocumentSoftLock | null {
    const normalizedPath = normalizePath(lock.path);
    if (!isGitManagedDocumentPath(normalizedPath)) {
      return null;
    }

    return {
      ...lock,
      path: normalizedPath,
    };
  }

  private sanitizeIsolationState(isolation: DocumentIsolationState): DocumentIsolationState | null {
    const affectedPaths = filterGitManagedDocumentPaths([
      isolation.primaryPath,
      isolation.path,
      ...(isolation.affectedPaths ?? []),
    ]);
    const primaryPath = resolveGitManagedPrimaryPath(isolation.primaryPath, affectedPaths);
    if (!primaryPath) {
      return null;
    }

    return {
      ...isolation,
      path: isGitManagedDocumentPath(isolation.path)
        ? normalizePath(isolation.path)
        : primaryPath,
      primaryPath,
      affectedPaths,
    };
  }

  private sanitizePathOverride(override: PathReleaseOverride): PathReleaseOverride | null {
    const normalizedPath = normalizePath(override.path);
    if (!isGitManagedDocumentPath(normalizedPath)) {
      return null;
    }

    return {
      ...override,
      path: normalizedPath,
    };
  }

  private hasSameSerializedValue(left: unknown, right: unknown): boolean {
    return hasSameSerializedValue(left, right);
  }

  private findPathIsolation(pathValue: string): DocumentIsolationState | null {
    const override = this.pathOverrideByPath.get(pathValue);
    if (override?.mode === 'force-lock') {
      return this.buildOperatorLockIsolation(override);
    }

    const publishIsolation = this.findPublishIsolation(pathValue);
    if (!publishIsolation) {
      return null;
    }

    if (override?.mode === 'force-unlock' && this.isForceUnlockActive(override, publishIsolation)) {
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
      if (override?.mode === 'force-unlock' && !this.isForceUnlockActive(override, isolation)) {
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

  private resolveTrackedPaths(
    primaryPath: string,
    publishState: DocumentPublishState,
    isolation: DocumentIsolationState | null,
  ): string[] {
    return filterGitManagedDocumentPaths([
      primaryPath,
      ...(publishState.affectedPaths ?? []),
      ...(isolation?.affectedPaths ?? []),
    ]);
  }

  private async inspectPathParity(paths: string[]) {
    return gitService.inspectPathParity(paths, 'origin');
  }

  private shouldAutoReleasePublishIsolation(
    currentState: DocumentPublishState,
    currentIsolation: DocumentIsolationState | null,
    pathParity: { success: true; data: GitPathParityStatus } | { success: false; error: string },
  ): boolean {
    return pathParity.success
      && pathParity.data.verified
      && pathParity.data.clean
      && (currentState.status !== 'clean' || Boolean(currentIsolation));
  }

  private resolveRefreshStatus(
    currentState: DocumentPublishState,
    currentIsolation: DocumentIsolationState | null,
    pathParity: { success: true; data: GitPathParityStatus } | { success: false; error: string },
  ): PublishStatus {
    if (!pathParity.success || !pathParity.data.verified) {
      return currentState.status;
    }

    if (pathParity.data.clean) {
      return 'clean';
    }

    if (pathParity.data.remoteAheadPaths.length > 0) {
      return currentState.status === 'clean' && !currentIsolation ? 'clean' : 'sync-blocked';
    }

    if (pathParity.data.localAheadPaths.length > 0) {
      return 'committed-unpushed';
    }

    if (pathParity.data.workingTreePaths.length > 0) {
      return 'dirty-uncommitted';
    }

    return currentState.status;
  }

  private resolveRefreshError(
    currentState: DocumentPublishState,
    pathParity: { success: true; data: GitPathParityStatus } | { success: false; error: string },
  ): string | undefined {
    if (!pathParity.success) {
      return pathParity.error;
    }

    if (pathParity.data.clean) {
      return undefined;
    }

    return pathParity.data.reason ?? currentState.lastError;
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

  private buildOperatorLockIsolation(override: PathReleaseOverride): DocumentIsolationState {
    const actorLabel = `${override.actorDisplayName}(${override.actorLoginId})`;
    return {
      path: override.path,
      primaryPath: override.path,
      status: 'force-locked',
      source: 'operator',
      reasonCode: 'operator-forced-lock',
      reason: override.reason?.trim() || `운영자 ${actorLabel} 이 경로를 강제 잠금했습니다.`,
      isolatedAt: override.appliedAt,
      blockedActions: [...BLOCKED_MUTATION_ACTIONS],
      affectedPaths: [override.path],
      releaseStrategy: 'manual',
    };
  }

  private isForceUnlockActive(override: PathReleaseOverride, isolation: DocumentIsolationState): boolean {
    return getTimestampMs(override.appliedAt) >= getTimestampMs(isolation.isolatedAt);
  }

  private getTimestampMs(value: string): number {
    return getTimestampMs(value);
  }

  private buildIsolationException(
    action: DocumentMutationAction,
    requestedPath: string,
    isolation: DocumentIsolationState,
  ): HttpException {
    return new HttpException({
      error: isolation.source === 'operator'
        ? '문서 경로가 운영자에 의해 강제 잠금되어 있어 변경 작업을 수행할 수 없습니다.'
        : '문서 경로가 격리되어 있어 reconcile 전까지 변경 작업을 수행할 수 없습니다.',
      details: {
        action,
        requestedPath,
        isolation,
      },
    }, 423);
  }
}
