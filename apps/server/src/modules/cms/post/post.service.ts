import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreatePostDto, UpdatePostDto, FindPostsDto } from './dto/post.dto.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessService } from '../access/access.service.js';

@Injectable()
export class PostService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessService: AccessService,
  ) {}

  async findAll(params: FindPostsDto, user: TokenPayload) {
    const pageValue = Number(params.page);
    const pageSizeValue = Number(params.pageSize);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : 20;
    const skip = (page - 1) * pageSize;

    const visibilityWhere = await this.accessService.buildVisiblePostWhere(user);
    const filterWhere: Prisma.CmsPostWhereInput = {
      ...(params.boardId && { boardId: BigInt(params.boardId) }),
      ...(params.authorUserId && { authorUserId: BigInt(params.authorUserId) }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' as const } },
          { content: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const where: Prisma.CmsPostWhereInput = {
      AND: [visibilityWhere, filterWhere],
    };

    const [data, total] = await Promise.all([
      this.db.client.cmsPost.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          postTags: { include: { tag: true } },
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      this.db.client.cmsPost.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(id: bigint, user: TokenPayload) {
    const visibilityWhere = await this.accessService.buildVisiblePostWhere(user);
    const post = await this.db.client.cmsPost.findFirst({
      where: {
        AND: [{ id }, visibilityWhere],
      },
      include: {
        postTags: { include: { tag: true } },
        _count: { select: { comments: true, reactions: true, bookmarks: true } },
      },
    });
    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    // Increment view count
    await this.db.client.cmsPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return post;
  }

  async create(dto: CreatePostDto, user: TokenPayload) {
    const authorUserId = BigInt(user.userId);
    const visibility = await this.accessService.resolvePostVisibility(user, dto.visibilityScopeCode);

    return this.db.client.$transaction(async (tx) => {
      const post = await tx.cmsPost.create({
        data: {
          authorUserId,
          title: dto.title ?? null,
          content: dto.content,
          contentType: dto.contentType ?? 'text',
          boardId: dto.boardId ? BigInt(dto.boardId) : null,
          categoryId: dto.categoryId ? BigInt(dto.categoryId) : null,
          visibilityScopeCode: visibility.visibilityScopeCode,
          targetOrgId: visibility.targetOrgId,
        },
      });

      if (dto.tagNames && dto.tagNames.length > 0) {
        for (const tagName of dto.tagNames) {
          const tag = await tx.cmsTag.upsert({
            where: { tagName },
            create: { tagName },
            update: { usageCount: { increment: 1 } },
          });
          await tx.cmsPostTag.create({
            data: { postId: post.id, tagId: tag.id },
          });
        }
      }

      return tx.cmsPost.findUnique({
        where: { id: post.id },
        include: {
          postTags: { include: { tag: true } },
        },
      });
    });
  }

  async update(id: bigint, dto: UpdatePostDto, user: TokenPayload) {
    const existing = await this.db.client.cmsPost.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    await this.accessService.assertSameUserOrOverride(
      user,
      existing.authorUserId,
      '본인이 작성한 게시물만 수정할 수 있습니다.',
    );

    const visibility =
      dto.visibilityScopeCode !== undefined
        ? await this.accessService.resolvePostVisibility(user, dto.visibilityScopeCode)
        : null;

    return this.db.client.$transaction(async (tx) => {
      const post = await tx.cmsPost.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.content !== undefined && { content: dto.content }),
          ...(dto.contentType !== undefined && { contentType: dto.contentType }),
          ...(dto.boardId !== undefined && { boardId: dto.boardId ? BigInt(dto.boardId) : null }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId ? BigInt(dto.categoryId) : null }),
          ...(visibility && {
            visibilityScopeCode: visibility.visibilityScopeCode,
            targetOrgId: visibility.targetOrgId,
          }),
        },
      });

      if (dto.tagNames !== undefined) {
        await tx.cmsPostTag.deleteMany({ where: { postId: id } });
        for (const tagName of dto.tagNames) {
          const tag = await tx.cmsTag.upsert({
            where: { tagName },
            create: { tagName },
            update: { usageCount: { increment: 1 } },
          });
          await tx.cmsPostTag.create({
            data: { postId: id, tagId: tag.id },
          });
        }
      }

      return tx.cmsPost.findUnique({
        where: { id: post.id },
        include: {
          postTags: { include: { tag: true } },
        },
      });
    });
  }

  async softDelete(id: bigint, user: TokenPayload) {
    const existing = await this.db.client.cmsPost.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Post ${id} not found`);
    }

    await this.accessService.assertSameUserOrOverride(
      user,
      existing.authorUserId,
      '본인이 작성한 게시물만 삭제할 수 있습니다.',
    );

    return this.db.client.cmsPost.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
