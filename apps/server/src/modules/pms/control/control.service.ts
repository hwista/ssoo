import { PmsWorkNotificationService } from '../settings/work-notification.service.js';
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import { CommonNotificationService } from '../../common/notification/notification.service.js';
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

const PMR_PRR_WORKFLOW_MEMO = 'pmr-prr-workflow';

const PMR_PRR_WORKFLOW_STATUS_LABELS: Record<string, string> = {
  planned: '발행 예정',
  approval_requested: '승인 요청',
  approved: '승인 완료',
  rejected: '반려',
  completed: '발행 완료',
};

const PMR_PRR_WORKFLOW_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  planned: ['approval_requested'],
  rejected: ['approval_requested'],
  approval_requested: ['approved', 'rejected'],
  approved: ['completed'],
  completed: [],
};

const PMR_PRR_APPROVER_DECISION_STATUS_CODES = new Set(['approved', 'rejected']);

const PMR_PRR_NOTIFY_PROJECT_OWNER_LABEL = '승인자와 프로젝트 담당자 알림';
const PMR_PRR_NOTIFY_ACTIVE_MEMBERS_LABEL = '결재선과 활성 멤버 알림';
const DEFAULT_PMR_PRR_ROLLOVER_BATCH_LIMIT = 20;
const MAX_PMR_PRR_ROLLOVER_BATCH_LIMIT = 100;

export interface PmrPrrWorkflowRolloverRunSummary {
  trigger: string;
  executedAt: string;
  scannedCount: number;
  rolledOverCount: number;
  skippedCount: number;
  eventIds: string[];
}

