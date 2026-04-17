import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import { isDeliverableSubmissionCompleted } from '../deliverable/deliverable.constants.js';
import type {
  CreateProjectIssueDto,
  UpdateProjectIssueDto,
  CreateProjectRequirementDto,
  UpdateProjectRequirementDto,
  CreateProjectRiskDto,
  UpdateProjectRiskDto,
  CreateProjectChangeRequestDto,
  UpdateProjectChangeRequestDto,
  CreateProjectEventDto,
  UpdateProjectEventDto,
} from '@ssoo/types';

const PROJECT_STATUS_CODE_ORDER: Record<string, number> = {
  request: 0,
  proposal: 1,
  execution: 2,
  transition: 3,
};

@Injectable()
export class ControlService {
  constructor(private readonly db: DatabaseService) {}

  async findProjectIssues(projectId: bigint) {
    return this.db.client.projectIssue.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { issueCode: 'asc' }],
    });
  }

  async createProjectIssue(
    projectId: bigint,
    dto: CreateProjectIssueDto,
    currentUserId?: bigint,
  ) {
    return this.db.client.projectIssue.create({
      data: {
        projectId,
        issueCode: dto.issueCode,
        issueTitle: dto.issueTitle,
        description: dto.description,
        issueTypeCode: dto.issueTypeCode,
        statusCode: dto.statusCode ?? 'open',
        priorityCode: dto.priorityCode ?? 'normal',
        reportedByUserId: dto.reportedByUserId ? BigInt(dto.reportedByUserId) : currentUserId ?? null,
        ownerUserId: this.resolveProjectIssueOwnerUserId(dto.ownerUserId, dto.assigneeUserId),
        reportedAt: dto.reportedAt ? new Date(dto.reportedAt) : undefined,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : null,
        resolution: dto.resolution,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async updateProjectIssue(
    projectId: bigint,
    projectIssueId: bigint,
    dto: UpdateProjectIssueDto,
  ) {
    await this.findProjectIssue(projectId, projectIssueId);
    const data: Prisma.ProjectIssueUncheckedUpdateInput = {};

    if (dto.issueTitle !== undefined) {
      data.issueTitle = dto.issueTitle;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.issueTypeCode !== undefined) {
      data.issueTypeCode = dto.issueTypeCode;
    }
    if (dto.statusCode !== undefined) {
      data.statusCode = dto.statusCode;
    }
    if (dto.priorityCode !== undefined) {
      data.priorityCode = dto.priorityCode;
    }
    if (dto.ownerUserId !== undefined || dto.assigneeUserId !== undefined) {
      data.ownerUserId = this.resolveProjectIssueOwnerUserId(dto.ownerUserId, dto.assigneeUserId);
    }
    if (dto.dueAt !== undefined) {
      data.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    }
    if (dto.resolvedAt !== undefined) {
      data.resolvedAt = dto.resolvedAt ? new Date(dto.resolvedAt) : null;
    }
    if (dto.resolution !== undefined) {
      data.resolution = dto.resolution;
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.memo !== undefined) {
      data.memo = dto.memo;
    }

    return this.db.client.projectIssue.update({
      where: { projectIssueId },
      data,
    });
  }

  async removeProjectIssue(projectId: bigint, projectIssueId: bigint) {
    await this.findProjectIssue(projectId, projectIssueId);
    return this.db.client.projectIssue.delete({ where: { projectIssueId } });
  }

  async findRequirements(projectId: bigint) {
    return this.db.client.projectRequirement.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { requirementCode: 'asc' }],
    });
  }

  async createRequirement(projectId: bigint, dto: CreateProjectRequirementDto) {
    return this.db.client.projectRequirement.create({
      data: {
        projectId,
        requirementCode: dto.requirementCode,
        requirementTitle: dto.requirementTitle,
        description: dto.description,
        statusCode: dto.statusCode ?? 'open',
        priorityCode: dto.priorityCode ?? 'normal',
        ownerUserId: dto.ownerUserId ? BigInt(dto.ownerUserId) : null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async updateRequirement(projectId: bigint, requirementId: bigint, dto: UpdateProjectRequirementDto) {
    await this.findRequirement(projectId, requirementId);
    return this.db.client.projectRequirement.update({
      where: { requirementId },
      data: {
        ...(dto.requirementTitle !== undefined && { requirementTitle: dto.requirementTitle }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.statusCode !== undefined && { statusCode: dto.statusCode }),
        ...(dto.priorityCode !== undefined && { priorityCode: dto.priorityCode }),
        ...(dto.ownerUserId !== undefined && { ownerUserId: dto.ownerUserId ? BigInt(dto.ownerUserId) : null }),
        ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  async removeRequirement(projectId: bigint, requirementId: bigint) {
    await this.findRequirement(projectId, requirementId);
    return this.db.client.projectRequirement.delete({ where: { requirementId } });
  }

  async findRisks(projectId: bigint) {
    return this.db.client.projectRisk.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { riskCode: 'asc' }],
    });
  }

  async createRisk(projectId: bigint, dto: CreateProjectRiskDto) {
    return this.db.client.projectRisk.create({
      data: {
        projectId,
        riskCode: dto.riskCode,
        riskTitle: dto.riskTitle,
        description: dto.description,
        statusCode: dto.statusCode ?? 'identified',
        impactCode: dto.impactCode ?? 'medium',
        likelihoodCode: dto.likelihoodCode ?? 'medium',
        responsePlan: dto.responsePlan,
        ownerUserId: dto.ownerUserId ? BigInt(dto.ownerUserId) : null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async updateRisk(projectId: bigint, riskId: bigint, dto: UpdateProjectRiskDto) {
    await this.findRisk(projectId, riskId);
    return this.db.client.projectRisk.update({
      where: { riskId },
      data: {
        ...(dto.riskTitle !== undefined && { riskTitle: dto.riskTitle }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.statusCode !== undefined && { statusCode: dto.statusCode }),
        ...(dto.impactCode !== undefined && { impactCode: dto.impactCode }),
        ...(dto.likelihoodCode !== undefined && { likelihoodCode: dto.likelihoodCode }),
        ...(dto.responsePlan !== undefined && { responsePlan: dto.responsePlan }),
        ...(dto.ownerUserId !== undefined && { ownerUserId: dto.ownerUserId ? BigInt(dto.ownerUserId) : null }),
        ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  async removeRisk(projectId: bigint, riskId: bigint) {
    await this.findRisk(projectId, riskId);
    return this.db.client.projectRisk.delete({ where: { riskId } });
  }

  async findChangeRequests(projectId: bigint) {
    return this.db.client.projectChangeRequest.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { changeCode: 'asc' }],
    });
  }

  async createChangeRequest(projectId: bigint, dto: CreateProjectChangeRequestDto) {
    return this.db.client.projectChangeRequest.create({
      data: {
        projectId,
        changeCode: dto.changeCode,
        changeTitle: dto.changeTitle,
        description: dto.description,
        statusCode: dto.statusCode ?? 'requested',
        priorityCode: dto.priorityCode ?? 'normal',
        requestedAt: dto.requestedAt ? new Date(dto.requestedAt) : undefined,
        decidedAt: dto.decidedAt ? new Date(dto.decidedAt) : null,
        ownerUserId: dto.ownerUserId ? BigInt(dto.ownerUserId) : null,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async updateChangeRequest(
    projectId: bigint,
    changeRequestId: bigint,
    dto: UpdateProjectChangeRequestDto,
  ) {
    await this.findChangeRequest(projectId, changeRequestId);
    const data: Prisma.ProjectChangeRequestUpdateInput = {};

    if (dto.changeTitle !== undefined) {
      data.changeTitle = dto.changeTitle;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.statusCode !== undefined) {
      data.statusCode = dto.statusCode;
    }
    if (dto.priorityCode !== undefined) {
      data.priorityCode = dto.priorityCode;
    }
    if (dto.requestedAt !== undefined) {
      data.requestedAt = new Date(dto.requestedAt);
    }
    if (dto.decidedAt !== undefined) {
      data.decidedAt = dto.decidedAt ? new Date(dto.decidedAt) : null;
    }
    if (dto.ownerUserId !== undefined) {
      data.ownerUserId = dto.ownerUserId ? BigInt(dto.ownerUserId) : null;
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.memo !== undefined) {
      data.memo = dto.memo;
    }

    return this.db.client.projectChangeRequest.update({
      where: { changeRequestId },
      data,
    });
  }

  async removeChangeRequest(projectId: bigint, changeRequestId: bigint) {
    await this.findChangeRequest(projectId, changeRequestId);
    return this.db.client.projectChangeRequest.delete({ where: { changeRequestId } });
  }

  async findEvents(projectId: bigint) {
    const events = await this.db.client.projectEvent.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { eventCode: 'asc' }],
    });

    if (events.length === 0) {
      return [];
    }

    const eventIds = events.map((event) => event.eventId);
    const [deliverables, closeConditions] = await Promise.all([
      this.db.client.projectDeliverable.findMany({
        where: {
          projectId,
          isActive: true,
          eventId: { in: eventIds },
        },
        select: {
          eventId: true,
          statusCode: true,
          submissionStatusCode: true,
        },
      }),
      this.db.client.projectCloseCondition.findMany({
        where: {
          projectId,
          isActive: true,
          eventId: { in: eventIds },
        },
        select: {
          eventId: true,
          statusCode: true,
          isChecked: true,
          requiresDeliverable: true,
        },
      }),
    ]);

    const deliverablesByEvent = new Map<
      string,
      Array<{
        eventId: bigint | null;
        statusCode: string;
        submissionStatusCode: string;
      }>
    >();
    for (const deliverable of deliverables) {
      if (!deliverable.eventId) {
        continue;
      }

      const key = deliverable.eventId.toString();
      const existing = deliverablesByEvent.get(key);
      if (existing) {
        existing.push(deliverable);
      } else {
        deliverablesByEvent.set(key, [deliverable]);
      }
    }

    const closeConditionsByEvent = new Map<
      string,
      Array<{
        eventId: bigint | null;
        statusCode: string;
        isChecked: boolean;
        requiresDeliverable: boolean;
      }>
    >();
    for (const closeCondition of closeConditions) {
      if (!closeCondition.eventId) {
        continue;
      }

      const key = closeCondition.eventId.toString();
      const existing = closeConditionsByEvent.get(key);
      if (existing) {
        existing.push(closeCondition);
      } else {
        closeConditionsByEvent.set(key, [closeCondition]);
      }
    }

    return events.map((event) => {
      const eventKey = event.eventId.toString();
      const linkedDeliverables = deliverablesByEvent.get(eventKey) ?? [];
      const linkedCloseConditions = closeConditionsByEvent.get(eventKey) ?? [];
      const completedDeliverables = linkedDeliverables.filter((deliverable) =>
        isDeliverableSubmissionCompleted(deliverable.submissionStatusCode),
      ).length;
      const checkedCloseConditions = linkedCloseConditions.filter((condition) => condition.isChecked).length;
      const deliverableStatusCounts = linkedDeliverables.reduce<Record<string, number>>(
        (counts, deliverable) => ({
          ...counts,
          [deliverable.submissionStatusCode]:
            (counts[deliverable.submissionStatusCode] ?? 0) + 1,
        }),
        {},
      );
      const blockingDeliverables = linkedDeliverables.length - completedDeliverables;
      const blockingCloseConditions = linkedCloseConditions.length - checkedCloseConditions;

      return {
        ...event,
        rollup: {
          statusCodes: this.collectLinkedStatusCodes(linkedDeliverables, linkedCloseConditions),
          deliverables: {
            total: linkedDeliverables.length,
            completed: completedDeliverables,
            pending: blockingDeliverables,
            byStatus: deliverableStatusCounts,
          },
          closeConditions: {
            total: linkedCloseConditions.length,
            checked: checkedCloseConditions,
            unchecked: blockingCloseConditions,
            requiresDeliverable: linkedCloseConditions.filter((condition) => condition.requiresDeliverable).length,
          },
          readiness: {
            isReady: blockingDeliverables === 0 && blockingCloseConditions === 0,
            blockingDeliverables,
            blockingCloseConditions,
          },
        },
      };
    });
  }

  async createEvent(projectId: bigint, dto: CreateProjectEventDto) {
    return this.db.client.projectEvent.create({
      data: {
        projectId,
        eventCode: dto.eventCode,
        eventName: dto.eventName,
        description: dto.description,
        eventTypeCode: dto.eventTypeCode ?? 'general',
        statusCode: dto.statusCode ?? 'planned',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : null,
        summary: dto.summary,
        ownerUserId: dto.ownerUserId ? BigInt(dto.ownerUserId) : null,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async updateEvent(projectId: bigint, eventId: bigint, dto: UpdateProjectEventDto) {
    await this.findEvent(projectId, eventId);
    return this.db.client.projectEvent.update({
      where: { eventId },
      data: {
        ...(dto.eventName !== undefined && { eventName: dto.eventName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.eventTypeCode !== undefined && { eventTypeCode: dto.eventTypeCode }),
        ...(dto.statusCode !== undefined && { statusCode: dto.statusCode }),
        ...(dto.scheduledAt !== undefined && { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }),
        ...(dto.occurredAt !== undefined && { occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : null }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.ownerUserId !== undefined && { ownerUserId: dto.ownerUserId ? BigInt(dto.ownerUserId) : null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  async removeEvent(projectId: bigint, eventId: bigint) {
    await this.findEvent(projectId, eventId);
    return this.db.client.projectEvent.delete({ where: { eventId } });
  }

  private async findProjectIssue(projectId: bigint, projectIssueId: bigint) {
    const projectIssue = await this.db.client.projectIssue.findFirst({
      where: { projectIssueId, projectId, isActive: true },
    });

    if (!projectIssue) {
      throw new NotFoundException(`ProjectIssue ${projectIssueId} not found`);
    }

    return projectIssue;
  }

  private async findRequirement(projectId: bigint, requirementId: bigint) {
    const requirement = await this.db.client.projectRequirement.findFirst({
      where: { requirementId, projectId, isActive: true },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement ${requirementId} not found`);
    }

    return requirement;
  }

  private async findRisk(projectId: bigint, riskId: bigint) {
    const risk = await this.db.client.projectRisk.findFirst({
      where: { riskId, projectId, isActive: true },
    });

    if (!risk) {
      throw new NotFoundException(`Risk ${riskId} not found`);
    }

    return risk;
  }

  private async findChangeRequest(projectId: bigint, changeRequestId: bigint) {
    const changeRequest = await this.db.client.projectChangeRequest.findFirst({
      where: { changeRequestId, projectId, isActive: true },
    });

    if (!changeRequest) {
      throw new NotFoundException(`ChangeRequest ${changeRequestId} not found`);
    }

    return changeRequest;
  }

  private async findEvent(projectId: bigint, eventId: bigint) {
    const event = await this.db.client.projectEvent.findFirst({
      where: { eventId, projectId, isActive: true },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    return event;
  }

  private collectLinkedStatusCodes(
    deliverables: Array<{ statusCode: string }>,
    closeConditions: Array<{ statusCode: string }>,
  ): string[] {
    return Array.from(
      new Set([
        ...deliverables.map((deliverable) => deliverable.statusCode),
        ...closeConditions.map((closeCondition) => closeCondition.statusCode),
      ]),
    ).sort((left, right) => {
      const leftOrder = PROJECT_STATUS_CODE_ORDER[left] ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = PROJECT_STATUS_CODE_ORDER[right] ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.localeCompare(right);
    });
  }

  private resolveProjectIssueOwnerUserId(
    ownerUserId?: string | null,
    assigneeUserId?: string | null,
  ) {
    const resolvedOwnerUserId = ownerUserId !== undefined ? ownerUserId : assigneeUserId;
    return resolvedOwnerUserId ? BigInt(resolvedOwnerUserId) : null;
  }
}
