import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateMilestoneDto, UpdateMilestoneDto } from '@ssoo/types';

@Injectable()
export class MilestoneService {
  constructor(private readonly db: DatabaseService) {}

  async findByProject(projectId: bigint) {
    return this.db.client.milestone.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { dueAt: 'asc' }],
    });
  }

  async findOne(id: bigint) {
    const milestone = await this.db.client.milestone.findUnique({ where: { id } });
    if (!milestone) throw new NotFoundException(`Milestone ${id} not found`);
    return milestone;
  }

  async create(projectId: bigint, dto: CreateMilestoneDto) {
    const objectiveId = await this.resolveObjectiveId(projectId, dto.objectiveId);

    return this.db.client.milestone.create({
      data: {
        projectId,
        objectiveId,
        milestoneCode: dto.milestoneCode,
        milestoneName: dto.milestoneName,
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async update(id: bigint, dto: UpdateMilestoneDto) {
    const existing = await this.db.client.milestone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Milestone ${id} not found`);

    const objectiveId =
      dto.objectiveId !== undefined
        ? await this.resolveObjectiveId(existing.projectId, dto.objectiveId)
        : undefined;

    return this.db.client.milestone.update({
      where: { id },
      data: {
        ...(objectiveId !== undefined && { objectiveId }),
        ...(dto.milestoneName !== undefined && { milestoneName: dto.milestoneName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.statusCode !== undefined && { statusCode: dto.statusCode }),
        ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
        ...(dto.achievedAt !== undefined && { achievedAt: dto.achievedAt ? new Date(dto.achievedAt) : null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  async remove(id: bigint) {
    const existing = await this.db.client.milestone.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Milestone ${id} not found`);
    return this.db.client.milestone.delete({ where: { id } });
  }

  private async resolveObjectiveId(projectId: bigint, objectiveId?: string | null) {
    if (objectiveId === undefined) {
      return undefined;
    }

    if (objectiveId === null || objectiveId === '') {
      return null;
    }

    const resolved = await this.db.client.objective.findFirst({
      where: { id: BigInt(objectiveId), projectId, isActive: true },
      select: { id: true },
    });

    if (!resolved) {
      throw new NotFoundException(`Objective ${objectiveId} not found`);
    }

    return resolved.id;
  }
}
