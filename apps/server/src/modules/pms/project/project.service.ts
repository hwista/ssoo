import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ExtendedPrismaClient, Prisma } from '@ssoo/database';
import type { AiIndexJobType, AiIndexJsonObject } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import {
  COMPLETED_DELIVERABLE_SUBMISSION_STATUSES,
  countCompletedDeliverables,
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
  ProjectAiIndexBackfillRequest,
  ProjectAiIndexBackfillResponse,
  ProjectAiIndexBackfillItem,
  ProjectDashboardSummary,
} from '@ssoo/types';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import { AiIndexingService } from '../../common/ai-index/ai-indexing.service.js';
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
  request: '실행 전 접수 또는 CRM 인계 정보를 확인합니다.',
  proposal: '실행 착수 전 범위와 인계 스냅샷을 확인합니다.',
  execution: '프로젝트를 수행하고 결과물을 산출합니다.',
  transition: '프로젝트를 종료하고 운영/유지보수로 전환합니다.',
};

const DASHBOARD_COMPLETED_OBJECTIVE_STATUSES = new Set(['achieved', 'completed', 'done']);
const DASHBOARD_COMPLETED_TASK_STATUSES = new Set(['completed', 'cancelled']);
const DASHBOARD_COMPLETED_MILESTONE_STATUSES = new Set(['achieved', 'cancelled']);
const DASHBOARD_OPEN_PROJECT_ISSUE_STATUSES = new Set(['open', 'in_progress']);
const DASHBOARD_OPEN_RISK_STATUSES = new Set(['identified', 'assessing', 'mitigating', 'open', 'in_progress']);
const DASHBOARD_ACTIVE_CHANGE_STATUSES = new Set(['requested', 'reviewing', 'approved', 'in_progress']);
const DASHBOARD_OPEN_REQUIREMENT_STATUSES = new Set(['open', 'in_progress', 'reviewing']);
const DASHBOARD_HIGH_RISK_CODES = new Set(['high', 'critical']);
const DASHBOARD_PAID_PAYMENT_STATUSES = new Set(['paid', 'completed']);

const DEFAULT_PROJECT_AI_INDEX_BACKFILL_LIMIT = 100;
const MAX_PROJECT_AI_INDEX_BACKFILL_LIMIT = 500;
const DEFAULT_PROJECT_AI_INDEX_BACKFILL_REASON = 'project_backfill_requested';

const PROJECT_READ_INCLUDE = {
  requestDetail: true,
  proposalDetail: true,
  executionDetail: true,
  transitionDetail: true,
  projectStatuses: true,
} as const;

const PROJECT_DETAIL_INCLUDE = {
  requestDetail: true,
  proposalDetail: true,
  executionDetail: true,
  transitionDetail: true,
  projectStatuses: {
    orderBy: { statusCode: 'asc' },
  },
} as const;

const PROJECT_CUSTOMER_SELECT = {
  id: true,
  customerCode: true,
  customerName: true,
} as const;

const EXTERNAL_ORGANIZATION_ANCHOR_SELECT = {
  orgId: true,
  orgCode: true,
  orgName: true,
  orgType: true,
  scope: true,
} as const;

const PROJECT_PLANT_SITE_SELECT = {
  siteId: true,
  siteCode: true,
  siteName: true,
  siteTypeCode: true,
  regionCode: true,
  operationOwnerName: true,
} as const;

const PROJECT_SYSTEM_INSTANCE_SELECT = {
  systemInstanceId: true,
  instanceCode: true,
  instanceName: true,
  environmentCode: true,
  operationOwnerTypeCode: true,
  operationOwnerName: true,
  lifecycleStatusCode: true,
} as const;

type TxClient = Omit<
  ExtendedPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

type ProjectCustomerAnchor = {
  customerCode: string | null;
  customerName: string | null;
  customerOrganizationId: bigint | null;
  customerOrganizationCode: string | null;
  customerOrganizationName: string | null;
  customerOrganizationType: string | null;
  customerOrganizationScope: string | null;
};

type ProjectExecutionAssetAnchor = {
  plantSiteCode: string | null;
  plantSiteName: string | null;
  plantSiteTypeCode: string | null;
  plantSiteRegionCode: string | null;
  plantSiteOperationOwnerName: string | null;
  systemInstanceCode: string | null;
  systemInstanceName: string | null;
  systemInstanceEnvironmentCode: string | null;
  systemInstanceOperationOwnerTypeCode: string | null;
  systemInstanceOperationOwnerName: string | null;
  systemInstanceLifecycleStatusCode: string | null;
};

