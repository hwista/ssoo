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

const tokenFor = (userId: string, loginId: string, sessionId = 'sess-1'): TokenPayload => ({
  userId,
  loginId,
  sessionId,
} as unknown as TokenPayload);

describe('CollaborationService (D-2 phase 2)', () => {
  let tempRoot: string;
  let userService: FakeUserService;
  let service: CollaborationService;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-collab-test-'));
    jest.spyOn(configService, 'getAppRoot').mockReturnValue(tempRoot);
    userService = new FakeUserService();
    userService.setProfile('1', { displayName: 'Alice', email: 'alice@example.com' });
    userService.setProfile('2', { displayName: 'Bob', email: 'bob@example.com' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new CollaborationService(userService as any);
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
    it('replaces an existing edit lock with the new owner', async () => {
      await service.heartbeat({
        path: 'docs/a.md',
        currentUser: tokenFor('1', 'alice'),
        sessionId: 's1',
        mode: 'edit',
      });
      const snapshot = await service.takeover({
        path: 'docs/a.md',
        currentUser: tokenFor('2', 'bob'),
        sessionId: 's2',
      });
      expect(snapshot.softLock).toMatchObject({ userId: '2', sessionId: 's2' });
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
