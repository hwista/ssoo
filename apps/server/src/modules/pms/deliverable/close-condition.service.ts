import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { UpsertCloseConditionDto, ToggleCheckDto } from './dto/deliverable.dto.js';

@Injectable()
export class CloseConditionService {
  constructor(private readonly db: DatabaseService) {}

  async findByProject(projectId: bigint, statusCode?: string) {
    return this.db.client.projectCloseCondition.findMany({
      where: {
        projectId,
        isActive: true,
        ...(statusCode && { statusCode }),
      },
      orderBy: [{ statusCode: 'asc' }, { sortOrder: 'asc' }, { conditionCode: 'asc' }],
    });
  }

  async upsert(projectId: bigint, dto: UpsertCloseConditionDto) {
    return this.db.client.projectCloseCondition.upsert({
      where: {
        pk_pr_project_close_condition_r_m: {
          projectId,
          statusCode: dto.statusCode,
          conditionCode: dto.conditionCode,
        },
      },
      update: {
        requiresDeliverable: dto.requiresDeliverable,
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
        isActive: true,
      },
      create: {
        projectId,
        statusCode: dto.statusCode,
        conditionCode: dto.conditionCode,
        requiresDeliverable: dto.requiresDeliverable,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async toggleCheck(
    projectId: bigint,
    statusCode: string,
    conditionCode: string,
    dto: ToggleCheckDto,
  ) {
    const existing = await this.db.client.projectCloseCondition.findUnique({
      where: {
        pk_pr_project_close_condition_r_m: { projectId, statusCode, conditionCode },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `ProjectCloseCondition not found: project=${projectId}, status=${statusCode}, condition=${conditionCode}`,
      );
    }

    return this.db.client.projectCloseCondition.update({
      where: {
        pk_pr_project_close_condition_r_m: { projectId, statusCode, conditionCode },
      },
      data: {
        isChecked: dto.isChecked,
        checkedAt: dto.isChecked ? new Date() : null,
      },
    });
  }

  async delete(projectId: bigint, statusCode: string, conditionCode: string) {
    const existing = await this.db.client.projectCloseCondition.findUnique({
      where: {
        pk_pr_project_close_condition_r_m: { projectId, statusCode, conditionCode },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `ProjectCloseCondition not found: project=${projectId}, status=${statusCode}, condition=${conditionCode}`,
      );
    }

    return this.db.client.projectCloseCondition.update({
      where: {
        pk_pr_project_close_condition_r_m: { projectId, statusCode, conditionCode },
      },
      data: { isActive: false },
    });
  }
}
