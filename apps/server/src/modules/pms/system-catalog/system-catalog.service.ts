import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  CreateSystemCatalogDto,
  FindSystemCatalogsDto,
  UpdateSystemCatalogDto,
} from './dto/system-catalog.dto.js';

@Injectable()
export class SystemCatalogService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(params: FindSystemCatalogsDto) {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      ...(params.parentCode !== undefined && {
        parentCode: params.parentCode || null,
      }),
      ...(params.search && {
        OR: [
          { catalogName: { contains: params.search, mode: 'insensitive' as const } },
          { catalogCode: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.client.systemCatalog.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { catalogCode: 'asc' }],
      }),
      this.db.client.systemCatalog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findTree() {
    return this.db.client.systemCatalog.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { catalogCode: 'asc' }],
    });
  }

  async findOne(id: bigint) {
    const catalog = await this.db.client.systemCatalog.findUnique({ where: { id } });
    if (!catalog) {
      throw new NotFoundException(`System catalog ${id} not found`);
    }
    return catalog;
  }

  async create(dto: CreateSystemCatalogDto) {
    const existing = await this.db.client.systemCatalog.findUnique({
      where: { catalogCode: dto.catalogCode },
    });
    if (existing) {
      throw new ConflictException(`Catalog code '${dto.catalogCode}' already exists`);
    }

    if (dto.parentCode) {
      await this.ensureParentExists(dto.parentCode);
    }

    return this.db.client.systemCatalog.create({
      data: {
        catalogCode: dto.catalogCode,
        catalogName: dto.catalogName,
        description: dto.description,
        parentCode: dto.parentCode ?? null,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async update(id: bigint, dto: UpdateSystemCatalogDto) {
    const existing = await this.findOne(id);

    if (dto.parentCode !== undefined) {
      if (dto.parentCode === existing.catalogCode) {
        throw new BadRequestException('Catalog cannot reference itself as parent');
      }

      if (dto.parentCode) {
        await this.ensureParentExists(dto.parentCode);
        await this.ensureNoCycle(existing.catalogCode, dto.parentCode);
      }
    }

    return this.db.client.systemCatalog.update({
      where: { id },
      data: {
        ...(dto.catalogName !== undefined && { catalogName: dto.catalogName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.parentCode !== undefined && { parentCode: dto.parentCode || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  async deactivate(id: bigint) {
    const existing = await this.findOne(id);
    const activeChild = await this.db.client.systemCatalog.findFirst({
      where: {
        parentCode: existing.catalogCode,
        isActive: true,
      },
    });

    if (activeChild) {
      throw new BadRequestException('Cannot deactivate catalog with active children');
    }

    return this.db.client.systemCatalog.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async ensureParentExists(parentCode: string) {
    const parent = await this.db.client.systemCatalog.findUnique({
      where: { catalogCode: parentCode },
    });
    if (!parent) {
      throw new BadRequestException(`Parent catalog '${parentCode}' not found`);
    }
    return parent;
  }

  private async ensureNoCycle(currentCode: string, parentCode: string) {
    let cursor = parentCode;

    while (cursor) {
      if (cursor === currentCode) {
        throw new BadRequestException('Circular parentCode reference is not allowed');
      }

      const node = await this.db.client.systemCatalog.findUnique({
        where: { catalogCode: cursor },
        select: { parentCode: true },
      });
      cursor = node?.parentCode ?? '';
    }
  }
}
