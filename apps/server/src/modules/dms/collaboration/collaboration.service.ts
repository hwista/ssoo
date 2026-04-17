import fs from 'node:fs';
import path from 'node:path';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { UserService } from '../../common/user/user.service.js';
import { gitService, type GitCommitAuthor, type GitSyncStatus } from '../runtime/git.service.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
import { configService } from '../runtime/dms-config.service.js';

const logger = createDmsLogger('DmsCollaborationService');
const PRESENCE_TTL_MS = 30_000;
const STATE_FILE = '.dms-collaboration-state.json';

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
}

@Injectable()
export class CollaborationService implements OnModuleDestroy {
  private readonly presenceByPath = new Map<string, Map<string, CollaborationMember>>();
  private readonly publishStateByPath = new Map<string, DocumentPublishState>();
  private readonly softLockByPath = new Map<string, DocumentSoftLock>();
  private readonly publishJobsByPath = new Map<string, PublishJob>();
  private readonly actorCache = new Map<string, ActorProfile>();
  private readonly stateFilePath: string;

  constructor(private readonly userService: UserService) {
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
    const normalizedPath = this.normalizePath(input.path);
    const actor = await this.resolveActorProfile(input.currentUser);
    const sessionId = input.sessionId?.trim() || input.currentUser.sessionId || 'default';
    const key = this.buildPresenceKey(input.currentUser.userId, sessionId);
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
    const normalizedPath = this.normalizePath(input.path);
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
    const normalizedPath = this.normalizePath(input.path);
    const sessionId = input.sessionId?.trim() || input.currentUser.sessionId || 'default';
    const key = this.buildPresenceKey(input.currentUser.userId, sessionId);
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
    const normalizedPath = this.normalizePath(pathValue);
    this.cleanupInactiveMembers(normalizedPath);
    this.cleanupInactiveLock(normalizedPath);
    const members = Array.from(this.presenceByPath.get(normalizedPath)?.values() ?? []).sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'));
    return {
      path: normalizedPath,
      members,
      publishState: this.getPublishState(normalizedPath),
      softLock: this.softLockByPath.get(normalizedPath) ?? null,
    };
  }

  async refreshPublishState(pathValue: string): Promise<DocumentCollaborationSnapshot> {
    const normalizedPath = this.normalizePath(pathValue);
    const syncStatus = await this.fetchSyncStatus();
    this.publishStateByPath.set(normalizedPath, {
      ...this.getPublishState(normalizedPath),
      path: normalizedPath,
      syncStatus: syncStatus.success ? syncStatus.data : undefined,
      lastError: syncStatus.success ? this.getPublishState(normalizedPath).lastError : syncStatus.error,
    });
    this.persistState();
    return this.getSnapshot(normalizedPath);
  }

  async retryPublish(pathValue: string): Promise<DocumentCollaborationSnapshot> {
    const normalizedPath = this.normalizePath(pathValue);
    const currentState = this.getPublishState(normalizedPath);
    const syncStatus = await this.fetchSyncStatus();
    const nextState: DocumentPublishState = {
      ...currentState,
      path: normalizedPath,
      status: currentState.status === 'sync-blocked' ? 'sync-blocked' : 'dirty-uncommitted',
      retryCount: (currentState.retryCount ?? 0) + 1,
      syncStatus: syncStatus.success ? syncStatus.data : currentState.syncStatus,
      lastError: syncStatus.success ? undefined : syncStatus.error,
    };
    this.publishStateByPath.set(normalizedPath, nextState);
    this.persistState();

    if (currentState.status !== 'sync-blocked') {
      const existing = this.publishJobsByPath.get(normalizedPath);
      if (existing) {
        if (existing.timer) clearTimeout(existing.timer);
        existing.timer = setTimeout(() => void this.publishJob(normalizedPath), 10);
      }
    }

    return this.getSnapshot(normalizedPath);
  }

  noteMutation(input: { primaryPath: string; affectedPaths?: string[]; operationType: string; currentUser: TokenPayload }): void {
    const primaryPath = this.normalizePath(input.primaryPath);
    const affectedPaths = Array.from(new Set([primaryPath, ...(input.affectedPaths ?? []).map((item) => this.normalizePath(item))])).filter(Boolean);
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
    this.publishStateByPath.set(primaryPath, {
      ...this.getPublishState(primaryPath),
      path: primaryPath,
      operationType: job.operationType,
      affectedPaths: Array.from(job.affectedPaths),
      status: 'publishing',
      lastActorLoginId: job.actor.loginId,
      lastActorDisplayName: actor.displayName,
      lastQueuedAt: job.queuedAt,
    });
    this.persistState();

    try {
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
      this.persistState();
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
      this.persistState();
    } finally {
      job.processing = false;
      if (this.publishJobsByPath.get(primaryPath) === job) this.publishJobsByPath.delete(primaryPath);
    }
  }

  private async fetchSyncStatus() {
    const fetchResult = await gitService.fetch('origin');
    if (!fetchResult.success) return { success: false as const, error: fetchResult.error };
    return gitService.inspectSyncStatus('origin');
  }

  private touchOrAcquireSoftLock(pathValue: string, currentUser: TokenPayload, actor: ActorProfile, sessionId: string, now: string): void {
    const existing = this.softLockByPath.get(pathValue);
    if (!existing || this.isExpired(existing.lastSeenAt) || (existing.userId === currentUser.userId && existing.sessionId === sessionId)) {
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
    if (this.isExpired(lock.lastSeenAt)) {
      this.softLockByPath.delete(pathValue);
      this.persistState();
    }
  }

  private isExpired(lastSeenAt: string): boolean {
    return Date.now() - new Date(lastSeenAt).getTime() > PRESENCE_TTL_MS;
  }

  private loadPersistedState(): void {
    try {
      if (!fs.existsSync(this.stateFilePath)) return;
      const raw = fs.readFileSync(this.stateFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedState;
      for (const [pathValue, state] of Object.entries(parsed.publishStates ?? {})) this.publishStateByPath.set(pathValue, state);
      for (const [pathValue, lock] of Object.entries(parsed.softLocks ?? {})) {
        if (!this.isExpired(lock.lastSeenAt)) this.softLockByPath.set(pathValue, lock);
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
      };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
    } catch (error) {
      logger.warn('collaboration persisted state save 실패', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  private buildPresenceKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }

  private normalizePath(pathValue: string): string {
    return pathValue.trim().replace(/\\/g, '/');
  }
}
