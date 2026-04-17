import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { FollowPaginationDto } from './dto/follow.dto.js';

@Injectable()
export class FollowService {
  constructor(private readonly db: DatabaseService) {}

  async follow(followerUserId: bigint, followingUserId: bigint) {
    const existing = await this.db.client.cmsFollow.findFirst({
      where: { followerUserId, followingUserId },
    });
    if (existing) {
      throw new ConflictException('Already following this user');
    }

    return this.db.client.cmsFollow.create({
      data: { followerUserId, followingUserId },
    });
  }

  async unfollow(followerUserId: bigint, followingUserId: bigint) {
    const existing = await this.db.client.cmsFollow.findFirst({
      where: { followerUserId, followingUserId },
    });
    if (!existing) {
      throw new NotFoundException('Follow relationship not found');
    }

    return this.db.client.cmsFollow.delete({
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
      this.db.client.cmsFollow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.cmsFollow.count({ where }),
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
      this.db.client.cmsFollow.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.cmsFollow.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}
