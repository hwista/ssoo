import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import type { TokenPayload } from '../../src/modules/common/auth/interfaces/auth.interface.js';
import { configService } from '../../src/modules/dms/runtime/dms-config.service.js';
import { CollaborationService } from '../../src/modules/dms/collaboration/collaboration.service.js';

interface ProfileShape {
  displayName?: string;
  userName?: string;
  email?: string;
}

class FakeUserService {
  private readonly profiles = new Map<string, ProfileShape>();

  setProfile(userId: string, profile: ProfileShape): void {
    this.profiles.set(userId, profile);
  }

  async findProfileById(id: bigint): Promise<ProfileShape | null> {
    return this.profiles.get(String(id)) ?? null;
  }
}

class FakeNotificationService {
  readonly notifications: unknown[] = [];
  readonly archivedDedupeKeys: string[] = [];

  async notifyUser(payload: unknown): Promise<void> {
    this.notifications.push(payload);
  }

  async archiveByDedupeKey(_recipientUserId: bigint, _sourceApp: string, dedupeKey: string): Promise<void> {
    this.archivedDedupeKeys.push(dedupeKey);
  }

  async archiveByReferencePathPrefixes(): Promise<{ count: number }> {
    return { count: 0 };
  }
}

class FakeEventsGateway {
  readonly takeoverRequests: unknown[] = [];
  readonly takeoverResponses: unknown[] = [];
  readonly collaborationEvents: unknown[] = [];
  readonly fileChanges: unknown[] = [];
  readonly publishStatuses: unknown[] = [];
  readonly connectedUserIds = new Set<string>();

  emitLockTakeoverRequested(_ownerUserId: string, event: unknown): void {
    this.takeoverRequests.push(event);
  }

  emitLockTakeoverResponded(_requesterUserId: string, event: unknown): void {
    this.takeoverResponses.push(event);
  }

  emitCollaborationChanged(event: unknown): void {
    this.collaborationEvents.push(event);
  }

  emitFileChanged(event: unknown): void {
    this.fileChanges.push(event);
  }

  emitPublishStatus(event: unknown): void {
    this.publishStatuses.push(event);
  }

  isUserConnected(userId: string): boolean {
    return this.connectedUserIds.has(userId);
  }
}

const tokenFor = (userId: string, loginId: string, sessionId = 'sess-1'): TokenPayload => ({
  userId,
  loginId,
  sessionId,
} as unknown as TokenPayload);

