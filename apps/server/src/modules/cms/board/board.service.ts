import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateBoardDto, UpdateBoardDto, FindBoardsDto } from './dto/board.dto.js';

@Injectable()
export class BoardService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(params: FindBoardsDto) {
    const pageValue = Number(params.page);
    const pageSizeValue = Number(params.pageSize);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : 20;
    const skip = (page - 1) * pageSize;

    const where = { isActive: true };

    const [data, total] = await Promise.all([
      this.db.client.cmsBoard.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          categories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          _count: { select: { posts: true } },
        },
      }),
      this.db.client.cmsBoard.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(id: bigint) {
    const board = await this.db.client.cmsBoard.findUnique({
      where: { id },
      include: {
        categories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { posts: true } },
      },
    });
    if (!board || !board.isActive) {
      throw new NotFoundException(`Board ${id} not found`);
    }
    return board;
  }

  async create(dto: CreateBoardDto) {
    const existing = await this.db.client.cmsBoard.findUnique({
      where: { boardCode: dto.boardCode },
    });
    if (existing) {
      throw new ConflictException(`Board code '${dto.boardCode}' already exists`);
    }

    return this.db.client.cmsBoard.create({
      data: {
        boardCode: dto.boardCode,
        boardName: dto.boardName,
        boardType: dto.boardType,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: bigint, dto: UpdateBoardDto) {
    const existing = await this.db.client.cmsBoard.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Board ${id} not found`);
    }

    return this.db.client.cmsBoard.update({
      where: { id },
      data: {
        ...(dto.boardName !== undefined && { boardName: dto.boardName }),
        ...(dto.boardType !== undefined && { boardType: dto.boardType }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async softDelete(id: bigint) {
    const existing = await this.db.client.cmsBoard.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new NotFoundException(`Board ${id} not found`);
    }

    return this.db.client.cmsBoard.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
