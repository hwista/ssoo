import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import type { FeedQueryDto, ReactionDto } from './dto/feed.dto.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessService } from '../access/access.service.js';

type TimelinePostRecord = Prisma.SnsPostGetPayload<{
  include: {
    postTags: { include: { tag: true } };
    _count: { select: { comments: true; reactions: true; bookmarks: true } };
  };
}>;

@Injectable()
export class FeedService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessService: AccessService,
  ) {}

  async getTimeline(user: TokenPayload, params: FeedQueryDto) {
    const userId = BigInt(user.userId);
    const limitValue = Number(params.limit);
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 20;
    const visibilityWhere = await this.accessService.buildVisiblePostWhere(user);

    const feedWhere: Prisma.SnsPostWhereInput = {};

    if (params.feedType === 'following') {
      const followings = await this.db.client.snsFollow.findMany({
        where: { followerUserId: userId },
        select: { followingUserId: true },
      });
      const followingIds = followings.map((f) => f.followingUserId);
      feedWhere.authorUserId = { in: [userId, ...followingIds] };
    }

    if (params.cursor) {
      feedWhere.id = { lt: BigInt(params.cursor) };
    }

    const where: Prisma.SnsPostWhereInput = {
      AND: [visibilityWhere, feedWhere],
    };

    const data = await this.db.client.snsPost.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        postTags: { include: { tag: true } },
        _count: { select: { comments: true, reactions: true, bookmarks: true } },
      },
    });

    const hasMore = data.length > limit;
    const postRecords = hasMore ? data.slice(0, limit) : data;
    const nextCursor =
      hasMore && postRecords.length > 0 ? postRecords[postRecords.length - 1].id.toString() : null;
    const items = await this.buildTimelineItems(postRecords, userId);

    return { items, nextCursor, hasMore };
  }

  async addReaction(user: TokenPayload, postId: bigint, dto: ReactionDto) {
    const userId = BigInt(user.userId);
    await this.accessService.assertReadablePost(user, postId);

    const reactionType = dto.reactionType ?? 'like';

    const existing = await this.db.client.snsReaction.findFirst({
      where: { userId, postId, reactionType },
    });
    if (existing) {
      throw new ConflictException('Reaction already exists');
    }

    return this.db.client.snsReaction.create({
      data: { userId, postId, reactionType },
    });
  }

  async removeReaction(user: TokenPayload, postId: bigint) {
    const userId = BigInt(user.userId);
    await this.accessService.assertReadablePost(user, postId);

    const existing = await this.db.client.snsReaction.findFirst({
      where: { userId, postId },
    });
    if (!existing) {
      throw new NotFoundException('Reaction not found');
    }

    return this.db.client.snsReaction.delete({
      where: { id: existing.id },
    });
  }

  async addBookmark(user: TokenPayload, postId: bigint) {
    const userId = BigInt(user.userId);
    await this.accessService.assertReadablePost(user, postId);

    const existing = await this.db.client.snsBookmark.findFirst({
      where: { userId, postId },
    });
    if (existing) {
      throw new ConflictException('Bookmark already exists');
    }

    return this.db.client.snsBookmark.create({
      data: { userId, postId },
    });
  }

  async removeBookmark(user: TokenPayload, postId: bigint) {
    const userId = BigInt(user.userId);
    await this.accessService.assertReadablePost(user, postId);

    const existing = await this.db.client.snsBookmark.findFirst({
      where: { userId, postId },
    });
    if (!existing) {
      throw new NotFoundException('Bookmark not found');
    }

    return this.db.client.snsBookmark.delete({
      where: { id: existing.id },
    });
  }

  private async buildTimelineItems(postRecords: TimelinePostRecord[], userId: bigint) {
    if (postRecords.length === 0) {
      return [];
    }

    const postIds = postRecords.map((post) => post.id);
    const authorUserIds = [...new Set(postRecords.map((post) => post.authorUserId.toString()))].map(
      (authorUserId) => BigInt(authorUserId),
    );

    const [authors, likedPosts, bookmarkedPosts] = await Promise.all([
      this.db.user.findMany({
        where: {
          id: { in: authorUserIds },
        },
        select: {
          id: true,
          userName: true,
          displayName: true,
          avatarUrl: true,
          departmentCode: true,
          positionCode: true,
        },
      }),
      this.db.client.snsReaction.findMany({
        where: {
          userId,
          postId: { in: postIds },
        },
        select: {
          postId: true,
        },
      }),
      this.db.client.snsBookmark.findMany({
        where: {
          userId,
          postId: { in: postIds },
        },
        select: {
          postId: true,
        },
      }),
    ]);

    const authorById = new Map(
      authors.map((author) => [author.id.toString(), author] as const),
    );
    const likedPostIds = new Set(
      likedPosts
        .filter(
          (reaction): reaction is typeof reaction & { postId: bigint } => reaction.postId !== null,
        )
        .map((reaction) => reaction.postId.toString()),
    );
    const bookmarkedPostIds = new Set(
      bookmarkedPosts
        .filter(
          (bookmark): bookmark is typeof bookmark & { postId: bigint } => bookmark.postId !== null,
        )
        .map((bookmark) => bookmark.postId.toString()),
    );

    return postRecords.map((post) => {
      const author = authorById.get(post.authorUserId.toString());

      return {
        post: {
          id: post.id,
          authorUserId: post.authorUserId,
          title: post.title,
          content: post.content,
          contentType: post.contentType,
          visibilityScopeCode: post.visibilityScopeCode,
          targetOrgId: post.targetOrgId,
          isPinned: post.isPinned,
          viewCount: post.viewCount,
          boardId: post.boardId,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        },
        author: {
          id: post.authorUserId,
          userName: author?.userName ?? 'unknown',
          displayName: author?.displayName ?? null,
          avatarUrl: author?.avatarUrl ?? null,
          departmentCode: author?.departmentCode ?? null,
          positionCode: author?.positionCode ?? null,
        },
        reactionCount: post._count.reactions,
        commentCount: post._count.comments,
        isLiked: likedPostIds.has(post.id.toString()),
        isBookmarked: bookmarkedPostIds.has(post.id.toString()),
        tags: post.postTags.map((postTag) => postTag.tag.tagName),
      };
    });
  }
}
