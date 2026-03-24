import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto.js';

@Injectable()
export class CommentService {
  constructor(private readonly db: DatabaseService) {}

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

    return this.db.client.chComment.create({
      data: {
        postId,
        authorUserId,
        parentCommentId: dto.parentCommentId ? BigInt(dto.parentCommentId) : null,
        content: dto.content,
        depth,
      },
    });
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
}
