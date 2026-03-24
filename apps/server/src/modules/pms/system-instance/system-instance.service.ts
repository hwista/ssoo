import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  CreateSystemInstanceDto,
  FindSystemInstancesDto,
  UpdateSystemInstanceDto,
} from './dto/system-instance.dto.js';

@Injectable()
export class SystemInstanceService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(params: FindSystemInstancesDto) {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;
    const customerId = params.customerId ? this.parseId(params.customerId, 'customerId') : undefined;
    const siteId = params.siteId ? this.parseId(params.siteId, 'siteId') : undefined;
    const systemCatalogId = params.systemCatalogId ? this.parseId(params.systemCatalogId, 'systemCatalogId') : undefined;

    const where = {
      isActive: true,
      ...(customerId !== undefined && { customerId }),
      ...(siteId !== undefined && { siteId }),
      ...(systemCatalogId !== undefined && { systemCatalogId }),
      ...(params.operatorType !== undefined && { operatorType: params.operatorType || null }),
      ...(params.search && {
        OR: [
          { instanceName: { contains: params.search, mode: 'insensitive' as const } },
          { instanceCode: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.client.systemInstance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { instanceCode: 'asc' }],
      }),
      this.db.client.systemInstance.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findTree(customerId?: string, siteId?: string) {
    const customerIdValue = customerId ? this.parseId(customerId, 'customerId') : undefined;
    const siteIdValue = siteId ? this.parseId(siteId, 'siteId') : undefined;

    return this.db.client.systemInstance.findMany({
      where: {
        isActive: true,
        ...(customerIdValue !== undefined && { customerId: customerIdValue }),
        ...(siteIdValue !== undefined && { siteId: siteIdValue }),
      },
      orderBy: [{ sortOrder: 'asc' }, { instanceCode: 'asc' }],
    });
  }

  async findOne(id: bigint) {
    const instance = await this.db.client.systemInstance.findUnique({ where: { id } });
    if (!instance) {
      throw new NotFoundException(`System instance ${id} not found`);
    }
    return instance;
  }

  async create(dto: CreateSystemInstanceDto) {
    const existing = await this.db.client.systemInstance.findUnique({
      where: { instanceCode: dto.instanceCode },
    });
    if (existing) {
      throw new ConflictException(`Instance code '${dto.instanceCode}' already exists`);
    }

    const customerId = this.parseId(dto.customerId, 'customerId');
    const siteId = this.parseId(dto.siteId, 'siteId');
    const systemCatalogId = this.parseId(dto.systemCatalogId, 'systemCatalogId');
    const operatorUserId = dto.operatorUserId ? this.parseId(dto.operatorUserId, 'operatorUserId') : undefined;

    await this.ensureCustomerExists(customerId);
    await this.ensureSystemCatalogExists(systemCatalogId);
    await this.ensureSiteExists(siteId, customerId);

    if (dto.parentCode) {
      const parent = await this.ensureParentExists(dto.parentCode);
      this.ensureParentCustomer(parent.customerId, customerId);
    }

    if (dto.operatorType) {
      await this.ensureValidOperatorType(dto.operatorType);
    }

    if (operatorUserId !== undefined) {
      await this.ensureUserExists(operatorUserId);
    }

    return this.db.client.systemInstance.create({
      data: {
        instanceCode: dto.instanceCode,
        instanceName: dto.instanceName,
        systemCatalogId,
        customerId,
        siteId,
        parentCode: dto.parentCode ?? null,
        sortOrder: dto.sortOrder ?? 0,
        operatorType: dto.operatorType ?? null,
        operatorUserId: operatorUserId ?? null,
        version: dto.version ?? null,
        description: dto.description ?? null,
        memo: dto.memo ?? null,
      },
    });
  }

  async update(id: bigint, dto: UpdateSystemInstanceDto) {
    const existing = await this.findOne(id);

    const nextSiteId = dto.siteId ? this.parseId(dto.siteId, 'siteId') : existing.siteId;

    if (dto.siteId !== undefined) {
      await this.ensureSiteExists(nextSiteId, existing.customerId);
    }

    if (dto.systemCatalogId !== undefined) {
      await this.ensureSystemCatalogExists(this.parseId(dto.systemCatalogId, 'systemCatalogId'));
    }

    if (dto.operatorType) {
      await this.ensureValidOperatorType(dto.operatorType);
    }

    const operatorUserId = dto.operatorUserId !== undefined
      ? (dto.operatorUserId ? this.parseId(dto.operatorUserId, 'operatorUserId') : null)
      : undefined;

    if (operatorUserId !== undefined && operatorUserId !== null) {
      await this.ensureUserExists(operatorUserId);
    }

    if (dto.parentCode !== undefined) {
      if (dto.parentCode === existing.instanceCode) {
        throw new BadRequestException('System instance cannot reference itself as parent');
      }

      if (dto.parentCode) {
        const parent = await this.ensureParentExists(dto.parentCode);
        this.ensureParentCustomer(parent.customerId, existing.customerId);
        await this.ensureParentSiteRule(parent.siteId, nextSiteId);
        await this.ensureNoCycle(existing.instanceCode, dto.parentCode);
      }
    }

    return this.db.client.systemInstance.update({
      where: { id },
      data: {
        ...(dto.instanceName !== undefined && { instanceName: dto.instanceName }),
        ...(dto.systemCatalogId !== undefined && { systemCatalogId: this.parseId(dto.systemCatalogId, 'systemCatalogId') }),
        ...(dto.siteId !== undefined && { siteId: nextSiteId }),
        ...(dto.parentCode !== undefined && { parentCode: dto.parentCode || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.operatorType !== undefined && { operatorType: dto.operatorType || null }),
        ...(dto.operatorUserId !== undefined && { operatorUserId }),
        ...(dto.version !== undefined && { version: dto.version || null }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  async deactivate(id: bigint) {
    const existing = await this.findOne(id);
    const activeChild = await this.db.client.systemInstance.findFirst({
      where: {
        parentCode: existing.instanceCode,
        isActive: true,
      },
    });

    if (activeChild) {
      throw new BadRequestException('Cannot deactivate system instance with active children');
    }

    return this.db.client.systemInstance.update({
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

  private async ensureSystemCatalogExists(systemCatalogId: bigint) {
    const systemCatalog = await this.db.client.systemCatalog.findUnique({ where: { id: systemCatalogId } });
    if (!systemCatalog) {
      throw new BadRequestException(`System catalog ${systemCatalogId} not found`);
    }
    return systemCatalog;
  }

  private async ensureSiteExists(siteId: bigint, customerId: bigint) {
    const site = await this.db.client.site.findUnique({ where: { id: siteId } });
    if (!site) {
      throw new BadRequestException(`Site ${siteId} not found`);
    }
    if (site.customerId !== customerId) {
      throw new BadRequestException('Site must belong to the same customer');
    }
    return site;
  }

  private async ensureUserExists(userId: bigint) {
    const user = await this.db.client.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException(`User ${userId} not found`);
    }
    return user;
  }

  private async ensureValidOperatorType(operatorType: string) {
    const code = await this.db.client.cmCode.findFirst({
      where: {
        codeGroup: 'SYSTEM_OPERATOR_TYPE',
        codeValue: operatorType,
        isActive: true,
      },
    });
    if (!code) {
      throw new BadRequestException(`Invalid operatorType '${operatorType}'`);
    }
    return code;
  }

  private async ensureParentExists(parentCode: string) {
    const parent = await this.db.client.systemInstance.findUnique({
      where: { instanceCode: parentCode },
    });
    if (!parent) {
      throw new BadRequestException(`Parent instance '${parentCode}' not found`);
    }
    return parent;
  }

  private ensureParentCustomer(parentCustomerId: bigint, customerId: bigint) {
    if (parentCustomerId !== customerId) {
      throw new BadRequestException('Parent instance must belong to the same customer');
    }
  }

  private async ensureParentSiteRule(parentSiteId: bigint, childSiteId: bigint) {
    if (parentSiteId === childSiteId) return;
    throw new BadRequestException('Parent instance must be assigned to the same site');
  }

  private async ensureNoCycle(currentCode: string, parentCode: string) {
    let cursor = parentCode;

    while (cursor) {
      if (cursor === currentCode) {
        throw new BadRequestException('Circular parentCode reference is not allowed');
      }

      const node = await this.db.client.systemInstance.findUnique({
        where: { instanceCode: cursor },
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