@Injectable()
export class ControlService {
  private readonly logger = new Logger(ControlService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: CommonNotificationService,
    private readonly workNotifications: PmsWorkNotificationService,
  ) {}

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
    actorUserId: bigint,
  ) {
    const { issue, notifications } = await this.db.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT project_issue_id FROM pms.pr_project_issue_m WHERE project_issue_id = ${projectIssueId} AND project_id = ${projectId} FOR UPDATE`;
      const existing = await tx.projectIssue.findFirst({ where: { projectIssueId, projectId } });
      if (!existing) throw new NotFoundException('프로젝트 이슈를 찾을 수 없습니다.');
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

      const issue = await tx.projectIssue.update({
        where: { projectIssueId },
        data,
      });
      const fields = ['issueTitle', 'description', 'issueTypeCode', 'statusCode', 'priorityCode', 'ownerUserId', 'dueAt', 'resolvedAt', 'resolution'] as const;
      const value = (item: unknown) => item instanceof Date ? item.toISOString() : item;
      const changed = fields.some((key) => value(existing[key]) !== value(issue[key]));
      const notifications = changed && issue.isActive
        ? await this.workNotifications.create(tx, {
            projectId, actorUserId, recipients: [issue.ownerUserId, issue.reportedByUserId],
            kind: 'issue-update', referenceId: issue.projectIssueId, title: issue.issueTitle,
          }) : [];
      return { issue, notifications };
    });
    this.workNotifications.publish(notifications);
    return issue;
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
    const event = await this.db.client.projectEvent.create({
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

    await this.notifyPmrPrrWorkflowOwner(event, 'created');
    return event;
  }

  async updateEvent(
    projectId: bigint,
    eventId: bigint,
    dto: UpdateProjectEventDto,
    actorUserId?: bigint,
  ) {
    const previous = await this.findEvent(projectId, eventId);
    this.assertPmrPrrWorkflowUpdateAllowed(previous, dto, actorUserId);
    const event = await this.db.client.projectEvent.update({
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

    await this.notifyPmrPrrWorkflowOwner(event, previous.statusCode === event.statusCode ? 'updated' : 'status');
    return event;
  }

  async runDuePmrPrrWorkflowRollover({
    projectId,
    now = new Date(),
    limit = DEFAULT_PMR_PRR_ROLLOVER_BATCH_LIMIT,
    trigger = 'manual',
  }: {
    projectId?: bigint;
    now?: Date;
    limit?: number;
    trigger?: string;
  } = {}): Promise<PmrPrrWorkflowRolloverRunSummary> {
    const batchLimit = this.normalizePmrPrrRolloverBatchLimit(limit);
    const dueEvents = await this.db.client.projectEvent.findMany({
      where: {
        ...(projectId !== undefined && { projectId }),
        isActive: true,
        memo: PMR_PRR_WORKFLOW_MEMO,
        statusCode: 'planned',
        ownerUserId: { not: null },
        scheduledAt: { lte: now },
      },
      orderBy: [
        { scheduledAt: 'asc' },
        { eventId: 'asc' },
      ],
      take: batchLimit,
    });
    const rolledOverEventIds: string[] = [];
    let skippedCount = 0;

    for (const dueEvent of dueEvents) {
      const summary = this.appendPmrPrrWorkflowRolloverSummary(dueEvent.summary, now);
      const updated = await this.db.client.projectEvent.updateMany({
        where: {
          eventId: dueEvent.eventId,
          isActive: true,
          memo: PMR_PRR_WORKFLOW_MEMO,
          statusCode: 'planned',
        },
        data: {
          statusCode: 'approval_requested',
          occurredAt: now,
          summary,
        },
      });

      if (updated.count !== 1) {
        skippedCount += 1;
        continue;
      }

      const rolledOverEvent = await this.db.client.projectEvent.findUnique({
        where: { eventId: dueEvent.eventId },
      });
      if (!rolledOverEvent) {
        skippedCount += 1;
        continue;
      }

      rolledOverEventIds.push(rolledOverEvent.eventId.toString());
      await this.notifyPmrPrrWorkflowOwner(rolledOverEvent, 'status');
    }

    return {
      trigger,
      executedAt: now.toISOString(),
      scannedCount: dueEvents.length,
      rolledOverCount: rolledOverEventIds.length,
      skippedCount,
      eventIds: rolledOverEventIds,
    };
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

  private normalizePmrPrrRolloverBatchLimit(limit: number): number {
    if (!Number.isFinite(limit)) {
      return DEFAULT_PMR_PRR_ROLLOVER_BATCH_LIMIT;
    }

    return Math.max(1, Math.min(Math.floor(limit), MAX_PMR_PRR_ROLLOVER_BATCH_LIMIT));
  }

  private appendPmrPrrWorkflowRolloverSummary(summary: string | null, now: Date): string {
    const trimmedSummary = summary?.trim();
    const rolloverMarker = `자동 승인 요청: ${now.toISOString()}`;
    return trimmedSummary ? `${trimmedSummary} · ${rolloverMarker}` : rolloverMarker;
  }

  private assertPmrPrrWorkflowUpdateAllowed(
    event: {
      statusCode: string;
      ownerUserId: bigint | null;
      memo: string | null;
    },
    dto: UpdateProjectEventDto,
    actorUserId?: bigint,
  ): void {
    if (event.memo !== PMR_PRR_WORKFLOW_MEMO) {
      return;
    }

    if (dto.ownerUserId === null && event.statusCode !== 'completed') {
      throw new BadRequestException('PMR/PRR 워크플로우에는 승인자가 필요합니다.');
    }

    if (dto.statusCode === undefined || dto.statusCode === event.statusCode) {
      return;
    }

    const nextStatusCode = dto.statusCode;
    const allowedNextStatusCodes = PMR_PRR_WORKFLOW_ALLOWED_TRANSITIONS[event.statusCode];
    if (!allowedNextStatusCodes || !allowedNextStatusCodes.includes(nextStatusCode)) {
      const fromLabel = PMR_PRR_WORKFLOW_STATUS_LABELS[event.statusCode] ?? event.statusCode;
      const toLabel = PMR_PRR_WORKFLOW_STATUS_LABELS[nextStatusCode] ?? nextStatusCode;
      throw new BadRequestException(
        `PMR/PRR 워크플로우는 ${fromLabel}에서 ${toLabel} 상태로 전환할 수 없습니다.`,
      );
    }

    if (nextStatusCode === 'approval_requested' && !event.ownerUserId && !dto.ownerUserId) {
      throw new BadRequestException('PMR/PRR 승인 요청에는 승인자가 필요합니다.');
    }

    if (
      PMR_PRR_APPROVER_DECISION_STATUS_CODES.has(nextStatusCode)
      && (!event.ownerUserId || event.ownerUserId !== actorUserId)
    ) {
      throw new ForbiddenException('PMR/PRR 승인·반려는 지정 승인자만 처리할 수 있습니다.');
    }
  }

  private async notifyPmrPrrWorkflowOwner(
    event: {
      eventId: bigint;
      projectId: bigint;
      eventName: string;
      statusCode: string;
      summary: string | null;
      ownerUserId: bigint | null;
      memo: string | null;
    },
    reason: 'created' | 'updated' | 'status',
  ): Promise<void> {
    if (event.memo !== PMR_PRR_WORKFLOW_MEMO) {
      return;
    }

    const statusLabel = PMR_PRR_WORKFLOW_STATUS_LABELS[event.statusCode] ?? event.statusCode;
    const title = reason === 'created'
      ? 'PMR/PRR 발행 결재선 지정'
      : `PMR/PRR 발행 ${statusLabel}`;

    try {
      const recipientUserIds = await this.resolvePmrPrrWorkflowRecipientUserIds(event);
      if (recipientUserIds.length === 0) {
        return;
      }

      await this.notificationService.notifyMany(
        recipientUserIds.map((recipientUserId) => ({
          recipientUserId,
          sourceApp: 'pms',
          notificationType: 'pms.pmr-prr.workflow',
          severity: event.statusCode === 'rejected' ? 'warning' : 'info',
          title,
          message: event.summary || event.eventName,
          reference: {
            type: 'pms.project-event',
            id: event.eventId.toString(),
            path: `/?projectId=${event.projectId.toString()}&tab=review`,
          },
          action: {
            type: 'open-pms-reference',
            label: '리뷰 탭 열기',
            payload: {
              path: `/?projectId=${event.projectId.toString()}&tab=review`,
              projectId: event.projectId.toString(),
              eventId: event.eventId.toString(),
            },
          },
          dedupeKey: `pms:pmr-prr-workflow:${event.eventId.toString()}:${event.statusCode}`,
        })),
      );
    } catch (error) {
      this.logger.warn(
        `PMR/PRR 워크플로우 알림 생성 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async resolvePmrPrrWorkflowRecipientUserIds(event: {
    projectId: bigint;
    summary: string | null;
    ownerUserId: bigint | null;
  }): Promise<bigint[]> {
    const recipientIds = new Set<string>();
    if (event.ownerUserId) {
      recipientIds.add(event.ownerUserId.toString());
    }

    const summary = event.summary ?? '';
    const shouldNotifyProjectOwner = summary.includes(PMR_PRR_NOTIFY_PROJECT_OWNER_LABEL);
    const shouldNotifyActiveMembers = summary.includes(PMR_PRR_NOTIFY_ACTIVE_MEMBERS_LABEL);

    if (!shouldNotifyProjectOwner && !shouldNotifyActiveMembers) {
      return [...recipientIds].map((id) => BigInt(id));
    }

    const project = await this.db.client.project.findFirst({
      where: { id: event.projectId, isActive: true },
      select: {
        currentOwnerUserId: true,
        projectMembers: {
          where: { isActive: true },
          select: {
            userId: true,
            accessLevel: true,
          },
        },
      },
    });

    if (!project) {
      return [...recipientIds].map((id) => BigInt(id));
    }

    if (project.currentOwnerUserId) {
      recipientIds.add(project.currentOwnerUserId.toString());
    }

    for (const member of project.projectMembers) {
      if (shouldNotifyActiveMembers || member.accessLevel === 'owner') {
        recipientIds.add(member.userId.toString());
      }
    }

    return [...recipientIds].map((id) => BigInt(id));
  }
}
