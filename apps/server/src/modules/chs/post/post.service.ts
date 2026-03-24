import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreatePostDto, UpdatePostDto, FindPostsDto } from './dto/post.dto.js';

@Injectable()
export class PostService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(params: FindPostsDto) {
    const pageValue = Number(params.page);
    const pageSizeValue = Number(params.pageSize);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : 20;
    const skip = (page - 1) * pageSize;

    const where = {
      isActive: true,
      ...(params.boardId && { boardId: BigInt(params.boardId) }),
      ...(params.authorUserId && { authorUserId: BigInt(params.authorUserId) }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' as const } },
          { content: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.client.chPost.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          postTags: { include: { tag: true } },
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      this.db.client.chPost.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(id: bigint, currentUserId: bigint) {
    const post = await this.db.client.chPost.findUnique({
      where: { id },
      include: {
        board: {
          select: {
            id: true,
            boardName: true,
          },
        },
        postTags: { include: { tag: true } },
        _count: { select: { comments: true, reactions: true, bookmarks: true } },
      },
    });
    if (!post || !post.isActive) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    // Increment view count
    await this.db.client.chPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    const [author, liked, bookmarked] = await Promise.all([
      this.db.client.user.findUnique({
        where: { id: post.authorUserId },
        select: {
          id: true,
          userName: true,
          displayName: true,
          avatarUrl: true,
          departmentCode: true,
          positionCode: true,
        },
      }),
      this.db.client.chReaction.findFirst({
        where: { postId: id, userId: currentUserId },
        select: { id: true },
      }),
      this.db.client.chBookmark.findFirst({
        where: { postId: id, userId: currentUserId },
        select: { id: true },
      }),
    ]);

    return {
      ...post,
      viewCount: post.viewCount + 1,
      author,
      tags: post.postTags.map((entry) => entry.tag.tagName),
      reactionCount: post._count.reactions,
      commentCount: post._count.comments,
      bookmarkCount: post._count.bookmarks,
      isLiked: Boolean(liked),
      isBookmarked: Boolean(bookmarked),
    };
  }

  async create(dto: CreatePostDto, authorUserId: bigint) {
    return this.db.client.$transaction(async (tx) => {
      const post = await tx.chPost.create({
        data: {
          authorUserId,
          title: dto.title ?? null,
          content: dto.content,
          contentType: dto.contentType ?? 'text',
          boardId: dto.boardId ? BigInt(dto.boardId) : null,
          categoryId: dto.categoryId ? BigInt(dto.categoryId) : null,
        },
      });

      if (dto.tagNames && dto.tagNames.length > 0) {
        for (const tagName of dto.tagNames) {
          const tag = await tx.chTag.upsert({
            where: { tagName },
            create: { tagName },
            update: { usageCount: { increment: 1 } },
          });
          await tx.chPostTag.create({
            data: { postId: post.id, tagId: tag.id },
          });
        }
      }

      return tx.chPost.findUnique({
        where: { id: post.id },
        include: {
          postTags: { include: { tag: true } },
        },
      });
    });
  }

  async update(id: bigint, dto: UpdatePostDto) {
    const existing = await this.db.client.chPost.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    return this.db.client.$transaction(async (tx) => {
      const post = await tx.chPost.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.content !== undefined && { content: dto.content }),
          ...(dto.contentType !== undefined && { contentType: dto.contentType }),
          ...(dto.boardId !== undefined && { boardId: dto.boardId ? BigInt(dto.boardId) : null }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId ? BigInt(dto.categoryId) : null }),
        },
      });

      if (dto.tagNames !== undefined) {
        await tx.chPostTag.deleteMany({ where: { postId: id } });
        for (const tagName of dto.tagNames) {
          const tag = await tx.chTag.upsert({
            where: { tagName },
            create: { tagName },
            update: { usageCount: { increment: 1 } },
          });
          await tx.chPostTag.create({
            data: { postId: id, tagId: tag.id },
          });
        }
      }

      return tx.chPost.findUnique({
        where: { id: post.id },
        include: {
          postTags: { include: { tag: true } },
        },
      });
    });
  }

  async softDelete(id: bigint) {
    const existing = await this.db.client.chPost.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    return this.db.client.chPost.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
