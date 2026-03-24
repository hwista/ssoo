import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto.js';
import { NotificationService } from '../notification/notification.service.js';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: NotificationService,
  ) {}

  async findByPost(postId: bigint) {
    return this.db.client.chComment.findMany({
      where: { postId, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { reactions: true } },
      },
    });
  }

  async create(postId: bigint, dto: CreateCommentDto, authorUserId: bigint) {
    let depth = 0;
    if (dto.parentCommentId) {
      const parent = await this.db.client.chComment.findUnique({
        where: { id: BigInt(dto.parentCommentId) },
      });
      if (!parent || !parent.isActive) {
        throw new NotFoundException(`Parent comment ${dto.parentCommentId} not found`);
      }
      depth = parent.depth + 1;
    }

    const comment = await this.db.client.chComment.create({
      data: {
        postId,
        authorUserId,
        parentCommentId: dto.parentCommentId ? BigInt(dto.parentCommentId) : null,
        content: dto.content,
        depth,
      },
    });

    void this.notifyPostAuthor(postId, authorUserId);

    return comment;
  }

  async update(id: bigint, dto: UpdateCommentDto) {
    const existing = await this.db.client.chComment.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Comment ${id} not found`);
    }

    return this.db.client.chComment.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
      },
    });
  }

  async softDelete(id: bigint) {
    const existing = await this.db.client.chComment.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Comment ${id} not found`);
    }

    return this.db.client.chComment.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async notifyPostAuthor(postId: bigint, actorUserId: bigint) {
    try {
      const [post, actor] = await Promise.all([
        this.db.client.chPost.findUnique({
          where: { id: postId },
          select: { authorUserId: true },
        }),
        this.db.client.user.findUnique({
          where: { id: actorUserId },
          select: { displayName: true, userName: true },
        }),
      ]);

      if (!post || post.authorUserId === actorUserId) {
        return;
      }

      const actorName = actor?.displayName || actor?.userName || '누군가';

      await this.notificationService.createNotification({
        recipientUserId: post.authorUserId,
        actorUserId,
        notificationType: 'COMMENT',
        referenceType: 'post',
        referenceId: postId,
        message: `${actorName}님이 회원님의 게시물에 댓글을 남겼습니다.`,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to create comment notification for post ${postId.toString()}: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }
}
