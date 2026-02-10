import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  CreateProjectDto,
  UpdateProjectDto,
  PaginationParams,
} from '@ssoo/types';

@Injectable()
export class ProjectService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(params: PaginationParams) {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.project.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { requestDetail: true },
      }),
      this.db.project.count(),
    ]);

    return { data, total };
  }

  async findOne(id: bigint) {
    return this.db.project.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateProjectDto) {
    return this.db.project.create({
      data: {
        projectName: dto.projectName,
        statusCode: dto.statusCode || 'request',
        stageCode: dto.stageCode || 'waiting',
        currentOwnerUserId: dto.ownerId ? BigInt(dto.ownerId) : null,
        customerId: dto.customerId ? BigInt(dto.customerId) : null,
        memo: dto.description,
      },
    });
  }

  async update(id: bigint, dto: UpdateProjectDto) {
    try {
      return await this.db.project.update({
        where: { id },
        data: {
          ...(dto.projectName && { projectName: dto.projectName }),
          ...(dto.description !== undefined && { memo: dto.description }),
          ...(dto.statusCode && { statusCode: dto.statusCode }),
          ...(dto.stageCode && { stageCode: dto.stageCode }),
          ...(dto.doneResultCode !== undefined && { doneResultCode: dto.doneResultCode }),
          ...(dto.ownerId && { currentOwnerUserId: BigInt(dto.ownerId) }),
        },
      });
    } catch {
      return null;
    }
  }

  async remove(id: bigint): Promise<boolean> {
    try {
      await this.db.project.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
