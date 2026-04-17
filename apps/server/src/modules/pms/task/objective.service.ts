import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateObjectiveDto, UpdateObjectiveDto } from '@ssoo/types';

@Injectable()
export class ObjectiveService {
  constructor(private readonly db: DatabaseService) {}

  async findByProject(projectId: bigint) {
    return this.db.client.objective.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }, { objectiveCode: 'asc' }],
    });
  }

  async findOne(projectId: bigint, id: bigint) {
    const objective = await this.db.client.objective.findFirst({
      where: { id, projectId, isActive: true },
    });

    if (!objective) {
      throw new NotFoundException(`Objective ${id} not found`);
    }

    return objective;
  }

  async create(projectId: bigint, dto: CreateObjectiveDto) {
    const parentObjective = await this.resolveParentObjective(projectId, dto.parentObjectiveId);

    return this.db.client.objective.create({
      data: {
        projectId,
        parentObjectiveId: parentObjective?.id ?? null,
        objectiveCode: dto.objectiveCode,
        objectiveName: dto.objectiveName,
        description: dto.description,
        statusCode: dto.statusCode ?? 'not_started',
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        depth: parentObjective ? parentObjective.depth + 1 : 0,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async update(projectId: bigint, id: bigint, dto: UpdateObjectiveDto) {
    const existing = await this.findOne(projectId, id);

    let parentObjectiveId = existing.parentObjectiveId;
    let depth = existing.depth;

    if (dto.parentObjectiveId !== undefined) {
      const parentObjective = await this.resolveParentObjective(projectId, dto.parentObjectiveId, id);
      parentObjectiveId = parentObjective?.id ?? null;
      depth = parentObjective ? parentObjective.depth + 1 : 0;
    }

    return this.db.client.objective.update({
      where: { id },
      data: {
        ...(dto.parentObjectiveId !== undefined && { parentObjectiveId }),
        ...(dto.objectiveName !== undefined && { objectiveName: dto.objectiveName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.statusCode !== undefined && { statusCode: dto.statusCode }),
        ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
        ...(dto.achievedAt !== undefined && { achievedAt: dto.achievedAt ? new Date(dto.achievedAt) : null }),
        ...(dto.parentObjectiveId !== undefined && { depth }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  async remove(projectId: bigint, id: bigint) {
    await this.findOne(projectId, id);
    return this.db.client.objective.delete({ where: { id } });
  }

  private async resolveParentObjective(
    projectId: bigint,
    parentObjectiveId?: string | null,
    currentObjectiveId?: bigint,
  ) {
    if (parentObjectiveId === undefined || parentObjectiveId === null || parentObjectiveId === '') {
      return null;
    }

    const parsedId = BigInt(parentObjectiveId);
    if (currentObjectiveId !== undefined && parsedId === currentObjectiveId) {
      throw new BadRequestException('Objective cannot reference itself as parent.');
    }

    const parentObjective = await this.db.client.objective.findFirst({
      where: { id: parsedId, projectId, isActive: true },
      select: { id: true, depth: true },
    });

    if (!parentObjective) {
      throw new NotFoundException(`Parent objective ${parentObjectiveId} not found`);
    }

    return parentObjective;
  }
}
