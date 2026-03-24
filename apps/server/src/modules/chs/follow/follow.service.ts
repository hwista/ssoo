import { Injectable, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { FollowPaginationDto } from './dto/follow.dto.js';
import { NotificationService } from '../notification/notification.service.js';

@Injectable()
export class FollowService {
  private readonly logger = new Logger(FollowService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: NotificationService,
  ) {}

  async follow(followerUserId: bigint, followingUserId: bigint) {
    const existing = await this.db.client.chFollow.findFirst({
      where: { followerUserId, followingUserId },
    });
    if (existing) {
      throw new ConflictException('Already following this user');
    }

    const follow = await this.db.client.chFollow.create({
      data: { followerUserId, followingUserId },
    });

    void this.notifyFollow(followerUserId, followingUserId);

    return follow;
  }

  async unfollow(followerUserId: bigint, followingUserId: bigint) {
    const existing = await this.db.client.chFollow.findFirst({
      where: { followerUserId, followingUserId },
    });
    if (!existing) {
      throw new NotFoundException('Follow relationship not found');
    }

    return this.db.client.chFollow.delete({
      where: { id: existing.id },
    });
  }

  async getFollowers(userId: bigint, params: FollowPaginationDto) {
    const pageValue = Number(params.page);
    const pageSizeValue = Number(params.pageSize);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : 20;
    const skip = (page - 1) * pageSize;

    const where = { followingUserId: userId };

    const [data, total] = await Promise.all([
      this.db.client.chFollow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.chFollow.count({ where }),
    ]);

    const followerIds = data.map((follow) => follow.followerUserId);
    const users = followerIds.length > 0
      ? await this.db.client.user.findMany({
          where: { id: { in: followerIds } },
          select: {
            id: true,
            userName: true,
            displayName: true,
            avatarUrl: true,
          },
        })
      : [];
    const userMap = new Map(users.map((item) => [item.id.toString(), item]));
    const items = data.flatMap((follow) => {
      const user = userMap.get(follow.followerUserId.toString());
      if (!user) {
        return [];
      }
      return [{
        userId: user.id,
        userName: user.userName,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      }];
    });

    return { data: items, total, page, pageSize };
  }

  async getFollowing(userId: bigint, params: FollowPaginationDto) {
    const pageValue = Number(params.page);
    const pageSizeValue = Number(params.pageSize);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : 20;
    const skip = (page - 1) * pageSize;

    const where = { followerUserId: userId };

    const [data, total] = await Promise.all([
      this.db.client.chFollow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.chFollow.count({ where }),
    ]);

    const followingIds = data.map((follow) => follow.followingUserId);
    const users = followingIds.length > 0
      ? await this.db.client.user.findMany({
          where: { id: { in: followingIds } },
          select: {
            id: true,
            userName: true,
            displayName: true,
            avatarUrl: true,
          },
        })
      : [];
    const userMap = new Map(users.map((item) => [item.id.toString(), item]));
    const items = data.flatMap((follow) => {
      const user = userMap.get(follow.followingUserId.toString());
      if (!user) {
        return [];
      }
      return [{
        userId: user.id,
        userName: user.userName,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      }];
    });

    return { data: items, total, page, pageSize };
  }

  private async notifyFollow(
    followerUserId: bigint,
    followingUserId: bigint,
  ) {
    try {
      if (followerUserId === followingUserId) {
        return;
      }

      const actor = await this.db.client.user.findUnique({
        where: { id: followerUserId },
        select: { displayName: true, userName: true },
      });

      const actorName = actor?.displayName || actor?.userName || '누군가';

      await this.notificationService.createNotification({
        recipientUserId: followingUserId,
        actorUserId: followerUserId,
        notificationType: 'FOLLOW',
        referenceType: 'user',
        referenceId: followerUserId,
        message: `${actorName}님이 회원님을 팔로우했습니다.`,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to create follow notification for user ${followingUserId.toString()}: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }
}
