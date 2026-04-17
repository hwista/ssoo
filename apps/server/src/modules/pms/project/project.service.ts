import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { ExtendedPrismaClient, Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import {
  COMPLETED_DELIVERABLE_SUBMISSION_STATUSES,
  isDeliverableSubmissionCompleted,
} from '../deliverable/deliverable.constants.js';
import type {
  CreateProjectDto,
  UpdateProjectDto,
  PaginationParams,
  UpsertRequestDetailDto,
  UpsertProposalDetailDto,
  UpsertExecutionDetailDto,
  UpsertTransitionDetailDto,
  AdvanceStageDto,
  ProjectStatusCode,
  DoneResultCode,
} from '@ssoo/types';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import { ProjectOrgService } from './project-org.service.js';
import { ProjectRelationService } from './project-relation.service.js';

// 각 상태에서 허용되는 doneResultCode
const VALID_DONE_RESULTS: Record<ProjectStatusCode, DoneResultCode[]> = {
  request: ['accepted', 'rejected', 'hold'],
  proposal: ['won', 'lost', 'hold'],
  execution: ['completed', 'transfer_pending', 'linked', 'cancelled', 'hold'],
  transition: ['transferred', 'cancelled'],
};

// doneResultCode → 다음 상태로 전이 매핑 (null이면 종료)
const NEXT_STATUS_MAP: Partial<Record<DoneResultCode, ProjectStatusCode>> = {
  accepted: 'proposal',
  won: 'execution',
  transfer_pending: 'transition',
};

// 상태별 기본 목표 텍스트
const DEFAULT_STATUS_GOALS: Record<ProjectStatusCode, string> = {
  request: '고객 요청을 접수하고 사업 기회를 평가합니다.',
  proposal: '견적/제안서를 작성하고 계약을 협상합니다.',
  execution: '프로젝트를 수행하고 결과물을 산출합니다.',
  transition: '프로젝트를 종료하고 운영/유지보수로 전환합니다.',
};

type TxClient = Omit<
  ExtendedPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class ProjectService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessFoundationService: AccessFoundationService,
    private readonly projectOrgService: ProjectOrgService,
    private readonly projectRelationService: ProjectRelationService,
  ) {}

  async findAll(
    params: PaginationParams & { statusCode?: string },
    currentUser: TokenPayload,
  ) {
    const pageValue = Number(params.page);
    const limitValue = Number(params.limit);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 10;
    const skip = (page - 1) * limit;
    const where = await this.buildProjectListWhere(params, currentUser);

    const [data, total] = await Promise.all([
      this.db.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requestDetail: true,
          proposalDetail: true,
          executionDetail: true,
          transitionDetail: true,
          projectStatuses: true,
        },
      }),
      this.db.project.count({ where }),
    ]);

    return { data, total };
  }

  private async buildProjectListWhere(
    params: PaginationParams & { statusCode?: string },
    currentUser: TokenPayload,
  ): Promise<Prisma.ProjectWhereInput> {
    const baseWhere: Prisma.ProjectWhereInput = {
      ...(params.statusCode && { statusCode: params.statusCode }),
    };

    const actionContext =
      await this.accessFoundationService.resolveActionPermissionContext(currentUser);
    if (actionContext.policy.hasSystemOverride) {
      return baseWhere;
    }

    const userId = BigInt(currentUser.userId);
    const now = new Date();
    const userOrgIds = await this.accessFoundationService.getUserOrganizationIds(userId, now);
    const accessFilters: Prisma.ProjectWhereInput[] = [
      { currentOwnerUserId: userId },
      {
        projectMembers: {
          some: {
            userId,
            isActive: true,
            OR: [{ releasedAt: null }, { releasedAt: { gte: now } }],
          },
        },
      },
    ];

    if (userOrgIds.length > 0) {
      accessFilters.push({
        ownerOrganizationId: { in: userOrgIds },
      });
    }

    return {
      ...baseWhere,
      OR: accessFilters,
    };
  }
  async findOne(id: bigint) {
    return this.db.project.findUnique({
      where: { id },
      include: {
        requestDetail: true,
        proposalDetail: true,
        executionDetail: true,
        transitionDetail: true,
        projectStatuses: {
          orderBy: { statusCode: 'asc' },
        },
      },
    });
  }

  async create(dto: CreateProjectDto, actorUserId: bigint) {
    const ownerOrganizationId = await this.resolveCreateOwnerOrganizationId(dto, actorUserId);

    return this.db.client.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          projectName: dto.projectName,
          statusCode: dto.statusCode || 'request',
          stageCode: dto.stageCode || 'waiting',
          currentOwnerUserId: dto.ownerId ? BigInt(dto.ownerId) : null,
          ownerOrganizationId,
          customerId: dto.customerId ? BigInt(dto.customerId) : null,
          memo: dto.description,
        },
      });

      await this.projectOrgService.syncCompatibilityProjectOrgs(project.id, tx, {
        strict: true,
      });

      return project;
    });
  }

  async update(id: bigint, dto: UpdateProjectDto, actorUserId: bigint) {
    const ownerOrganizationId = await this.resolveUpdateOwnerOrganizationId(dto, actorUserId);
    const existing = await this.db.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    return this.db.client.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id },
        data: {
          ...(dto.projectName && { projectName: dto.projectName }),
          ...(dto.description !== undefined && { memo: dto.description }),
          ...(dto.customerId !== undefined && { customerId: dto.customerId ? BigInt(dto.customerId) : null }),
          ...(dto.statusCode && { statusCode: dto.statusCode }),
          ...(dto.stageCode && { stageCode: dto.stageCode }),
          ...(dto.doneResultCode !== undefined && { doneResultCode: dto.doneResultCode }),
          ...(dto.ownerId && { currentOwnerUserId: BigInt(dto.ownerId) }),
          ...(ownerOrganizationId !== undefined && { ownerOrganizationId }),
        },
      });

      await this.projectOrgService.syncCompatibilityProjectOrgs(project.id, tx, {
        strict: true,
      });

      return project;
    });
  }

  async remove(id: bigint): Promise<boolean> {
    try {
      await this.db.project.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ─── 단계별 상세 Upsert ───

  async upsertRequestDetail(projectId: bigint, dto: UpsertRequestDetailDto) {
    return this.db.client.projectRequestDetail.upsert({
      where: { projectId },
      create: {
        projectId,
        ...(dto.requestSourceCode && { requestSourceCode: dto.requestSourceCode }),
        ...(dto.requestChannelCode && { requestChannelCode: dto.requestChannelCode }),
        ...(dto.requestSummary !== undefined && { requestSummary: dto.requestSummary }),
        ...(dto.requestReceivedAt && { requestReceivedAt: new Date(dto.requestReceivedAt) }),
        ...(dto.requestPriorityCode && { requestPriorityCode: dto.requestPriorityCode }),
        ...(dto.requestOwnerUserId && { requestOwnerUserId: BigInt(dto.requestOwnerUserId) }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
      update: {
        ...(dto.requestSourceCode !== undefined && { requestSourceCode: dto.requestSourceCode || null }),
        ...(dto.requestChannelCode !== undefined && { requestChannelCode: dto.requestChannelCode || null }),
        ...(dto.requestSummary !== undefined && { requestSummary: dto.requestSummary || null }),
        ...(dto.requestReceivedAt !== undefined && { requestReceivedAt: dto.requestReceivedAt ? new Date(dto.requestReceivedAt) : null }),
        ...(dto.requestPriorityCode !== undefined && { requestPriorityCode: dto.requestPriorityCode || null }),
        ...(dto.requestOwnerUserId !== undefined && { requestOwnerUserId: dto.requestOwnerUserId ? BigInt(dto.requestOwnerUserId) : null }),
        ...(dto.memo !== undefined && { memo: dto.memo || null }),
      },
    });
  }

  async upsertProposalDetail(projectId: bigint, dto: UpsertProposalDetailDto) {
    return this.db.client.projectProposalDetail.upsert({
      where: { projectId },
      create: {
        projectId,
        ...(dto.proposalOwnerUserId && { proposalOwnerUserId: BigInt(dto.proposalOwnerUserId) }),
        ...(dto.proposalDueAt && { proposalDueAt: new Date(dto.proposalDueAt) }),
        ...(dto.proposalSubmittedAt && { proposalSubmittedAt: new Date(dto.proposalSubmittedAt) }),
        ...(dto.proposalVersion !== undefined && { proposalVersion: dto.proposalVersion }),
        ...(dto.estimateAmount && { estimateAmount: BigInt(dto.estimateAmount) }),
        ...(dto.estimateUnitCode && { estimateUnitCode: dto.estimateUnitCode }),
        ...(dto.proposalScopeSummary !== undefined && { proposalScopeSummary: dto.proposalScopeSummary }),
        ...(dto.decisionDeadlineAt && { decisionDeadlineAt: new Date(dto.decisionDeadlineAt) }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
      update: {
        ...(dto.proposalOwnerUserId !== undefined && { proposalOwnerUserId: dto.proposalOwnerUserId ? BigInt(dto.proposalOwnerUserId) : null }),
        ...(dto.proposalDueAt !== undefined && { proposalDueAt: dto.proposalDueAt ? new Date(dto.proposalDueAt) : null }),
        ...(dto.proposalSubmittedAt !== undefined && { proposalSubmittedAt: dto.proposalSubmittedAt ? new Date(dto.proposalSubmittedAt) : null }),
        ...(dto.proposalVersion !== undefined && { proposalVersion: dto.proposalVersion }),
        ...(dto.estimateAmount !== undefined && { estimateAmount: dto.estimateAmount ? BigInt(dto.estimateAmount) : null }),
        ...(dto.estimateUnitCode !== undefined && { estimateUnitCode: dto.estimateUnitCode || null }),
        ...(dto.proposalScopeSummary !== undefined && { proposalScopeSummary: dto.proposalScopeSummary || null }),
        ...(dto.decisionDeadlineAt !== undefined && { decisionDeadlineAt: dto.decisionDeadlineAt ? new Date(dto.decisionDeadlineAt) : null }),
        ...(dto.memo !== undefined && { memo: dto.memo || null }),
      },
    });
  }

  async upsertExecutionDetail(projectId: bigint, dto: UpsertExecutionDetailDto) {
    return this.db.client.$transaction(async (tx) => {
      const detail = await tx.projectExecutionDetail.upsert({
        where: { projectId },
        create: {
          projectId,
          ...(dto.contractSignedAt && { contractSignedAt: new Date(dto.contractSignedAt) }),
          ...(dto.contractAmount && { contractAmount: BigInt(dto.contractAmount) }),
          ...(dto.contractUnitCode && { contractUnitCode: dto.contractUnitCode }),
          ...(dto.billingTypeCode && { billingTypeCode: dto.billingTypeCode }),
          ...(dto.deliveryMethodCode && { deliveryMethodCode: dto.deliveryMethodCode }),
          ...(dto.nextProjectId && { nextProjectId: BigInt(dto.nextProjectId) }),
          ...(dto.memo !== undefined && { memo: dto.memo }),
        },
        update: {
          ...(dto.contractSignedAt !== undefined && { contractSignedAt: dto.contractSignedAt ? new Date(dto.contractSignedAt) : null }),
          ...(dto.contractAmount !== undefined && { contractAmount: dto.contractAmount ? BigInt(dto.contractAmount) : null }),
          ...(dto.contractUnitCode !== undefined && { contractUnitCode: dto.contractUnitCode || null }),
          ...(dto.billingTypeCode !== undefined && { billingTypeCode: dto.billingTypeCode || null }),
          ...(dto.deliveryMethodCode !== undefined && { deliveryMethodCode: dto.deliveryMethodCode || null }),
          ...(dto.nextProjectId !== undefined && { nextProjectId: dto.nextProjectId ? BigInt(dto.nextProjectId) : null }),
          ...(dto.memo !== undefined && { memo: dto.memo || null }),
        },
      });

      await this.syncPrimaryContractFromExecutionDetail(tx, projectId, detail);
      await this.projectRelationService.syncCompatibilityProjectRelations(projectId, tx, {
        strict: true,
      });
      return detail;
    });
  }

  async upsertTransitionDetail(projectId: bigint, dto: UpsertTransitionDetailDto) {
    return this.db.client.projectTransitionDetail.upsert({
      where: { projectId },
      create: {
        projectId,
        ...(dto.operationOwnerUserId && { operationOwnerUserId: BigInt(dto.operationOwnerUserId) }),
        ...(dto.operationReservedAt && { operationReservedAt: new Date(dto.operationReservedAt) }),
        ...(dto.operationStartAt && { operationStartAt: new Date(dto.operationStartAt) }),
        ...(dto.transitionDueAt && { transitionDueAt: new Date(dto.transitionDueAt) }),
        ...(dto.transitionSummary !== undefined && { transitionSummary: dto.transitionSummary }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
      update: {
        ...(dto.operationOwnerUserId !== undefined && { operationOwnerUserId: dto.operationOwnerUserId ? BigInt(dto.operationOwnerUserId) : null }),
        ...(dto.operationReservedAt !== undefined && { operationReservedAt: dto.operationReservedAt ? new Date(dto.operationReservedAt) : null }),
        ...(dto.operationStartAt !== undefined && { operationStartAt: dto.operationStartAt ? new Date(dto.operationStartAt) : null }),
        ...(dto.transitionDueAt !== undefined && { transitionDueAt: dto.transitionDueAt ? new Date(dto.transitionDueAt) : null }),
        ...(dto.transitionSummary !== undefined && { transitionSummary: dto.transitionSummary || null }),
        ...(dto.memo !== undefined && { memo: dto.memo || null }),
      },
    });
  }

  // ─── 상태 전이 엔진 ───

  async advanceStage(projectId: bigint, dto: AdvanceStageDto) {
    const project = await this.db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const currentStatus = project.statusCode as ProjectStatusCode;
    const currentStage = project.stageCode;
    const { targetStage, doneResultCode, statusGoal } = dto;

    // 1. 기본 전이 검증
    if (currentStage === 'done') {
      throw new BadRequestException(
        `현재 상태(${currentStatus})가 이미 완료되었습니다. 새로운 상태로 전이가 필요합니다.`,
      );
    }

    if (targetStage === 'in_progress' && currentStage !== 'waiting') {
      throw new BadRequestException(
        `'in_progress'로 전이하려면 현재 단계가 'waiting'이어야 합니다. (현재: ${currentStage})`,
      );
    }

    if (targetStage === 'done' && currentStage !== 'in_progress') {
      throw new BadRequestException(
        `'done'으로 전이하려면 현재 단계가 'in_progress'여야 합니다. (현재: ${currentStage})`,
      );
    }

    // 2. done 전이 시 doneResultCode 검증
    if (targetStage === 'done') {
      if (!doneResultCode) {
        throw new BadRequestException(
          `'done'으로 전이 시 doneResultCode가 필수입니다. 허용값: ${VALID_DONE_RESULTS[currentStatus].join(', ')}`,
        );
      }

      const validResults = VALID_DONE_RESULTS[currentStatus];
      if (!validResults.includes(doneResultCode)) {
        throw new BadRequestException(
          `상태 '${currentStatus}'에서 허용되지 않는 결과 코드입니다: '${doneResultCode}'. 허용값: ${validResults.join(', ')}`,
        );
      }

      // 2-a. 산출물 완료 여부 검증 (soft: 등록된 산출물이 있을 때만)
      const pendingDeliverables = await this.db.client.projectDeliverable.findMany({
        where: {
          projectId,
          statusCode: currentStatus,
          isActive: true,
          submissionStatusCode: { notIn: [...COMPLETED_DELIVERABLE_SUBMISSION_STATUSES] },
        },
      });

      if (pendingDeliverables.length > 0) {
        throw new BadRequestException(
          `미완료 산출물이 ${pendingDeliverables.length}건 있습니다. 모든 산출물을 제출/승인 후 완료할 수 있습니다.`,
        );
      }

      // 2-b. 종료조건 충족 여부 검증 (soft: 등록된 조건이 있을 때만)
      const uncheckedConditions = await this.db.client.projectCloseCondition.findMany({
        where: {
          projectId,
          statusCode: currentStatus,
          isActive: true,
          isChecked: false,
        },
      });

      if (uncheckedConditions.length > 0) {
        throw new BadRequestException(
          `미충족 종료조건이 ${uncheckedConditions.length}건 있습니다. 모든 종료조건을 확인 후 완료할 수 있습니다.`,
        );
      }
    }

    // 3. 트랜잭션으로 전이 수행
    let advancedToNextStatus = false;
    let newStatusCode = currentStatus;

    await this.db.client.$transaction(async (tx) => {
      // 3-a. 현재 ProjectStatus의 actualEndAt 기록 (done 전이 시)
      if (targetStage === 'done') {
        await tx.projectStatus.updateMany({
          where: { projectId, statusCode: currentStatus },
          data: { actualEndAt: new Date() },
        });
      }

      // 3-b. 현재 ProjectStatus의 actualStartAt 기록 (in_progress 전이 시)
      if (targetStage === 'in_progress') {
        await tx.projectStatus.updateMany({
          where: { projectId, statusCode: currentStatus, actualStartAt: null },
          data: { actualStartAt: new Date() },
        });
      }

      // 3-c. 프로젝트 stageCode + doneResultCode 업데이트
      await tx.project.update({
        where: { id: projectId },
        data: {
          stageCode: targetStage,
          ...(doneResultCode && { doneResultCode }),
        },
      });

      // 3-d. done + 다음 상태 전이가 있는 경우 → 자동 진행
      if (targetStage === 'done' && doneResultCode) {
        const nextStatus = NEXT_STATUS_MAP[doneResultCode];

        if (nextStatus) {
          advancedToNextStatus = true;
          newStatusCode = nextStatus;

          // 프로젝트 statusCode를 다음 상태로, stageCode를 waiting으로 리셋
          await tx.project.update({
            where: { id: projectId },
            data: {
              statusCode: nextStatus,
              stageCode: 'waiting',
              doneResultCode: null,
            },
          });

          // 다음 상태의 ProjectStatus 레코드 생성
          await tx.projectStatus.upsert({
            where: {
              pk_pr_project_status_m: { projectId, statusCode: nextStatus },
            },
            create: {
              projectId,
              statusCode: nextStatus,
              statusGoal: statusGoal || DEFAULT_STATUS_GOALS[nextStatus],
            },
            update: {},
          });

          // 다음 상태의 Detail 테이블 초기 레코드 생성
          await this.initializeDetailForStatus(tx, projectId, nextStatus);
        }
      }
    });

    return {
      previousStatusCode: currentStatus,
      previousStageCode: currentStage,
      currentStatusCode: advancedToNextStatus ? newStatusCode : currentStatus,
      currentStageCode: advancedToNextStatus ? 'waiting' : targetStage,
      doneResultCode: advancedToNextStatus ? null : (doneResultCode ?? null),
      advancedToNextStatus,
    };
  }

  // ─── 전이 준비 상태 조회 ───

  async checkTransitionReadiness(projectId: bigint) {
    const project = await this.db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const currentStatus = project.statusCode;

    const deliverables = await this.db.client.projectDeliverable.findMany({
      where: { projectId, statusCode: currentStatus, isActive: true },
    });

    const closeConditions = await this.db.client.projectCloseCondition.findMany({
      where: { projectId, statusCode: currentStatus, isActive: true },
    });

    const pendingDeliverables = deliverables.filter(
      (d) => !isDeliverableSubmissionCompleted(d.submissionStatusCode),
    );
    const uncheckedConditions = closeConditions.filter((c) => !c.isChecked);

    return {
      canComplete: pendingDeliverables.length === 0 && uncheckedConditions.length === 0,
      deliverables: {
        total: deliverables.length,
        approved: deliverables.filter((d) => d.submissionStatusCode === 'approved').length,
        pending: pendingDeliverables.length,
      },
      closeConditions: {
        total: closeConditions.length,
        checked: closeConditions.filter((c) => c.isChecked).length,
        unchecked: uncheckedConditions.length,
      },
    };
  }

  // 다음 상태 진입 시 Detail 테이블 초기화
  private async initializeDetailForStatus(
    tx: Parameters<Parameters<DatabaseService['client']['$transaction']>[0]>[0],
    projectId: bigint,
    statusCode: ProjectStatusCode,
  ) {
    switch (statusCode) {
      case 'proposal':
        await tx.projectProposalDetail.upsert({
          where: { projectId },
          create: { projectId },
          update: {},
        });
        break;
      case 'execution':
        await tx.projectExecutionDetail.upsert({
          where: { projectId },
          create: { projectId },
          update: {},
        });
        break;
      case 'transition':
        await tx.projectTransitionDetail.upsert({
          where: { projectId },
          create: { projectId },
          update: {},
        });
        break;
    }
  }

  private async resolveCreateOwnerOrganizationId(
    dto: CreateProjectDto,
    actorUserId: bigint,
  ): Promise<bigint | null> {
    if (dto.ownerOrganizationId) {
      return BigInt(dto.ownerOrganizationId);
    }

    const ownerUserId = dto.ownerId ? BigInt(dto.ownerId) : actorUserId;
    return this.findPrimaryOrganizationId(ownerUserId);
  }

  private async resolveUpdateOwnerOrganizationId(
    dto: UpdateProjectDto,
    _actorUserId: bigint,
  ): Promise<bigint | null | undefined> {
    if (dto.ownerOrganizationId !== undefined) {
      return dto.ownerOrganizationId ? BigInt(dto.ownerOrganizationId) : null;
    }

    if (dto.ownerId) {
      return this.findPrimaryOrganizationId(BigInt(dto.ownerId));
    }

    return undefined;
  }

  private async findPrimaryOrganizationId(userId: bigint): Promise<bigint | null> {
    const relation = await this.db.client.userOrganizationRelation.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { updatedAt: 'desc' },
      ],
      select: {
        orgId: true,
      },
    });

    return relation?.orgId ?? null;
  }

  private async syncPrimaryContractFromExecutionDetail(
    tx: TxClient,
    projectId: bigint,
    detail: {
      contractSignedAt: Date | null;
      contractAmount: bigint | null;
      contractUnitCode: string | null;
      billingTypeCode: string | null;
      deliveryMethodCode: string | null;
    },
  ): Promise<void> {
    const hasContractSignal = Boolean(
      detail.contractSignedAt
      || detail.contractAmount
      || detail.contractUnitCode
      || detail.billingTypeCode
      || detail.deliveryMethodCode,
    );
    const existingPrimaryContract = await tx.projectContract.findFirst({
      where: { projectId, isPrimary: true, isActive: true },
      orderBy: [{ updatedAt: 'desc' }, { contractId: 'desc' }],
    });

    if (!hasContractSignal && !existingPrimaryContract) {
      return;
    }

    if (existingPrimaryContract) {
      await tx.projectContract.update({
        where: { contractId: existingPrimaryContract.contractId },
        data: {
          totalAmount: detail.contractAmount,
          currencyCode: detail.contractUnitCode ?? existingPrimaryContract.currencyCode,
          contractStatusCode: detail.contractSignedAt ? 'signed' : 'draft',
          contractDate: detail.contractSignedAt,
          billingTypeCode: detail.billingTypeCode,
          deliveryMethodCode: detail.deliveryMethodCode,
        },
      });
      return;
    }

    await tx.projectContract.create({
      data: {
        projectId,
        contractCode: 'PRIMARY',
        title: 'Primary Contract',
        totalAmount: detail.contractAmount,
        currencyCode: detail.contractUnitCode ?? 'KRW',
        contractStatusCode: detail.contractSignedAt ? 'signed' : 'draft',
        contractDate: detail.contractSignedAt,
        billingTypeCode: detail.billingTypeCode,
        deliveryMethodCode: detail.deliveryMethodCode,
        isPrimary: true,
      },
    });
  }
}
