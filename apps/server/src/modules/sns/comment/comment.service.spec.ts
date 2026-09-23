import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { CommentService } from './comment.service.js';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AccessService } from '../access/access.service.js';
import type { CommonNotificationService } from '../../common/notification/notification.service.js';

interface Parent { id: bigint; postId: bigint; isActive: boolean; depth: number }

function fixture(parent: Parent | null, readable = true) {
  const calls = { parents: 0, creates: [] as unknown[], events: 0 };
  const db = { client: {
    snsComment: {
      findUnique: async () => { calls.parents++; return parent; },
      create: async (args: { data: unknown }) => { calls.creates.push(args.data); return { id: 100n, ...args }; },
    },
    snsPost: { findUnique: async () => ({ authorUserId: 1n }) },
  } } as unknown as DatabaseService;
  const access = { assertReadablePost: async () => { if (!readable) throw new NotFoundException('Post not found'); } } as unknown as AccessService;
  const notifications = { publishDomainEvent: () => { calls.events++; } } as unknown as CommonNotificationService;
  return { calls, service: new CommentService(db, access, notifications) };
}

const user = { userId: '3', loginId: 'writer' };
const parent: Parent = { id: 99n, postId: 10n, isActive: true, depth: 0 };

describe('reply parent belongs to the target post', () => {
  it.each([
    ['missing', null],
    ['inactive', { ...parent, isActive: false }],
    ['another post', { ...parent, postId: 11n }],
  ] as const)('rejects %s parent without saving or publishing', async (_name, record) => {
    const f = fixture(record);
    await expect(f.service.create(10n, { content: 'reply', parentCommentId: '99' }, user))
      .rejects.toThrow(new NotFoundException('Parent comment 99 not found'));
    expect(f.calls.creates).toEqual([]);
    expect(f.calls.events).toBe(0);
  });

  it.each([0, 2])('preserves a same-post reply to depth %s', async (depth) => {
    const f = fixture({ ...parent, depth });
    await f.service.create(10n, { content: 'reply', parentCommentId: '99' }, user);
    expect(f.calls.creates).toEqual([{ postId: 10n, authorUserId: 3n, parentCommentId: 99n, content: 'reply', depth: depth + 1 }]);
    expect(f.calls.events).toBe(1);
  });

  it('preserves ordinary comments without looking up a parent', async () => {
    const f = fixture(null);
    await f.service.create(10n, { content: 'ordinary' }, user);
    expect(f.calls.parents).toBe(0);
    expect(f.calls.creates).toEqual([{ postId: 10n, authorUserId: 3n, parentCommentId: null, content: 'ordinary', depth: 0 }]);
    expect(f.calls.events).toBe(1);
  });

  it('checks post visibility before looking up the parent', async () => {
    const f = fixture(parent, false);
    await expect(f.service.create(10n, { content: 'reply', parentCommentId: '99' }, user)).rejects.toThrow('Post not found');
    expect(f.calls).toEqual({ parents: 0, creates: [], events: 0 });
  });

  it('compares post identifiers without numeric precision loss', async () => {
    const f = fixture({ ...parent, postId: 9007199254740992n });
    await expect(f.service.create(9007199254740993n, { content: 'reply', parentCommentId: '99' }, user)).rejects.toThrow(NotFoundException);
    expect(f.calls.creates).toEqual([]);
  });
});
