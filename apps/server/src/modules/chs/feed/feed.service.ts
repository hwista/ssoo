import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { FeedQueryDto, ReactionDto } from './dto/feed.dto.js';
import { NotificationService } from '../notification/notification.service.js';

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: NotificationService,
  ) {}

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

    const reaction = await this.db.client.chReaction.create({
      data: { userId, postId, reactionType },
    });

    void this.notifyReaction(post.authorUserId, userId, postId);

    return reaction;
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

  private async notifyReaction(
    recipientUserId: bigint,
    actorUserId: bigint,
    postId: bigint,
  ) {
    try {
      if (recipientUserId === actorUserId) {
        return;
      }

      const actor = await this.db.client.user.findUnique({
        where: { id: actorUserId },
        select: { displayName: true, userName: true },
      });

      const actorName = actor?.displayName || actor?.userName || '누군가';

      await this.notificationService.createNotification({
        recipientUserId,
        actorUserId,
        notificationType: 'REACTION',
        referenceType: 'post',
        referenceId: postId,
        message: `${actorName}님이 회원님의 게시물에 반응했습니다.`,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to create reaction notification for post ${postId.toString()}: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }
}
