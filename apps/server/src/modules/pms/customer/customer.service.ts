import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateCustomerDto, UpdateCustomerDto, FindCustomersDto } from './dto/customer.dto.js';

@Injectable()
export class CustomerService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(params: FindCustomersDto) {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      ...(params.search && {
        OR: [
          { customerName: { contains: params.search, mode: 'insensitive' as const } },
          { customerCode: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.client.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.client.customer.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: bigint) {
    const customer = await this.db.client.customer.findUnique({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.db.client.customer.findUnique({
      where: { customerCode: dto.customerCode },
    });
    if (existing) {
      throw new ConflictException(`Customer code '${dto.customerCode}' already exists`);
    }

    return this.db.client.customer.create({
      data: {
        customerCode: dto.customerCode,
        customerName: dto.customerName,
        customerType: dto.customerType,
        industry: dto.industry,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        contactPerson: dto.contactPerson,
        contactPhone: dto.contactPhone,
        website: dto.website,
        memo: dto.memo,
      },
    });
  }

  async update(id: bigint, dto: UpdateCustomerDto) {
    const existing = await this.db.client.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return this.db.client.customer.update({
      where: { id },
      data: {
        ...(dto.customerName !== undefined && { customerName: dto.customerName }),
        ...(dto.customerType !== undefined && { customerType: dto.customerType }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  async deactivate(id: bigint) {
    const existing = await this.db.client.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return this.db.client.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
