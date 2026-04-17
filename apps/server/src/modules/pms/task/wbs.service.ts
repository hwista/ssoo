import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateWbsDto, UpdateWbsDto } from '@ssoo/types';

@Injectable()
export class WbsService {
  constructor(private readonly db: DatabaseService) {}

  async findByProject(projectId: bigint) {
    return this.db.client.wbs.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }, { wbsCode: 'asc' }],
    });
  }

  async findOne(projectId: bigint, id: bigint) {
    const wbs = await this.db.client.wbs.findFirst({
      where: { id, projectId, isActive: true },
    });

    if (!wbs) {
      throw new NotFoundException(`WBS ${id} not found`);
    }

    return wbs;
  }

  async create(projectId: bigint, dto: CreateWbsDto) {
    const objective = await this.resolveObjective(projectId, dto.objectiveId);
    const parentWbs = await this.resolveParentWbs(projectId, dto.parentWbsId);

    if (objective && parentWbs?.objectiveId && parentWbs.objectiveId !== objective.id) {
      throw new BadRequestException('Parent WBS and objective must belong to the same objective tree.');
    }

    const resolvedObjectiveId = parentWbs?.objectiveId ?? objective?.id ?? null;

    return this.db.client.wbs.create({
      data: {
        projectId,
        objectiveId: resolvedObjectiveId,
        parentWbsId: parentWbs?.id ?? null,
        wbsCode: dto.wbsCode,
        wbsName: dto.wbsName,
        description: dto.description,
        statusCode: dto.statusCode ?? 'not_started',
        depth: parentWbs ? parentWbs.depth + 1 : 0,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async update(projectId: bigint, id: bigint, dto: UpdateWbsDto) {
    const existing = await this.findOne(projectId, id);

    let objectiveId = existing.objectiveId;
    if (dto.objectiveId !== undefined) {
      objectiveId = (await this.resolveObjective(projectId, dto.objectiveId))?.id ?? null;
    }

    let parentWbsId = existing.parentWbsId;
    let depth = existing.depth;

    if (dto.parentWbsId !== undefined) {
      const parentWbs = await this.resolveParentWbs(projectId, dto.parentWbsId, id);
      parentWbsId = parentWbs?.id ?? null;
      depth = parentWbs ? parentWbs.depth + 1 : 0;

      if (parentWbs?.objectiveId && objectiveId && parentWbs.objectiveId !== objectiveId) {
        throw new BadRequestException('Parent WBS and objective must belong to the same objective tree.');
      }

      objectiveId = parentWbs?.objectiveId ?? objectiveId;
    }

    return this.db.client.wbs.update({
      where: { id },
      data: {
        ...(dto.objectiveId !== undefined || dto.parentWbsId !== undefined ? { objectiveId } : {}),
        ...(dto.parentWbsId !== undefined && { parentWbsId }),
        ...(dto.parentWbsId !== undefined && { depth }),
        ...(dto.wbsName !== undefined && { wbsName: dto.wbsName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.statusCode !== undefined && { statusCode: dto.statusCode }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  async remove(projectId: bigint, id: bigint) {
    await this.findOne(projectId, id);
    return this.db.client.wbs.delete({ where: { id } });
  }

  private async resolveObjective(projectId: bigint, objectiveId?: string | null) {
    if (objectiveId === undefined || objectiveId === null || objectiveId === '') {
      return null;
    }

    const parsedId = BigInt(objectiveId);
    const objective = await this.db.client.objective.findFirst({
      where: { id: parsedId, projectId, isActive: true },
      select: { id: true },
    });

    if (!objective) {
      throw new NotFoundException(`Objective ${objectiveId} not found`);
    }

    return objective;
  }

  private async resolveParentWbs(projectId: bigint, parentWbsId?: string | null, currentWbsId?: bigint) {
    if (parentWbsId === undefined || parentWbsId === null || parentWbsId === '') {
      return null;
    }

    const parsedId = BigInt(parentWbsId);
    if (currentWbsId !== undefined && parsedId === currentWbsId) {
      throw new BadRequestException('WBS cannot reference itself as parent.');
    }

    const parentWbs = await this.db.client.wbs.findFirst({
      where: { id: parsedId, projectId, isActive: true },
      select: { id: true, depth: true, objectiveId: true },
    });

    if (!parentWbs) {
      throw new NotFoundException(`Parent WBS ${parentWbsId} not found`);
    }

    return parentWbs;
  }
}
