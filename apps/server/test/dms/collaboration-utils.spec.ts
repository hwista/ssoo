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
} from '../../src/modules/dms/collaboration/collaboration-paths.util.js';
import {
  sanitizeIsolationState,
  sanitizePathOverride,
  sanitizePublishState,
  sanitizeSoftLock,
  type PathReleaseOverride,
} from '../../src/modules/dms/collaboration/collaboration-sanitizers.util.js';
import {
  BLOCKED_MUTATION_ACTIONS,
  buildIsolationException,
  buildOperatorLockIsolation,
  isForceUnlockActive,
  resolveRefreshError,
  resolveRefreshStatus,
  resolveTrackedPaths,
  shouldAutoReleasePublishIsolation,
} from '../../src/modules/dms/collaboration/collaboration-isolation.util.js';
import type {
  DocumentPublishState,
  DocumentSoftLock,
} from '../../src/modules/dms/collaboration/collaboration.service.js';
import type { DocumentIsolationState } from '@ssoo/types/dms';

describe('collaboration-paths.util', () => {
  describe('normalizePath', () => {
    it('converts backslashes and trims whitespace', () => {
      expect(normalizePath('  docs\\foo\\bar.md  ')).toBe('docs/foo/bar.md');
    });
  });

  describe('isGitManagedDocumentPath', () => {
    it('returns true for markdown paths', () => {
      expect(isGitManagedDocumentPath('docs/a.md')).toBe(true);
    });
    it('returns false for non-markdown paths', () => {
      expect(isGitManagedDocumentPath('docs/a.png')).toBe(false);
      expect(isGitManagedDocumentPath('docs')).toBe(false);
    });
  });

  describe('filterGitManagedDocumentPaths', () => {
    it('drops nullish and non-markdown entries and dedupes', () => {
      const result = filterGitManagedDocumentPaths([
        'docs/a.md',
        'docs/a.md',
        'docs\\b.md',
        null,
        undefined,
        'image.png',
        '',
      ]);
      expect(result).toEqual(['docs/a.md', 'docs/b.md']);
    });
  });

  describe('resolveGitManagedPrimaryPath', () => {
    it('returns the primary path when it is markdown', () => {
      expect(resolveGitManagedPrimaryPath('docs/a.md', ['docs/b.md'])).toBe('docs/a.md');
    });
    it('falls back to the first affected path when primary is not markdown', () => {
      expect(resolveGitManagedPrimaryPath('docs', ['docs/b.md'])).toBe('docs/b.md');
    });
    it('returns null when no markdown candidates exist', () => {
      expect(resolveGitManagedPrimaryPath('docs', [])).toBeNull();
    });
  });

  describe('pathsOverlap', () => {
    it('matches identical and ancestor relationships', () => {
      expect(pathsOverlap('a/b', 'a/b')).toBe(true);
      expect(pathsOverlap('a/b/c', 'a/b')).toBe(true);
      expect(pathsOverlap('a/b', 'a/b/c')).toBe(true);
      expect(pathsOverlap('a/b', 'a/c')).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('returns true for timestamps older than TTL', () => {
      const old = new Date(Date.now() - PRESENCE_TTL_MS - 1000).toISOString();
      expect(isExpired(old)).toBe(true);
    });
    it('returns false for fresh timestamps', () => {
      expect(isExpired(new Date().toISOString())).toBe(false);
    });
  });

  describe('getTimestampMs', () => {
    it('parses ISO strings', () => {
      expect(getTimestampMs('2025-01-01T00:00:00.000Z')).toBe(Date.UTC(2025, 0, 1));
    });
    it('returns 0 for invalid inputs', () => {
      expect(getTimestampMs('not-a-date')).toBe(0);
    });
  });

  describe('hasSameSerializedValue', () => {
    it('compares JSON-equivalent objects', () => {
      expect(hasSameSerializedValue({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(hasSameSerializedValue({ a: 1 }, { a: 2 })).toBe(false);
    });
  });

  describe('buildPresenceKey', () => {
    it('joins userId and sessionId with colon', () => {
      expect(buildPresenceKey('u1', 's1')).toBe('u1:s1');
    });
  });
});

describe('collaboration-sanitizers.util', () => {
  describe('sanitizePublishState', () => {
    it('keeps markdown primary path and de-dupes affected paths', () => {
      const state: DocumentPublishState = {
        path: 'docs/a.md',
        status: 'clean',
        affectedPaths: ['docs/a.md', 'docs/a.md', 'image.png'],
      };
      const sanitized = sanitizePublishState(state);
      expect(sanitized).toEqual({
        ...state,
        affectedPaths: ['docs/a.md'],
      });
    });

    it('falls back to first markdown affected path when primary is not markdown', () => {
      const sanitized = sanitizePublishState({
        path: 'docs',
        status: 'clean',
        affectedPaths: ['docs/a.md'],
      });
      expect(sanitized?.path).toBe('docs/a.md');
    });

    it('returns null when no markdown paths exist', () => {
      const sanitized = sanitizePublishState({
        path: 'image.png',
        status: 'clean',
        affectedPaths: ['image.png'],
      });
      expect(sanitized).toBeNull();
    });
  });

  describe('sanitizeSoftLock', () => {
    it('normalizes the path when markdown', () => {
      const lock: DocumentSoftLock = {
        path: 'docs\\a.md',
        userId: 'u1',
        loginId: 'l1',
        displayName: 'd1',
        email: 'e@x',
        sessionId: 's1',
        acquiredAt: '2025-01-01T00:00:00.000Z',
        lastSeenAt: '2025-01-01T00:00:00.000Z',
      };
      expect(sanitizeSoftLock(lock)?.path).toBe('docs/a.md');
    });
    it('returns null for non-markdown paths', () => {
      expect(
        sanitizeSoftLock({
          path: 'image.png',
          userId: 'u1',
          loginId: 'l1',
          displayName: 'd1',
          email: 'e@x',
          sessionId: 's1',
          acquiredAt: '2025-01-01T00:00:00.000Z',
          lastSeenAt: '2025-01-01T00:00:00.000Z',
        }),
      ).toBeNull();
    });
  });

  describe('sanitizeIsolationState', () => {
    it('falls back to primary path when isolation.path is not markdown', () => {
      const sanitized = sanitizeIsolationState({
        path: 'docs',
        primaryPath: 'docs/a.md',
        status: 'reconcile-needed',
        source: 'publish',
        reasonCode: 'sync-blocked',
        reason: 'r',
        isolatedAt: '2025-01-01T00:00:00.000Z',
        blockedActions: [],
        affectedPaths: ['docs/a.md'],
        releaseStrategy: 'mixed',
      });
      expect(sanitized?.path).toBe('docs/a.md');
      expect(sanitized?.affectedPaths).toEqual(['docs/a.md']);
    });

    it('returns null when no markdown paths exist', () => {
      expect(
        sanitizeIsolationState({
          path: 'image.png',
          primaryPath: 'image.png',
          status: 'reconcile-needed',
          source: 'publish',
          reasonCode: 'sync-blocked',
          reason: 'r',
          isolatedAt: '2025-01-01T00:00:00.000Z',
          blockedActions: [],
          affectedPaths: ['image.png'],
          releaseStrategy: 'mixed',
        }),
      ).toBeNull();
    });
  });

  describe('sanitizePathOverride', () => {
    const base: PathReleaseOverride = {
      path: 'docs\\a.md',
      mode: 'force-lock',
      appliedAt: '2025-01-01T00:00:00.000Z',
      actorUserId: 'u1',
      actorLoginId: 'l1',
      actorDisplayName: 'd1',
    };
    it('normalizes markdown override path', () => {
      expect(sanitizePathOverride(base)?.path).toBe('docs/a.md');
    });
    it('returns null when path is not markdown', () => {
      expect(sanitizePathOverride({ ...base, path: 'image.png' })).toBeNull();
    });
  });
});

describe('collaboration-isolation.util', () => {
  const baseState: DocumentPublishState = {
    path: 'docs/a.md',
    status: 'clean',
    affectedPaths: ['docs/a.md'],
  };

  describe('resolveTrackedPaths', () => {
    it('merges primary, publish, and isolation paths and filters non-markdown', () => {
      const result = resolveTrackedPaths(
        'docs/a.md',
        { ...baseState, affectedPaths: ['docs/a.md', 'docs/b.md'] },
        {
          path: 'docs/a.md',
          primaryPath: 'docs/a.md',
          status: 'reconcile-needed',
          source: 'publish',
          reasonCode: 'sync-blocked',
          reason: 'r',
          isolatedAt: '2025-01-01T00:00:00.000Z',
          blockedActions: [],
          affectedPaths: ['docs/c.md', 'image.png'],
          releaseStrategy: 'mixed',
        },
      );
      expect(result).toEqual(['docs/a.md', 'docs/b.md', 'docs/c.md']);
    });
  });

  describe('shouldAutoReleasePublishIsolation', () => {
    it('returns true when parity is clean and current state is dirty', () => {
      const result = shouldAutoReleasePublishIsolation(
        { ...baseState, status: 'sync-blocked' },
        null,
        {
          success: true,
          data: {
            verified: true,
            clean: true,
            remoteAheadPaths: [],
            localAheadPaths: [],
            workingTreePaths: [],
          } as never,
        },
      );
      expect(result).toBe(true);
    });
    it('returns false when parity is dirty', () => {
      const result = shouldAutoReleasePublishIsolation(baseState, null, {
        success: true,
        data: {
          verified: true,
          clean: false,
          remoteAheadPaths: [],
          localAheadPaths: [],
          workingTreePaths: [],
        } as never,
      });
      expect(result).toBe(false);
    });
    it('returns false when parity inspection failed', () => {
      const result = shouldAutoReleasePublishIsolation(baseState, null, {
        success: false,
        error: 'boom',
      });
      expect(result).toBe(false);
    });
  });

  describe('resolveRefreshStatus', () => {
    const make = (data: Partial<{ verified: boolean; clean: boolean; remoteAheadPaths: string[]; localAheadPaths: string[]; workingTreePaths: string[]; reason?: string }>) => ({
      success: true as const,
      data: {
        verified: true,
        clean: false,
        remoteAheadPaths: [],
        localAheadPaths: [],
        workingTreePaths: [],
        ...data,
      } as never,
    });

    it('keeps current status when parity not verified', () => {
      expect(resolveRefreshStatus(baseState, null, make({ verified: false }))).toBe('clean');
    });
    it('returns clean when parity is clean', () => {
      expect(resolveRefreshStatus({ ...baseState, status: 'sync-blocked' }, null, make({ clean: true }))).toBe('clean');
    });
    it('returns sync-blocked when remote is ahead and we are not clean', () => {
      expect(
        resolveRefreshStatus({ ...baseState, status: 'sync-blocked' }, null, make({ remoteAheadPaths: ['docs/a.md'] })),
      ).toBe('sync-blocked');
    });
    it('returns committed-unpushed when only local is ahead', () => {
      expect(resolveRefreshStatus(baseState, null, make({ localAheadPaths: ['docs/a.md'] }))).toBe('committed-unpushed');
    });
    it('returns dirty-uncommitted when working tree has changes', () => {
      expect(resolveRefreshStatus(baseState, null, make({ workingTreePaths: ['docs/a.md'] }))).toBe('dirty-uncommitted');
    });
  });

  describe('resolveRefreshError', () => {
    it('returns parity error on failure', () => {
      expect(resolveRefreshError(baseState, { success: false, error: 'boom' })).toBe('boom');
    });
    it('returns undefined when parity is clean', () => {
      expect(
        resolveRefreshError(baseState, {
          success: true,
          data: { verified: true, clean: true, reason: undefined } as never,
        }),
      ).toBeUndefined();
    });
    it('falls back to lastError when reason is missing', () => {
      expect(
        resolveRefreshError(
          { ...baseState, lastError: 'prev' },
          { success: true, data: { verified: true, clean: false } as never },
        ),
      ).toBe('prev');
    });
  });

  describe('buildOperatorLockIsolation', () => {
    const override: PathReleaseOverride = {
      path: 'docs/a.md',
      mode: 'force-lock',
      appliedAt: '2025-01-01T00:00:00.000Z',
      actorUserId: 'u1',
      actorLoginId: 'l1',
      actorDisplayName: 'Alice',
    };
    it('produces a manual force-locked isolation', () => {
      const isolation = buildOperatorLockIsolation(override);
      expect(isolation.status).toBe('force-locked');
      expect(isolation.source).toBe('operator');
      expect(isolation.releaseStrategy).toBe('manual');
      expect(isolation.affectedPaths).toEqual(['docs/a.md']);
      expect(isolation.blockedActions).toEqual([...BLOCKED_MUTATION_ACTIONS]);
    });
    it('uses provided reason when non-empty', () => {
      expect(buildOperatorLockIsolation({ ...override, reason: 'maintenance' }).reason).toBe('maintenance');
    });
    it('falls back to default reason when override.reason is empty', () => {
      expect(buildOperatorLockIsolation({ ...override, reason: '   ' }).reason).toContain('Alice(l1)');
    });
  });

  describe('isForceUnlockActive', () => {
    const isolation: DocumentIsolationState = {
      path: 'docs/a.md',
      primaryPath: 'docs/a.md',
      status: 'reconcile-needed',
      source: 'publish',
      reasonCode: 'sync-blocked',
      reason: 'r',
      isolatedAt: '2025-01-01T00:00:00.000Z',
      blockedActions: [],
      affectedPaths: ['docs/a.md'],
      releaseStrategy: 'mixed',
    };
    const overrideAt = (iso: string): PathReleaseOverride => ({
      path: 'docs/a.md',
      mode: 'force-unlock',
      appliedAt: iso,
      actorUserId: 'u1',
      actorLoginId: 'l1',
      actorDisplayName: 'd1',
    });
    it('returns true when override is at or after isolation', () => {
      expect(isForceUnlockActive(overrideAt('2025-01-02T00:00:00.000Z'), isolation)).toBe(true);
      expect(isForceUnlockActive(overrideAt(isolation.isolatedAt), isolation)).toBe(true);
    });
    it('returns false when override predates isolation', () => {
      expect(isForceUnlockActive(overrideAt('2024-12-31T00:00:00.000Z'), isolation)).toBe(false);
    });
  });

  describe('buildIsolationException', () => {
    const isolation: DocumentIsolationState = {
      path: 'docs/a.md',
      primaryPath: 'docs/a.md',
      status: 'reconcile-needed',
      source: 'publish',
      reasonCode: 'sync-blocked',
      reason: 'r',
      isolatedAt: '2025-01-01T00:00:00.000Z',
      blockedActions: [],
      affectedPaths: ['docs/a.md'],
      releaseStrategy: 'mixed',
    };
    it('throws a 423 HttpException with publish-source message', () => {
      const ex = buildIsolationException('write', 'docs/a.md', isolation);
      expect(ex.getStatus()).toBe(423);
      const body = ex.getResponse() as { error: string; details: { isolation: DocumentIsolationState } };
      expect(body.error).toContain('reconcile');
      expect(body.details.isolation).toEqual(isolation);
    });
    it('uses operator-specific message when source is operator', () => {
      const ex = buildIsolationException('write', 'docs/a.md', { ...isolation, source: 'operator' });
      const body = ex.getResponse() as { error: string };
      expect(body.error).toContain('운영자');
    });
  });
});