describe('CollaborationService (D-2 phase 2)', () => {
  let tempRoot: string;
  let userService: FakeUserService;
  let notificationService: FakeNotificationService;
  let eventsGateway: FakeEventsGateway;
  let service: CollaborationService;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-collab-test-'));
    jest.spyOn(configService, 'getAppRoot').mockReturnValue(tempRoot);
    userService = new FakeUserService();
    userService.setProfile('1', { displayName: 'Alice', email: 'alice@example.com' });
    userService.setProfile('2', { displayName: 'Bob', email: 'bob@example.com' });
    notificationService = new FakeNotificationService();
    eventsGateway = new FakeEventsGateway();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new CollaborationService(userService as any, notificationService as any, eventsGateway as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch { /* noop */ }
  });

  describe('heartbeat', () => {
    it('adds a member in view mode without acquiring a soft lock', async () => {
      const snapshot = await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'view',
      });
      expect(snapshot.path).toBe('docs/a.md');
      expect(snapshot.members).toHaveLength(1);
      expect(snapshot.members[0]).toMatchObject({ userId: '1', mode: 'view', displayName: 'Alice' });
      expect(snapshot.softLock).toBeNull();
    });

    it('acquires a soft lock in edit mode', async () => {
      const snapshot = await service.heartbeat({
        path: 'docs\\a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      expect(snapshot.path).toBe('docs/a.md');
      expect(snapshot.softLock).toMatchObject({ userId: '1', sessionId: 's1', path: 'docs/a.md' });
    });

    it('releases the current session soft lock when the owner returns to view mode', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });

      const snapshot = await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'view',
      });

      expect(snapshot.softLock).toBeNull();
      expect(snapshot.members).toContainEqual(expect.objectContaining({
        userId: '1',
        sessionId: 's1',
        mode: 'view',
      }));
    });

    it('blocks another writable user from entering edit mode while a soft lock is active', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });

      await expect(service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
        mode: 'edit',
      })).rejects.toThrow('사용자가 편집 중입니다');

      const snapshot = await service.getSnapshot('docs/a.md');
      expect(snapshot.softLock).toMatchObject({ userId: '1', sessionId: 's1' });
    });

    it('blocks a different session from the same user while a soft lock is active', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });

      await expect(service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's2',
        mode: 'edit',
      })).rejects.toThrow('사용자가 편집 중입니다');

      const snapshot = await service.getSnapshot('docs/a.md');
      expect(snapshot.softLock).toMatchObject({ userId: '1', sessionId: 's1' });
    });

    it('renews only the current edit lock session', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });

      await expect(service.renewSoftLock({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's2',
      })).rejects.toThrow('사용자가 편집 중입니다');

      const renewed = await service.renewSoftLock({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
      });
      expect(renewed.softLock).toMatchObject({ userId: '1', sessionId: 's1' });
    });

    it('expires a stale soft lock even when the lock user remains connected', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      eventsGateway.connectedUserIds.add('1');

      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);
      const expiredSnapshot = service.getSnapshot('docs/a.md');
      expect(expiredSnapshot.softLock).toBeNull();

      nowSpy.mockRestore();
      const nextEditorSnapshot = await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
        mode: 'edit',
      });
      expect(nextEditorSnapshot.softLock).toMatchObject({ userId: '2', sessionId: 's2' });
    });

    it('expires stale edit presence even when that user remains connected elsewhere', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      eventsGateway.connectedUserIds.add('1');

      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);
      const snapshot = service.getSnapshot('docs/a.md');
      expect(snapshot.members.some((member) => member.userId === '1' && member.mode === 'edit')).toBe(false);
      expect(snapshot.softLock).toBeNull();

      nowSpy.mockRestore();
    });

    it('allows writes only from the current edit lock session while a lock is active', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });

      expect(() => service.assertCurrentSoftLockOwner({
        action: 'write',
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
      })).not.toThrow();
      expect(() => service.assertCurrentSoftLockOwner({
        action: 'write',
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's2',
      })).toThrow('현재 편집 잠금 세션만 저장할 수 있습니다');
      expect(() => service.assertCurrentSoftLockOwner({
        action: 'write',
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
      })).toThrow('현재 편집 잠금 세션만 저장할 수 있습니다');
    });

    it('normalizes equivalent document paths before checking active soft locks', async () => {
      await service.heartbeat({
        path: '/docs//a.md/',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });

      await expect(service.heartbeat({
        path: 'docs\\a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
        mode: 'edit',
      })).rejects.toThrow('사용자가 편집 중입니다');

      const snapshot = await service.getSnapshot('docs/a.md');
      expect(snapshot.path).toBe('docs/a.md');
      expect(snapshot.softLock).toMatchObject({ userId: '1', sessionId: 's1', path: 'docs/a.md' });
    });

    it('preserves joinedAt across repeated heartbeats from the same session', async () => {
      const first = await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'view',
      });
      await new Promise((r) => setTimeout(r, 5));
      const second = await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'view',
      });
      expect(second.members[0].joinedAt).toBe(first.members[0].joinedAt);
      expect(second.members[0].lastSeenAt >= first.members[0].lastSeenAt).toBe(true);
    });

    it('falls back to loginId/email when user profile is missing', async () => {
      const snapshot = await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('99', 'ghost'),
        sessionId: 's1',
        mode: 'view',
      });
      expect(snapshot.members[0].displayName).toBe('ghost');
      expect(snapshot.members[0].email).toBe('ghost@dms.local');
    });
  });

  describe('takeover', () => {
    it('creates a pending request when another user owns an active edit lock', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      const result = await service.takeover({
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
      });
      expect(result.status).toBe('requested');
      expect(result.snapshot.softLock).toMatchObject({ userId: '1', sessionId: 's1' });
      expect(result.request).toMatchObject({
        path: 'docs/a.md',
        requester: { userId: '2', sessionId: 's2' },
        owner: { userId: '1', sessionId: 's1' },
      });
      expect(notificationService.notifications).toHaveLength(1);
      expect(eventsGateway.takeoverRequests).toHaveLength(1);
    });

    it('blocks hidden verification document takeover requests in user-facing runtimes', async () => {
      jest.spyOn(configService, 'getUserSurfaceHiddenPathPrefixes').mockReturnValue(['launch-smoke/']);

      await service.heartbeat({
        path: 'launch-smoke/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });

      await expect(service.takeover({
        path: 'launch-smoke/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
      })).rejects.toThrow('사용자 문서 표면에서 제외');
      expect(notificationService.notifications).toHaveLength(0);
      expect(eventsGateway.takeoverRequests).toHaveLength(0);
    });

    it('reuses an active pending takeover request for the same requester', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      const first = await service.takeover({
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
      });
      const second = await service.takeover({
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
      });

      expect(second.status).toBe('requested');
      expect(second.request?.requestId).toBe(first.request?.requestId);
      expect(notificationService.notifications).toHaveLength(1);
      expect(eventsGateway.takeoverRequests).toHaveLength(1);
    });

    it('exposes pending takeover state for requester and lock owner', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      const result = await service.takeover({
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
      });

      expect(service.getTakeoverPendingState({
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
      }).requesterRequest?.requestId).toBe(result.request?.requestId);
      expect(service.getTakeoverPendingState({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
      }).ownerRequest?.requestId).toBe(result.request?.requestId);
    });

    it('moves the edit lock when the owner approves a pending takeover request', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      const result = await service.takeover({
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
      });
      const response = await service.respondToTakeover({
        requestId: result.request?.requestId ?? '',
        approved: true,
        currentUser: tokenFor('1', 'alice'),
      });

      expect(response.status).toBe('approved');
      expect(response.snapshot.softLock).toMatchObject({ userId: '2', sessionId: 's2' });
    });

    it('keeps the owner lock when the owner responds after a takeover request expires', async () => {
      const startedAt = new Date('2026-06-02T00:00:00.000Z');
      jest.useFakeTimers({ now: startedAt });
      try {
        await service.heartbeat({
          path: 'docs/a.md',
          currentUser: tokenFor('1', 'alice'),
          sessionId: 's1',
          mode: 'edit',
        });
        const result = await service.takeover({
          path: 'docs/a.md',
          currentUser: tokenFor('2', 'bob'),
          sessionId: 's2',
        });

        jest.setSystemTime(new Date(startedAt.getTime() + 31_000));
        expect(service.getTakeoverPendingState({
          path: 'docs/a.md',
          currentUser: tokenFor('2', 'bob'),
        }).requesterRequest).toBeNull();
        expect(service.getTakeoverPendingState({
          path: 'docs/a.md',
          currentUser: tokenFor('1', 'alice'),
        }).ownerRequest).toBeNull();

        const response = await service.respondToTakeover({
          requestId: result.request?.requestId ?? '',
          approved: false,
          currentUser: tokenFor('1', 'alice'),
        });

        expect(response.status).toBe('expired');
        expect(response.snapshot.softLock).toMatchObject({ userId: '1', sessionId: 's1' });
        await expect(service.heartbeat({
          path: 'docs/a.md',
          currentUser: tokenFor('2', 'bob'),
          sessionId: 's2',
          mode: 'edit',
        })).rejects.toThrow('사용자가 편집 중입니다');

        const retry = await service.takeover({
          path: 'docs/a.md',
          currentUser: tokenFor('2', 'bob'),
          sessionId: 's2',
        });
        expect(retry.status).toBe('requested');
        expect(retry.snapshot.softLock).toMatchObject({ userId: '1', sessionId: 's1' });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('leave', () => {
    it('removes the caller from presence and releases their own soft lock', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      const snapshot = service.leave({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
      });
      expect(snapshot.members).toHaveLength(0);
      expect(snapshot.softLock).toBeNull();
    });

    it('does not release a soft lock owned by a different user', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      const snapshot = service.leave({
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
      });
      expect(snapshot.softLock).toMatchObject({ userId: '1' });
    });
  });

  describe('forceLockPath / forceUnlockPath', () => {
    it('ignores non-markdown paths', async () => {
      const snapshot = await service.forceLockPath(
        'image.png',
        tokenFor('1', 'alice'),
        'maintenance',
      );
      expect(snapshot.isolation).toBeNull();
    });

    it('applies an operator force-lock isolation on markdown path', async () => {
      const snapshot = await service.forceLockPath(
        'docs/a.md',
        tokenFor('1', 'alice'),
        'maintenance',
      );
      expect(snapshot.isolation).toMatchObject({
        status: 'force-locked',
        source: 'operator',
        reason: 'maintenance',
      });
    });

    it('removes the operator force-lock on unlock', async () => {
      await service.forceLockPath('docs/a.md', tokenFor('1', 'alice'), 'reason');
      const snapshot = await service.forceUnlockPath('docs/a.md', tokenFor('1', 'alice'));
      expect(snapshot.isolation).toBeNull();
    });
  });

  describe('assertMutationAllowed', () => {
    it('passes when no isolation exists', () => {
      expect(() =>
        service.assertMutationAllowed({ action: 'write', paths: ['docs/a.md'] }),
      ).not.toThrow();
    });

    it('throws 423 when an operator force-lock blocks the action', async () => {
      await service.forceLockPath('docs/a.md', tokenFor('1', 'alice'), 'maintenance');
      try {
        service.assertMutationAllowed({ action: 'write', paths: ['docs/a.md'] });
        fail('expected to throw');
      } catch (err) {
        expect((err as { getStatus: () => number }).getStatus()).toBe(423);
      }
    });

    it('skips empty path entries', () => {
      expect(() =>
        service.assertMutationAllowed({ action: 'write', paths: ['', '   '] }),
      ).not.toThrow();
    });
  });

  describe('noteMutation', () => {
    it('keeps ignored verification documents out of publish state while emitting file changes', () => {
      jest.spyOn(configService, 'getGitPublishIgnoredPathPrefixes').mockReturnValue(['launch-smoke/']);

      service.noteMutation({
        primaryPath: 'launch-smoke/a.md',
        operationType: 'create',
        currentUser: tokenFor('1', 'alice'),
        publishDelayMs: 0,
      });

      expect(service.getSnapshot('launch-smoke/a.md').publishState).toMatchObject({
        path: 'launch-smoke/a.md',
        status: 'clean',
      });
      expect(eventsGateway.fileChanges).toHaveLength(1);
      expect(eventsGateway.fileChanges[0]).toMatchObject({
        action: 'create',
        paths: ['launch-smoke/a.md'],
      });
      expect(notificationService.notifications).toHaveLength(0);
    });
  });

  describe('getPathIsolation', () => {
    it('returns null for empty paths', () => {
      expect(service.getPathIsolation('')).toBeNull();
    });

    it('returns isolation when path is force-locked', async () => {
      await service.forceLockPath('docs/a.md', tokenFor('1', 'alice'), 'r');
      expect(service.getPathIsolation('docs/a.md')).toMatchObject({ status: 'force-locked' });
    });
  });

  describe('persistence round-trip', () => {
    it('reloads soft locks across service instances', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reloaded = new CollaborationService(userService as any);
      const snapshot = reloaded.getSnapshot('docs/a.md');
      expect(snapshot.softLock).toMatchObject({ userId: '1', path: 'docs/a.md' });
    });

    it('reloads operator overrides across service instances', async () => {
      await service.forceLockPath('docs/a.md', tokenFor('1', 'alice'), 'r');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reloaded = new CollaborationService(userService as any);
      expect(reloaded.getPathIsolation('docs/a.md')).toMatchObject({ status: 'force-locked' });
    });
  });
});
