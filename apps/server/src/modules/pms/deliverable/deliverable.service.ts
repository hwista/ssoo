import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { UpsertDeliverableDto, UpdateSubmissionDto } from './dto/deliverable.dto.js';

@Injectable()
export class DeliverableService {
  constructor(private readonly db: DatabaseService) {}

  async findByProject(projectId: bigint, statusCode?: string) {
    return this.db.client.projectDeliverable.findMany({
      where: {
        projectId,
        isActive: true,
        ...(statusCode && { statusCode }),
      },
      include: {
        deliverable: {
          select: {
            deliverableName: true,
            description: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [{ statusCode: 'asc' }, { deliverableCode: 'asc' }],
    });
  }

  async upsert(projectId: bigint, dto: UpsertDeliverableDto) {
    return this.db.client.projectDeliverable.upsert({
      where: {
        pk_pr_project_deliverable_r_m: {
          projectId,
          statusCode: dto.statusCode,
          deliverableCode: dto.deliverableCode,
        },
      },
      update: {
        submissionStatusCode: dto.submissionStatusCode,
        ...(dto.memo !== undefined && { memo: dto.memo }),
        isActive: true,
      },
      create: {
        projectId,
        statusCode: dto.statusCode,
        deliverableCode: dto.deliverableCode,
        submissionStatusCode: dto.submissionStatusCode,
        memo: dto.memo,
      },
      include: {
        deliverable: {
          select: {
            deliverableName: true,
            description: true,
            sortOrder: true,
          },
        },
      },
    });
  }

  async updateSubmission(
    projectId: bigint,
    statusCode: string,
    deliverableCode: string,
    dto: UpdateSubmissionDto,
  ) {
    const existing = await this.db.client.projectDeliverable.findUnique({
      where: {
        pk_pr_project_deliverable_r_m: { projectId, statusCode, deliverableCode },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `ProjectDeliverable not found: project=${projectId}, status=${statusCode}, deliverable=${deliverableCode}`,
      );
    }

    return this.db.client.projectDeliverable.update({
      where: {
        pk_pr_project_deliverable_r_m: { projectId, statusCode, deliverableCode },
      },
      data: {
        submissionStatusCode: dto.submissionStatusCode,
      },
      include: {
        deliverable: {
          select: {
            deliverableName: true,
            description: true,
            sortOrder: true,
          },
        },
      },
    });
  }

  async delete(projectId: bigint, statusCode: string, deliverableCode: string) {
    const existing = await this.db.client.projectDeliverable.findUnique({
      where: {
        pk_pr_project_deliverable_r_m: { projectId, statusCode, deliverableCode },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `ProjectDeliverable not found: project=${projectId}, status=${statusCode}, deliverable=${deliverableCode}`,
      );
    }

    return this.db.client.projectDeliverable.update({
      where: {
        pk_pr_project_deliverable_r_m: { projectId, statusCode, deliverableCode },
      },
      data: { isActive: false },
    });
  }
}
