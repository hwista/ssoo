import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { FeedQueryDto, ReactionDto } from './dto/feed.dto.js';

@Injectable()
export class FeedService {
  constructor(private readonly db: DatabaseService) {}

  async getTimeline(userId: bigint, params: FeedQueryDto) {
    const limitValue = Number(params.limit);
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 20;

    const where: Record<string, unknown> = { isActive: true };

    if (params.feedType === 'following') {
      const followings = await this.db.client.chFollow.findMany({
        where: { followerUserId: userId },
        select: { followingUserId: true },
      });
      const followingIds = followings.map((f) => f.followingUserId);
      // Include own posts and followed users' posts
      where.authorUserId = { in: [userId, ...followingIds] };
    }

    if (params.cursor) {
      where.id = { lt: BigInt(params.cursor) };
    }

    const data = await this.db.client.chPost.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        postTags: { include: { tag: true } },
        _count: { select: { comments: true, reactions: true, bookmarks: true } },
      },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id.toString() : null;

    return { items, nextCursor, hasMore };
  }

  async addReaction(userId: bigint, postId: bigint, dto: ReactionDto) {
    const post = await this.db.client.chPost.findUnique({ where: { id: postId } });
    if (!post || !post.isActive) {
      throw new NotFoundException(`Post ${postId} not found`);
    }

    const reactionType = dto.reactionType ?? 'like';

    const existing = await this.db.client.chReaction.findFirst({
      where: { userId, postId, reactionType },
    });
    if (existing) {
      throw new ConflictException('Reaction already exists');
    }

    return this.db.client.chReaction.create({
      data: { userId, postId, reactionType },
    });
  }

  async removeReaction(userId: bigint, postId: bigint) {
    const existing = await this.db.client.chReaction.findFirst({
      where: { userId, postId },
    });
    if (!existing) {
      throw new NotFoundException('Reaction not found');
    }

    return this.db.client.chReaction.delete({
      where: { id: existing.id },
    });
  }

  async addBookmark(userId: bigint, postId: bigint) {
    const post = await this.db.client.chPost.findUnique({ where: { id: postId } });
    if (!post || !post.isActive) {
      throw new NotFoundException(`Post ${postId} not found`);
    }

    const existing = await this.db.client.chBookmark.findFirst({
      where: { userId, postId },
    });
    if (existing) {
      throw new ConflictException('Bookmark already exists');
    }

    return this.db.client.chBookmark.create({
      data: { userId, postId },
    });
  }

  async removeBookmark(userId: bigint, postId: bigint) {
    const existing = await this.db.client.chBookmark.findFirst({
      where: { userId, postId },
    });
    if (!existing) {
      throw new NotFoundException('Bookmark not found');
    }

    return this.db.client.chBookmark.delete({
      where: { id: existing.id },
    });
  }
}
