import 'reflect-metadata';
import { jest } from '@jest/globals';
import { FeedService } from './feed.service.js';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AccessService } from '../access/access.service.js';
import type { CommonNotificationService } from '../../common/notification/notification.service.js';
import { NotFoundException } from '@nestjs/common';

describe('feed comment count', () => {
  it.each([undefined, '7'])('counts only visible comments while preserving post visibility and author filter %s', async (authorUserId) => {
    const calls: unknown[] = [];
    const visibility = { isActive: true, visibilityScopeCode: 'public' };
    const db = {
      client: { snsPost: { findMany: async (query: unknown) => { calls.push(query); return []; } } },
    } as unknown as DatabaseService;
    const access = { buildVisiblePostWhere: async () => visibility } as unknown as AccessService;
    const service = new FeedService(db, access, {} as CommonNotificationService);
    expect(await service.getTimeline({ userId: '3', loginId: 'reader' }, { authorUserId, cursor: '42', limit: 10 }))
      .toEqual({ items: [], nextCursor: null, hasMore: false });
    expect(calls).toEqual([{
      where: { AND: [visibility, { id: { lt: 42n }, ...(authorUserId ? { authorUserId: 7n } : {}) }] },
      take: 11, orderBy: { createdAt: 'desc' },
      include: { postTags: { include: { tag: true } }, attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true }, orderBy: { sortOrder: 'asc' } }, _count: { select: {
        comments: { where: { isActive: true } }, reactions: true, bookmarks: true,
      } } },
    }]);
  });
});

describe('shared post card', () => {
  const user = { userId: '3', loginId: 'reader' };
  const visibility = { isActive: true, OR: [{ visibilityScopeCode: 'public' }, { authorUserId: 3n }] };
  function setup(found = true) {
    const row = { id: 7n, authorUserId: 2n, content: 'shared post', title: null, visibilityScopeCode: 'public',
      viewCount: 19, postTags: [{ tag: { tagName: 'tag' } }], _count: { comments: 2, reactions: 1, bookmarks: 1 } };
    const findFirst = jest.fn(async () => found ? row : null);
    const author = { id: 2n, userName: 'writer', displayName: '작성자', avatarUrl: null, departmentCode: null, positionCode: null };
    const authors = jest.fn(async () => [author]);
    const reactions = jest.fn(async () => [{ postId: 7n }]);
    const bookmarks = jest.fn(async () => [{ postId: 7n }]);
    const update = jest.fn();
    const db = { user: { findMany: authors }, client: { snsPost: { findFirst, update },
      snsReaction: { findMany: reactions }, snsBookmark: { findMany: bookmarks } } } as unknown as DatabaseService;
    const policy = jest.fn(async () => visibility);
    const service = new FeedService(db, { buildVisiblePostWhere: policy } as unknown as AccessService, {} as CommonNotificationService);
    return { service, findFirst, authors, reactions, bookmarks, update, policy, author };
  }

  it('returns one readable card with current-user reactions, active comments and no view mutation', async () => {
    const s = setup();
    const item = await s.service.getPost(user, '7');
    expect(item).toMatchObject({ post: { id: 7n, content: 'shared post', viewCount: 19 }, author: s.author,
      commentCount: 2, reactionCount: 1, isLiked: true, isBookmarked: true, tags: ['tag'] });
    expect(s.policy).toHaveBeenCalledWith(user);
    expect(s.findFirst).toHaveBeenCalledWith({ where: { AND: [visibility, { id: 7n }] }, include: {
      postTags: { include: { tag: true } }, attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true }, orderBy: { sortOrder: 'asc' } }, _count: { select: { comments: { where: { isActive: true } }, reactions: true, bookmarks: true } },
    } });
    for (const query of [s.reactions, s.bookmarks]) expect(query).toHaveBeenCalledWith({
      where: { userId: 3n, postId: { in: [7n] } }, select: { postId: true },
    });
    expect(s.update).not.toHaveBeenCalled();
  });

  it('returns the same unavailable error without loading author or reactions for a filtered-out post', async () => {
    const s = setup(false);
    await expect(s.service.getPost(user, '7')).rejects.toThrow(new NotFoundException('게시물을 볼 수 없습니다.'));
    expect(s.authors).not.toHaveBeenCalled();
    expect(s.reactions).not.toHaveBeenCalled();
    expect(s.bookmarks).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '1.5', '01', 'abc', '9223372036854775808', '9'.repeat(200)])('rejects invalid identifier %s before any database read', async (id) => {
    const s = setup();
    await expect(s.service.getPost(user, id)).rejects.toBeInstanceOf(NotFoundException);
    expect(s.policy).not.toHaveBeenCalled();
    expect(s.findFirst).not.toHaveBeenCalled();
  });
});