type ProjectCustomerLookupRow = Prisma.CustomerGetPayload<{ select: typeof PROJECT_CUSTOMER_SELECT }>;
type ExternalOrganizationAnchorRow = Prisma.OrganizationGetPayload<{
  select: typeof EXTERNAL_ORGANIZATION_ANCHOR_SELECT;
}>;
type ProjectPlantSiteLookupRow = Prisma.PlantSiteGetPayload<{ select: typeof PROJECT_PLANT_SITE_SELECT }>;
type ProjectSystemInstanceLookupRow = Prisma.SystemInstanceGetPayload<{
  select: typeof PROJECT_SYSTEM_INSTANCE_SELECT;
}>;

interface ProjectAiIndexQueueOptions {
  currentUser?: TokenPayload;
  payload?: AiIndexJsonObject;
  priority?: number;
}

interface ProjectAiIndexQueueResult {
  status: 'queued' | 'failed';
  errorMessage?: string;
}

interface ProjectAssetAnchors {
  customerId: bigint | null;
  plantId: bigint | null;
  systemInstanceId: bigint | null;
}

type FindProjectsParams = PaginationParams & {
  statusCode?: string;
  stageCode?: string;
  customerId?: string | number;
  search?: string;
};

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly accessFoundationService: AccessFoundationService,
    private readonly projectOrgService: ProjectOrgService,
    private readonly projectRelationService: ProjectRelationService,
    private readonly aiIndexingService: AiIndexingService,
    private readonly admission: PlatformAdmissionService,
  ) {}

  async findAll(params: FindProjectsParams, currentUser: TokenPayload) {
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
        include: PROJECT_READ_INCLUDE,
      }),
      this.db.project.count({ where }),
    ]);

    return { data: await this.attachProjectReadAnchors(data), total };
  }

  private async buildProjectListWhere(
    params: FindProjectsParams,
    currentUser: TokenPayload,
  ): Promise<Prisma.ProjectWhereInput> {
    const search = params.search?.trim();
    const searchWhere: Prisma.ProjectWhereInput | undefined = search
      ? {
          OR: [
            { projectName: { contains: search, mode: 'insensitive' } },
            { memo: { contains: search, mode: 'insensitive' } },
            ...(/^\d+$/.test(search) ? [{ id: BigInt(search) }] : []),
          ],
        }
      : undefined;
    const customerId = this.parseOptionalBigInt(params.customerId);
    const baseWhere: Prisma.ProjectWhereInput = {
      ...(params.statusCode && { statusCode: params.statusCode }),
      ...(params.stageCode && { stageCode: params.stageCode }),
      ...(customerId !== undefined && { customerId }),
      ...(searchWhere && { AND: [searchWhere] }),
    };

    const actionContext =
      await this.accessFoundationService.resolveActionPermissionContext(currentUser);
    if (actionContext.policy.hasSystemOverride) {
      return baseWhere;
    }

    const userId = BigInt(currentUser.userId);
    const now = new Date();
    const userOrgIds = await this.accessFoundationService.getUserOrganizationIds(userId, now);
    const organizationScope = await this.accessFoundationService.getBusinessOrganizationScope(userId, 'pms');
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
      ...(organizationScope !== null && { AND: [...(searchWhere ? [searchWhere] : []), { ownerOrganizationId: { in: organizationScope } }] }),
      OR: accessFilters,
    };
  }
  async findOne(id: bigint) {
    const project = await this.db.project.findUnique({
      where: { id },
      include: PROJECT_DETAIL_INCLUDE,
    });
    if (!project) {
      return null;
    }
    const [enriched] = await this.attachProjectReadAnchors([project]);
    return enriched ?? project;
  }

  async queueAiIndexBackfill(
    request: ProjectAiIndexBackfillRequest = {},
    currentUser?: TokenPayload,
  ): Promise<ProjectAiIndexBackfillResponse> {
    const limit = this.normalizeAiIndexBackfillLimit(request.limit);
    const requestedProjectIds = this.normalizeAiIndexBackfillProjectIds(request.projectIds);
    const reasonCode = request.reasonCode?.trim() || DEFAULT_PROJECT_AI_INDEX_BACKFILL_REASON;
    const includeInactive = request.includeInactive === true;
    const limitedProjectIds = requestedProjectIds.slice(0, limit);
    const rows = await this.db.project.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(limitedProjectIds.length > 0 ? { id: { in: limitedProjectIds } } : {}),
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'asc' },
      ],
      take: limit,
    });
    const items: ProjectAiIndexBackfillItem[] = [];

    for (const row of rows) {
      const result = await this.queueProjectAiIndexJob(row.id, 'backfill', reasonCode, {
        currentUser,
        priority: 30,
        payload: {
          backfill: true,
          includeInactive,
          projectUpdatedAt: row.updatedAt.toISOString(),
          selectedLimit: limit,
        },
      });
      items.push({
        projectId: row.id.toString(),
        status: result.status,
        ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
      });
    }

    const queuedCount = items.filter((item) => item.status === 'queued').length;
    const failedCount = items.length - queuedCount;

    return {
      sourceApp: 'pms',
      entityType: 'project',
      jobType: 'backfill',
      requestedCount: requestedProjectIds.length,
      selectedCount: rows.length,
      queuedCount,
      failedCount,
      limit,
      includeInactive,
      reasonCode,
      items,
    };
  }

  async create(dto: CreateProjectDto, actorUserId: bigint) {
    const assetAnchors = await this.resolveCreateAssetAnchors(dto);

    const project = await this.db.client.$transaction(async (tx) => {
      const ownerOrganizationId = await this.admission.resolveBusinessOrganization(actorUserId, 'pms', dto.ownerOrganizationId, tx);
      const project = await tx.project.create({
        data: {
          projectName: dto.projectName,
          statusCode: dto.statusCode || 'request',
          stageCode: dto.stageCode || 'waiting',
          currentOwnerUserId: dto.ownerId ? BigInt(dto.ownerId) : actorUserId,
          ownerOrganizationId,
          customerId: assetAnchors.customerId,
          plantId: assetAnchors.plantId,
          systemInstanceId: assetAnchors.systemInstanceId,
          memo: dto.description,
        },
      });

      await this.projectOrgService.syncCompatibilityProjectOrgs(project.id, tx, {
        strict: true,
      });

      return project;
    });

    await this.queueProjectAiIndexJob(project.id, 'upsert', 'project_created');
    const [enriched] = await this.attachProjectReadAnchors([project]);
    return enriched ?? project;
  }

  async update(id: bigint, dto: UpdateProjectDto, actorUserId: bigint) {
    const existing = await this.db.project.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        plantId: true,
        systemInstanceId: true,
      },
    });

    if (!existing) {
      return null;
    }
    const assetAnchors = await this.resolveUpdateAssetAnchors(dto, {
      customerId: existing.customerId ?? null,
      plantId: existing.plantId ?? null,
      systemInstanceId: existing.systemInstanceId ?? null,
    });

    const project = await this.db.client.$transaction(async (tx) => {
      // Changing the responsible person never silently transfers the business organization.
      const ownerOrganizationId = dto.ownerOrganizationId === undefined ? undefined
        : await this.admission.resolveBusinessOrganization(actorUserId, 'pms', dto.ownerOrganizationId, tx);
      const project = await tx.project.update({
        where: { id },
        data: {
          ...(dto.projectName && { projectName: dto.projectName }),
          ...(dto.description !== undefined && { memo: dto.description }),
          ...(this.hasAssetAnchorChanges(dto) && {
            customerId: assetAnchors.customerId,
            plantId: assetAnchors.plantId,
            systemInstanceId: assetAnchors.systemInstanceId,
          }),
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

    await this.queueProjectAiIndexJob(project.id, 'upsert', 'project_updated');
    const [enriched] = await this.attachProjectReadAnchors([project]);
    return enriched ?? project;
  }

  async remove(id: bigint): Promise<boolean> {
    try {
      await this.db.project.delete({ where: { id } });
      await this.queueProjectAiIndexJob(id, 'delete', 'project_deleted');
      return true;
    } catch {
      return false;
    }
  }

  // ─── 단계별 상세 Upsert ───

  async upsertRequestDetail(projectId: bigint, dto: UpsertRequestDetailDto) {
    const detail = await this.db.client.projectRequestDetail.upsert({
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
    await this.queueProjectAiIndexJob(projectId, 'upsert', 'request_detail_upserted');
    return detail;
  }

  async upsertProposalDetail(projectId: bigint, dto: UpsertProposalDetailDto) {
    const detail = await this.db.client.projectProposalDetail.upsert({
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
    await this.queueProjectAiIndexJob(projectId, 'upsert', 'proposal_detail_upserted');
    return detail;
  }

  async upsertExecutionDetail(projectId: bigint, dto: UpsertExecutionDetailDto) {
    const detail = await this.db.client.$transaction(async (tx) => {
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
    await this.queueProjectAiIndexJob(projectId, 'upsert', 'execution_detail_upserted');
    return detail;
  }

  async upsertTransitionDetail(projectId: bigint, dto: UpsertTransitionDetailDto) {
    const detail = await this.db.client.projectTransitionDetail.upsert({
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
    await this.queueProjectAiIndexJob(projectId, 'upsert', 'transition_detail_upserted');
    return detail;
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
          `미완료 산출물이 ${pendingDeliverables.length}건 있습니다. 모든 산출물을 확정/승인 또는 면제 처리한 뒤 완료할 수 있습니다.`,
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

    await this.queueProjectAiIndexJob(projectId, 'upsert', 'stage_advanced');

    return {
      previousStatusCode: currentStatus,
      previousStageCode: currentStage,
      currentStatusCode: advancedToNextStatus ? newStatusCode : currentStatus,
      currentStageCode: advancedToNextStatus ? 'waiting' : targetStage,
      doneResultCode: advancedToNextStatus ? null : (doneResultCode ?? null),
      advancedToNextStatus,
    };
  }

  private async queueProjectAiIndexJob(
    projectId: bigint,
    jobType: AiIndexJobType,
    reasonCode: string,
    options: ProjectAiIndexQueueOptions = {},
  ): Promise<ProjectAiIndexQueueResult> {
    try {
      const payload = {
        source: 'pms.project',
        ...options.payload,
        reasonCode,
      } satisfies AiIndexJsonObject;

      await this.aiIndexingService.queueJob({
        sourceApp: 'pms',
        entityType: 'project',
        entityId: projectId.toString(),
        jobType,
        priority: options.priority ?? this.resolveProjectAiIndexJobPriority(jobType),
        payload,
      }, options.currentUser);
      return { status: 'queued' };
    } catch (error) {
      const errorMessage = this.getAiIndexErrorMessage(error);
      this.logger.warn(
        `PMS project AI index job queue failed (${projectId.toString()}, ${reasonCode}): ${errorMessage}`,
      );
      return {
        status: 'failed',
        errorMessage,
      };
    }
  }

  private resolveProjectAiIndexJobPriority(jobType: AiIndexJobType): number {
    if (jobType === 'delete') {
      return 10;
    }

    if (jobType === 'backfill') {
      return 30;
    }

    return 20;
  }

  private normalizeAiIndexBackfillLimit(limit: number | undefined): number {
    const parsedLimit = Number(limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return DEFAULT_PROJECT_AI_INDEX_BACKFILL_LIMIT;
    }

    return Math.min(Math.floor(parsedLimit), MAX_PROJECT_AI_INDEX_BACKFILL_LIMIT);
  }

  private normalizeAiIndexBackfillProjectIds(projectIds: string[] | undefined): bigint[] {
    if (!projectIds || projectIds.length === 0) {
      return [];
    }

    const normalizedIds = new Set<bigint>();
    for (const value of projectIds) {
      const trimmedValue = value.trim();
      if (!/^\d+$/.test(trimmedValue)) {
        throw new BadRequestException('유효한 프로젝트 식별자 목록이 아닙니다.');
      }
      normalizedIds.add(BigInt(trimmedValue));
    }

    return [...normalizedIds];
  }

  private getAiIndexErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  async getDashboardSummary(projectId: bigint): Promise<ProjectDashboardSummary> {
    const project = await this.db.client.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        statusCode: true,
        stageCode: true,
        projectStatuses: {
          select: {
            statusCode: true,
            expectedEndAt: true,
            actualEndAt: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const currentStatus = project.statusCode as ProjectStatusCode;
    const today = this.startOfDay(new Date());

    const [
      contracts,
      objectives,
      tasks,
      milestones,
      deliverables,
      closeConditions,
      projectIssues,
      risks,
      changeRequests,
      requirements,
      events,
      readiness,
    ] = await Promise.all([
      this.db.client.projectContract.findMany({
        where: { projectId, isActive: true },
        select: {
          totalAmount: true,
          currencyCode: true,
          payments: {
            where: { isActive: true },
            select: {
              amount: true,
              paymentStatusCode: true,
            },
          },
        },
      }),
      this.db.client.objective.findMany({
        where: { projectId, isActive: true },
        select: {
          statusCode: true,
          achievedAt: true,
        },
      }),
      this.db.client.task.findMany({
        where: { projectId, isActive: true },
        select: {
          statusCode: true,
          plannedEndAt: true,
          progressRate: true,
          estimatedHours: true,
          actualHours: true,
        },
      }),
      this.db.client.milestone.findMany({
        where: { projectId, isActive: true },
        select: {
          milestoneName: true,
          statusCode: true,
          dueAt: true,
          achievedAt: true,
        },
        orderBy: [{ dueAt: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.db.client.projectDeliverable.findMany({
        where: { projectId, statusCode: currentStatus, isActive: true },
        select: { submissionStatusCode: true },
      }),
      this.db.client.projectCloseCondition.findMany({
        where: { projectId, statusCode: currentStatus, isActive: true },
        select: { isChecked: true },
      }),
      this.db.client.projectIssue.findMany({
        where: { projectId, isActive: true },
        select: {
          statusCode: true,
          priorityCode: true,
          memo: true,
        },
      }),
      this.db.client.projectRisk.findMany({
        where: { projectId, isActive: true },
        select: {
          statusCode: true,
          impactCode: true,
        },
      }),
      this.db.client.projectChangeRequest.findMany({
        where: { projectId, isActive: true },
        select: { statusCode: true },
      }),
      this.db.client.projectRequirement.findMany({
        where: { projectId, isActive: true },
        select: { statusCode: true },
      }),
      this.db.client.projectEvent.findMany({
        where: { projectId, isActive: true },
        select: {
          eventTypeCode: true,
          statusCode: true,
        },
      }),
      this.checkTransitionReadiness(projectId),
    ]);

    const payments = contracts.flatMap((contract) => contract.payments);
    const contractTotalAmount = this.sumBigInts(contracts.map((contract) => contract.totalAmount));
    const scheduledPaymentAmount = this.sumBigInts(payments.map((payment) => payment.amount));
    const paidPaymentAmount = this.sumBigInts(
      payments
        .filter((payment) => DASHBOARD_PAID_PAYMENT_STATUSES.has(payment.paymentStatusCode))
        .map((payment) => payment.amount),
    );
    const currencyCode = contracts.find((contract) => contract.currencyCode)?.currencyCode ?? 'KRW';

    const taskCompleted = tasks.filter((task) => task.statusCode === 'completed').length;
    const taskDelayed = tasks.filter(
      (task) =>
        task.plannedEndAt &&
        this.startOfDay(task.plannedEndAt).getTime() < today.getTime() &&
        !DASHBOARD_COMPLETED_TASK_STATUSES.has(task.statusCode),
    ).length;
    const milestoneAchieved = milestones.filter((milestone) => milestone.statusCode === 'achieved').length;
    const milestoneDelayed = milestones.filter(
      (milestone) =>
        milestone.dueAt &&
        this.startOfDay(milestone.dueAt).getTime() < today.getTime() &&
        !DASHBOARD_COMPLETED_MILESTONE_STATUSES.has(milestone.statusCode),
    ).length;
    const nextMilestone = milestones.find(
      (milestone) => !DASHBOARD_COMPLETED_MILESTONE_STATUSES.has(milestone.statusCode),
    );

    const objectiveCompleted = objectives.filter(
      (objective) =>
        DASHBOARD_COMPLETED_OBJECTIVE_STATUSES.has(objective.statusCode) || Boolean(objective.achievedAt),
    ).length;
    const deliverableCompleted = countCompletedDeliverables(deliverables);
    const closeConditionChecked = closeConditions.filter((condition) => condition.isChecked).length;
    const averageTaskProgress =
      tasks.length > 0
        ? Math.round(tasks.reduce((sum, task) => sum + task.progressRate, 0) / tasks.length)
        : 0;
    const estimatedHours = this.sumNumbers(tasks.map((task) => task.estimatedHours));
    const actualHours = this.sumNumbers(tasks.map((task) => task.actualHours));

    const performanceTotal =
      objectives.length + tasks.length + deliverables.length + closeConditions.length;
    const performanceCompleted =
      objectiveCompleted + taskCompleted + deliverableCompleted + closeConditionChecked;

    const openIssues = projectIssues.filter((issue) =>
      DASHBOARD_OPEN_PROJECT_ISSUE_STATUSES.has(issue.statusCode),
    );
    const blockingIssueCount = openIssues.filter((issue) =>
      DASHBOARD_HIGH_RISK_CODES.has(issue.priorityCode),
    ).length;
    const openRiskCount = risks.filter((risk) => DASHBOARD_OPEN_RISK_STATUSES.has(risk.statusCode)).length;
    const highRiskCount = risks.filter(
      (risk) =>
        DASHBOARD_OPEN_RISK_STATUSES.has(risk.statusCode) &&
        DASHBOARD_HIGH_RISK_CODES.has(risk.impactCode),
    ).length;
    const openChangeRequestCount = changeRequests.filter((changeRequest) =>
      DASHBOARD_ACTIVE_CHANGE_STATUSES.has(changeRequest.statusCode),
    ).length;
    const openRequirementCount = requirements.filter((requirement) =>
      DASHBOARD_OPEN_REQUIREMENT_STATUSES.has(requirement.statusCode),
    ).length;
    const openLaunchFeedbackCount = openIssues.filter((issue) => issue.memo === 'review-feedback').length;
    const reviewEventCount = events.filter((event) => event.eventTypeCode === 'review').length;
    const reportEventCount = events.filter((event) => event.eventTypeCode === 'report').length;
    const closeoutBlockerCount = readiness.deliverables.pending + readiness.closeConditions.unchecked;
    const controlBlockerCount =
      blockingIssueCount + highRiskCount + openChangeRequestCount + openLaunchFeedbackCount;
    const scheduleBlockerCount = taskDelayed + milestoneDelayed;

    return {
      projectId: project.id.toString(),
      generatedAt: new Date().toISOString(),
      cost: {
        source: 'crm_contract_snapshot',
        currencyCode,
        contractCount: contracts.length,
        paymentCount: payments.length,
        contractTotalAmount: contractTotalAmount.toString(),
        scheduledPaymentAmount: scheduledPaymentAmount.toString(),
        paidPaymentAmount: paidPaymentAmount.toString(),
        boundaryNote: '계약·대금 원장은 CRM 정본이며 PMS는 수락된 실행 스냅샷 합계만 표시합니다.',
      },
      schedule: {
        taskTotal: tasks.length,
        taskCompleted,
        taskDelayed,
        milestoneTotal: milestones.length,
        milestoneAchieved,
        milestoneDelayed,
        nextMilestoneName: nextMilestone?.milestoneName ?? null,
        nextMilestoneDueAt: this.toIsoDate(nextMilestone?.dueAt ?? null),
      },
      performance: {
        objectiveTotal: objectives.length,
        objectiveCompleted,
        averageTaskProgress,
        estimatedHours,
        actualHours,
        deliverableTotal: deliverables.length,
        deliverableCompleted,
        closeConditionTotal: closeConditions.length,
        closeConditionChecked,
        completionRate: this.toPercent(performanceCompleted, performanceTotal),
      },
      controls: {
        openIssueCount: openIssues.length,
        blockingIssueCount,
        openRiskCount,
        highRiskCount,
        openChangeRequestCount,
        openRequirementCount,
        openLaunchFeedbackCount,
        reviewEventCount,
        reportEventCount,
      },
      readiness: {
        canCompleteCurrentStage: readiness.canComplete,
        blockerCount: closeoutBlockerCount + controlBlockerCount + scheduleBlockerCount,
        nextActionLabel: this.getDashboardNextAction({
          closeoutBlockerCount,
          controlBlockerCount,
          scheduleBlockerCount,
          canComplete: readiness.canComplete,
        }),
      },
    };
  }

  private getDashboardNextAction({
    closeoutBlockerCount,
    controlBlockerCount,
    scheduleBlockerCount,
    canComplete,
  }: {
    closeoutBlockerCount: number;
    controlBlockerCount: number;
    scheduleBlockerCount: number;
    canComplete: boolean;
  }): string {
    if (closeoutBlockerCount > 0) {
      return `산출물·종료조건 차단 ${closeoutBlockerCount}건을 먼저 정리하세요.`;
    }
    if (controlBlockerCount > 0) {
      return `통제·피드백 확인 대상 ${controlBlockerCount}건을 처리하세요.`;
    }
    if (scheduleBlockerCount > 0) {
      return `지연된 작업·마일스톤 ${scheduleBlockerCount}건의 일정을 갱신하세요.`;
    }
    return canComplete ? '현재 단계 종료 전 리뷰/피드백을 기록하세요.' : '현재 단계 실행 데이터를 계속 보강하세요.';
  }

  private sumBigInts(values: Array<bigint | number | null>): bigint {
    return values.reduce<bigint>((sum, value) => sum + BigInt(value ?? 0), 0n);
  }

  private sumNumbers(values: Array<Prisma.Decimal | number | null>): number {
    const sum = values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
    return Math.round(sum * 10) / 10;
  }

  private toPercent(completed: number, total: number): number {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  private startOfDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private toIsoDate(date: Date | null): string | null {
    return date ? date.toISOString().slice(0, 10) : null;
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
    const completedDeliverables = countCompletedDeliverables(deliverables);
    const uncheckedConditions = closeConditions.filter((c) => !c.isChecked);

    return {
      canComplete: pendingDeliverables.length === 0 && uncheckedConditions.length === 0,
      deliverables: {
        total: deliverables.length,
        completed: completedDeliverables,
        approved: completedDeliverables,
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

  private async resolveCreateAssetAnchors(dto: CreateProjectDto): Promise<ProjectAssetAnchors> {
    return this.resolveProjectAssetAnchors({
      customerId: this.parseNullableId(dto.customerId, 'customerId'),
      plantId: this.parseNullableId(dto.plantId, 'plantId'),
      systemInstanceId: this.parseNullableId(dto.systemInstanceId, 'systemInstanceId'),
    });
  }

  private async resolveUpdateAssetAnchors(
    dto: UpdateProjectDto,
    existing: ProjectAssetAnchors,
  ): Promise<ProjectAssetAnchors> {
    if (!this.hasAssetAnchorChanges(dto)) {
      return existing;
    }

    return this.resolveProjectAssetAnchors({
      customerId: this.parseNullableIdForUpdate(dto.customerId, existing.customerId, 'customerId'),
      plantId: this.parseNullableIdForUpdate(dto.plantId, existing.plantId, 'plantId'),
      systemInstanceId: this.parseNullableIdForUpdate(
        dto.systemInstanceId,
        existing.systemInstanceId,
        'systemInstanceId',
      ),
    });
  }

  private hasAssetAnchorChanges(dto: UpdateProjectDto): boolean {
    return dto.customerId !== undefined
      || dto.plantId !== undefined
      || dto.systemInstanceId !== undefined;
  }

  private async resolveProjectAssetAnchors(input: ProjectAssetAnchors): Promise<ProjectAssetAnchors> {
    let customerId = input.customerId;
    let plantId = input.plantId;
    const systemInstanceId = input.systemInstanceId;

    const [customer, site, instance] = await Promise.all([
      this.findActiveCustomer(customerId),
      this.findActivePlantSite(plantId),
      this.findActiveSystemInstance(systemInstanceId),
    ]);

    if (site?.customerId && customerId !== null && site.customerId !== customerId) {
      throw new BadRequestException('plantId belongs to a different customerId');
    }
    if (site?.customerId && customerId === null) {
      customerId = site.customerId;
    }

    if (instance?.siteId && plantId !== null && instance.siteId !== plantId) {
      throw new BadRequestException('systemInstanceId belongs to a different plantId');
    }
    if (instance?.siteId && plantId === null) {
      plantId = instance.siteId;
    }

    if (instance?.customerId && customerId !== null && instance.customerId !== customerId) {
      throw new BadRequestException('systemInstanceId belongs to a different customerId');
    }
    if (instance?.customerId && customerId === null) {
      customerId = instance.customerId;
    }

    if (plantId !== input.plantId && plantId !== null) {
      const derivedSite = await this.findActivePlantSite(plantId);
      if (derivedSite?.customerId && customerId !== null && derivedSite.customerId !== customerId) {
        throw new BadRequestException('derived plantId belongs to a different customerId');
      }
      if (derivedSite?.customerId && customerId === null) {
        customerId = derivedSite.customerId;
      }
    }

    if (customerId !== null && !customer) {
      await this.findActiveCustomer(customerId);
    }

    return {
      customerId,
      plantId,
      systemInstanceId,
    };
  }

  private parseNullableId(value: string | null | undefined, field: string): bigint | null {
    if (value === null || value === undefined || value.trim() === '') {
      return null;
    }
    return this.parsePositiveBigInt(value, field);
  }

  private parseNullableIdForUpdate(
    value: string | null | undefined,
    currentValue: bigint | null,
    field: string,
  ): bigint | null {
    if (value === undefined) {
      return currentValue;
    }
    return this.parseNullableId(value, field);
  }

  private parsePositiveBigInt(value: string, field: string): bigint {
    try {
      const parsed = BigInt(value.trim());
      if (parsed <= 0n) {
        throw new Error('not positive');
      }
      return parsed;
    } catch {
      throw new BadRequestException(`${field} must be a positive integer`);
    }
  }

  private parseOptionalBigInt(value?: string | number | null): bigint | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const normalized = String(value).trim();
    if (!normalized) {
      return undefined;
    }

    if (!/^\d+$/.test(normalized)) {
      throw new BadRequestException('customerId 형식이 올바르지 않습니다.');
    }

    return BigInt(normalized);
  }

  private async findActiveCustomer(customerId: bigint | null) {
    if (customerId === null) return null;
    const customer = await this.db.client.customer.findUnique({
      where: { id: customerId },
      select: { id: true, isActive: true },
    });
    if (!customer) {
      throw new BadRequestException(`customerId ${customerId} was not found`);
    }
    if (!customer.isActive) {
      throw new BadRequestException(`customerId ${customerId} is inactive`);
    }
    return customer;
  }

  private async findActivePlantSite(plantId: bigint | null) {
    if (plantId === null) return null;
    const site = await this.db.client.plantSite.findUnique({
      where: { siteId: plantId },
      select: { siteId: true, customerId: true, isActive: true },
    });
    if (!site) {
      throw new BadRequestException(`plantId ${plantId} was not found`);
    }
    if (!site.isActive) {
      throw new BadRequestException(`plantId ${plantId} is inactive`);
    }
    return site;
  }

  private async findActiveSystemInstance(systemInstanceId: bigint | null) {
    if (systemInstanceId === null) return null;
    const instance = await this.db.client.systemInstance.findUnique({
      where: { systemInstanceId },
      select: {
        systemInstanceId: true,
        customerId: true,
        siteId: true,
        isActive: true,
      },
    });
    if (!instance) {
      throw new BadRequestException(`systemInstanceId ${systemInstanceId} was not found`);
    }
    if (!instance.isActive) {
      throw new BadRequestException(`systemInstanceId ${systemInstanceId} is inactive`);
    }
    return instance;
  }



  private async attachProjectReadAnchors<T extends {
    customerId?: bigint | null;
    plantId?: bigint | null;
    systemInstanceId?: bigint | null;
  }>(
    projects: T[],
  ): Promise<Array<T & ProjectCustomerAnchor & ProjectExecutionAssetAnchor>> {
    const customerAnchored = await this.attachProjectCustomerOrganizationAnchors(projects);
    return this.attachProjectExecutionAssetAnchors(customerAnchored);
  }

  private async attachProjectCustomerOrganizationAnchors<T extends { customerId?: bigint | null }>(
    projects: T[],
  ): Promise<Array<T & ProjectCustomerAnchor>> {
    if (projects.length === 0) {
      return [];
    }

    const customerIds = [
      ...new Set(
        projects
          .map((project) => project.customerId ?? null)
          .filter((customerId): customerId is bigint => customerId !== null),
      ),
    ];

    if (customerIds.length === 0) {
      return projects.map((project) => ({
        ...project,
        customerCode: null,
        customerName: null,
        customerOrganizationId: null,
        customerOrganizationCode: null,
        customerOrganizationName: null,
        customerOrganizationType: null,
        customerOrganizationScope: null,
      }));
    }

    const customers = await this.db.client.customer.findMany({
      where: {
        id: { in: customerIds },
      },
      select: PROJECT_CUSTOMER_SELECT,
    });
    const customersById = new Map<string, ProjectCustomerLookupRow>(
      customers.map((customer) => [customer.id.toString(), customer]),
    );
    const organizations = await this.db.client.organization.findMany({
      where: {
        orgType: 'external',
        orgCode: {
          in: customers.map((customer) => customer.customerCode),
        },
      },
      select: EXTERNAL_ORGANIZATION_ANCHOR_SELECT,
    });
    const organizationsByCode = new Map<string, ExternalOrganizationAnchorRow>(
      organizations.map((organization) => [organization.orgCode, organization]),
    );

    return projects.map((project) => {
      const customer = project.customerId
        ? customersById.get(project.customerId.toString())
        : undefined;
      const organization = customer
        ? organizationsByCode.get(customer.customerCode)
        : undefined;

      return {
        ...project,
        customerCode: customer?.customerCode ?? null,
        customerName: customer?.customerName ?? null,
        customerOrganizationId: organization?.orgId ?? null,
        customerOrganizationCode: organization?.orgCode ?? null,
        customerOrganizationName: organization?.orgName ?? null,
        customerOrganizationType: organization?.orgType ?? null,
        customerOrganizationScope: organization?.scope ?? null,
      };
    });
  }

  private async attachProjectExecutionAssetAnchors<T extends {
    plantId?: bigint | null;
    systemInstanceId?: bigint | null;
  }>(
    projects: T[],
  ): Promise<Array<T & ProjectExecutionAssetAnchor>> {
    if (projects.length === 0) {
      return [];
    }

    const plantIds = [
      ...new Set(
        projects
          .map((project) => project.plantId ?? null)
          .filter((plantId): plantId is bigint => plantId !== null),
      ),
    ];
    const systemInstanceIds = [
      ...new Set(
        projects
          .map((project) => project.systemInstanceId ?? null)
          .filter((systemInstanceId): systemInstanceId is bigint => systemInstanceId !== null),
      ),
    ];

    const [sites, instances] = await Promise.all([
      plantIds.length > 0
        ? this.db.client.plantSite.findMany({
          where: { siteId: { in: plantIds } },
          select: PROJECT_PLANT_SITE_SELECT,
        })
        : Promise.resolve([] as ProjectPlantSiteLookupRow[]),
      systemInstanceIds.length > 0
        ? this.db.client.systemInstance.findMany({
          where: { systemInstanceId: { in: systemInstanceIds } },
          select: PROJECT_SYSTEM_INSTANCE_SELECT,
        })
        : Promise.resolve([] as ProjectSystemInstanceLookupRow[]),
    ]);
    const sitesById = new Map<string, ProjectPlantSiteLookupRow>(
      sites.map((site) => [site.siteId.toString(), site]),
    );
    const instancesById = new Map<string, ProjectSystemInstanceLookupRow>(
      instances.map((instance) => [instance.systemInstanceId.toString(), instance]),
    );

    return projects.map((project) => {
      const site = project.plantId
        ? sitesById.get(project.plantId.toString())
        : undefined;
      const instance = project.systemInstanceId
        ? instancesById.get(project.systemInstanceId.toString())
        : undefined;

      return {
        ...project,
        plantSiteCode: site?.siteCode ?? null,
        plantSiteName: site?.siteName ?? null,
        plantSiteTypeCode: site?.siteTypeCode ?? null,
        plantSiteRegionCode: site?.regionCode ?? null,
        plantSiteOperationOwnerName: site?.operationOwnerName ?? null,
        systemInstanceCode: instance?.instanceCode ?? null,
        systemInstanceName: instance?.instanceName ?? null,
        systemInstanceEnvironmentCode: instance?.environmentCode ?? null,
        systemInstanceOperationOwnerTypeCode: instance?.operationOwnerTypeCode ?? null,
        systemInstanceOperationOwnerName: instance?.operationOwnerName ?? null,
        systemInstanceLifecycleStatusCode: instance?.lifecycleStatusCode ?? null,
      };
    });
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
