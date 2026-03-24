import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateSiteDto, FindSitesDto, UpdateSiteDto } from './dto/site.dto.js';

@Injectable()
export class SiteService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(params: FindSitesDto) {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;
    const customerId = params.customerId ? this.parseId(params.customerId, 'customerId') : undefined;

    const where = {
      isActive: true,
      ...(customerId !== undefined && { customerId }),
      ...(params.search && {
        OR: [
          { siteName: { contains: params.search, mode: 'insensitive' as const } },
          { siteCode: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.client.site.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { siteCode: 'asc' }],
      }),
      this.db.client.site.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findTree(customerId?: string) {
    const customerIdValue = customerId ? this.parseId(customerId, 'customerId') : undefined;
    return this.db.client.site.findMany({
      where: {
        isActive: true,
        ...(customerIdValue !== undefined && { customerId: customerIdValue }),
      },
      orderBy: [{ sortOrder: 'asc' }, { siteCode: 'asc' }],
    });
  }

  async findOne(id: bigint) {
    const site = await this.db.client.site.findUnique({ where: { id } });
    if (!site) {
      throw new NotFoundException(`Site ${id} not found`);
    }
    return site;
  }

  async create(dto: CreateSiteDto) {
    const existing = await this.db.client.site.findUnique({
      where: { siteCode: dto.siteCode },
    });
    if (existing) {
      throw new ConflictException(`Site code '${dto.siteCode}' already exists`);
    }

    const customerId = this.parseId(dto.customerId, 'customerId');
    await this.ensureCustomerExists(customerId);

    if (dto.siteType) {
      await this.ensureValidSiteType(dto.siteType);
    }

    if (dto.parentCode) {
      const parent = await this.ensureParentExists(dto.parentCode);
      if (parent.customerId !== customerId) {
        throw new BadRequestException('Parent site must belong to the same customer');
      }
    }

    return this.db.client.site.create({
      data: {
        siteCode: dto.siteCode,
        siteName: dto.siteName,
        siteType: dto.siteType ?? null,
        customerId,
        parentCode: dto.parentCode ?? null,
        sortOrder: dto.sortOrder ?? 0,
        address: dto.address ?? null,
        region: dto.region ?? null,
        contactPerson: dto.contactPerson ?? null,
        contactPhone: dto.contactPhone ?? null,
        description: dto.description ?? null,
        memo: dto.memo ?? null,
      },
    });
  }

  async update(id: bigint, dto: UpdateSiteDto) {
    const existing = await this.findOne(id);

    if (dto.siteType) {
      await this.ensureValidSiteType(dto.siteType);
    }

    if (dto.parentCode !== undefined) {
      if (dto.parentCode === existing.siteCode) {
        throw new BadRequestException('Site cannot reference itself as parent');
      }

      if (dto.parentCode) {
        const parent = await this.ensureParentExists(dto.parentCode);
        if (parent.customerId !== existing.customerId) {
          throw new BadRequestException('Parent site must belong to the same customer');
        }
        await this.ensureNoCycle(existing.siteCode, dto.parentCode);
      }
    }

    return this.db.client.site.update({
      where: { id },
      data: {
        ...(dto.siteName !== undefined && { siteName: dto.siteName }),
        ...(dto.siteType !== undefined && { siteType: dto.siteType || null }),
        ...(dto.parentCode !== undefined && { parentCode: dto.parentCode || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.region !== undefined && { region: dto.region }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  async deactivate(id: bigint) {
    const existing = await this.findOne(id);
    const activeChild = await this.db.client.site.findFirst({
      where: {
        parentCode: existing.siteCode,
        isActive: true,
      },
    });

    if (activeChild) {
      throw new BadRequestException('Cannot deactivate site with active children');
    }

    return this.db.client.site.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async ensureCustomerExists(customerId: bigint) {
    const customer = await this.db.client.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new BadRequestException(`Customer ${customerId} not found`);
    }
    return customer;
  }

  private async ensureParentExists(parentCode: string) {
    const parent = await this.db.client.site.findUnique({
      where: { siteCode: parentCode },
    });
    if (!parent) {
      throw new BadRequestException(`Parent site '${parentCode}' not found`);
    }
    return parent;
  }

  private async ensureValidSiteType(siteType: string) {
    const code = await this.db.client.cmCode.findFirst({
      where: {
        codeGroup: 'SITE_TYPE',
        codeValue: siteType,
        isActive: true,
      },
    });
    if (!code) {
      throw new BadRequestException(`Invalid siteType '${siteType}'`);
    }
    return code;
  }

  private async ensureNoCycle(currentCode: string, parentCode: string) {
    let cursor = parentCode;

    while (cursor) {
      if (cursor === currentCode) {
        throw new BadRequestException('Circular parentCode reference is not allowed');
      }

      const node = await this.db.client.site.findUnique({
        where: { siteCode: cursor },
        select: { parentCode: true },
      });
      cursor = node?.parentCode ?? '';
    }
  }

  private parseId(value: string, fieldName: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
  }
}
