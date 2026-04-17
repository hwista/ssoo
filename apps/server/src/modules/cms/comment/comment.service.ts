import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessService } from '../access/access.service.js';

@Injectable()
export class CommentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessService: AccessService,
  ) {}

  async findByPost(postId: bigint, user: TokenPayload) {
    await this.accessService.assertReadablePost(user, postId);

    return this.db.client.cmsComment.findMany({
      where: { postId, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { reactions: true } },
      },
    });
  }

  async create(postId: bigint, dto: CreateCommentDto, user: TokenPayload) {
    await this.accessService.assertReadablePost(user, postId);

    const authorUserId = BigInt(user.userId);
    let depth = 0;
    if (dto.parentCommentId) {
      const parent = await this.db.client.cmsComment.findUnique({
        where: { id: BigInt(dto.parentCommentId) },
      });
      if (!parent || !parent.isActive) {
        throw new NotFoundException(`Parent comment ${dto.parentCommentId} not found`);
      }
      depth = parent.depth + 1;
    }

    return this.db.client.cmsComment.create({
      data: {
        postId,
        authorUserId,
        parentCommentId: dto.parentCommentId ? BigInt(dto.parentCommentId) : null,
        content: dto.content,
        depth,
      },
    });
  }

  async update(id: bigint, dto: UpdateCommentDto, user: TokenPayload) {
    const existing = await this.db.client.cmsComment.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Comment ${id} not found`);
    }

    await this.accessService.assertReadablePost(user, existing.postId);
    await this.accessService.assertSameUserOrOverride(
      user,
      existing.authorUserId,
      '본인이 작성한 댓글만 수정할 수 있습니다.',
    );

    return this.db.client.cmsComment.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
      },
    });
  }

  async softDelete(id: bigint, user: TokenPayload) {
    const existing = await this.db.client.cmsComment.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Comment ${id} not found`);
    }

    await this.accessService.assertReadablePost(user, existing.postId);
    await this.accessService.assertSameUserOrOverride(
      user,
      existing.authorUserId,
      '본인이 작성한 댓글만 삭제할 수 있습니다.',
    );

    return this.db.client.cmsComment.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
