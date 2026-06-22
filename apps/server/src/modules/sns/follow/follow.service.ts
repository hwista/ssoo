import { BadRequestException, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { FollowPaginationDto } from './dto/follow.dto.js';
import { CommonNotificationService } from '../../common/notification/notification.service.js';

@Injectable()
export class FollowService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: CommonNotificationService,
  ) {}

  async follow(followerUserId: bigint, followingUserId: bigint) {
    if (followerUserId === followingUserId) {
      throw new BadRequestException('자기 자신은 팔로우할 수 없습니다.');
    }

    const existing = await this.db.client.snsFollow.findFirst({
      where: { followerUserId, followingUserId },
    });
    if (existing) {
      throw new ConflictException('Already following this user');
    }

    const follow = await this.db.client.snsFollow.create({
      data: { followerUserId, followingUserId },
    });
    this.publishFollowChanged(followerUserId, followingUserId);
    return follow;
  }

  async unfollow(followerUserId: bigint, followingUserId: bigint) {
    const existing = await this.db.client.snsFollow.findFirst({
      where: { followerUserId, followingUserId },
    });
    if (!existing) {
      throw new NotFoundException('Follow relationship not found');
    }

    const deleted = await this.db.client.snsFollow.delete({
      where: { id: existing.id },
    });
    this.publishFollowChanged(followerUserId, followingUserId);
    return deleted;
  }

  private publishFollowChanged(followerUserId: bigint, followingUserId: bigint): void {
    this.notificationService.publishDomainEvent('sns', 'sns.follow.changed', {
      actorUserId: followerUserId.toString(),
      userId: followingUserId.toString(),
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
      this.db.client.snsFollow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.snsFollow.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async getFollowing(userId: bigint, params: FollowPaginationDto) {
    const pageValue = Number(params.page);
    const pageSizeValue = Number(params.pageSize);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : 20;
    const skip = (page - 1) * pageSize;

    const where = { followerUserId: userId };

    const [data, total] = await Promise.all([
      this.db.client.snsFollow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.snsFollow.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}
