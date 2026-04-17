import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { UpsertCloseConditionDto, ToggleCheckDto } from './dto/deliverable.dto.js';
import { COMPLETED_DELIVERABLE_SUBMISSION_STATUSES } from './deliverable.constants.js';

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
      include: {
        event: {
          select: {
            eventId: true,
            eventCode: true,
            eventName: true,
          },
        },
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
        ...(dto.eventId !== undefined && { eventId: dto.eventId ? BigInt(dto.eventId) : null }),
        requiresDeliverable: dto.requiresDeliverable,
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
        isActive: true,
      },
      create: {
        projectId,
        statusCode: dto.statusCode,
        conditionCode: dto.conditionCode,
        eventId: dto.eventId ? BigInt(dto.eventId) : null,
        requiresDeliverable: dto.requiresDeliverable,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
      include: {
        event: {
          select: {
            eventId: true,
            eventCode: true,
            eventName: true,
          },
        },
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

    if (existing.requiresDeliverable && dto.isChecked) {
      const pendingDeliverables = await this.db.client.projectDeliverable.findMany({
        where: {
          projectId,
          statusCode,
          isActive: true,
          submissionStatusCode: { notIn: [...COMPLETED_DELIVERABLE_SUBMISSION_STATUSES] },
        },
        select: {
          deliverableCode: true,
        },
      });

      if (pendingDeliverables.length > 0) {
        throw new BadRequestException(
          `산출물 제출이 필요한 종료조건입니다. 미완료 산출물 ${pendingDeliverables.length}건을 정리한 뒤 완료 처리할 수 있습니다.`,
        );
      }
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
