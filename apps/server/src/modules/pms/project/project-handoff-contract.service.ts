import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';
import type {
  ApplyCrmContractHandoffSnapshotDto,
  CreateContractPaymentDto,
  CreateProjectContractDto,
  CreateProjectHandoffDto,
  UpdateContractPaymentDto,
  UpdateProjectContractDto,
  UpdateProjectHandoffDto,
} from '@ssoo/types';
import type { ExtendedPrismaClient } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import { deriveProjectLifecycle } from './project-lifecycle.js';
import { CrmAccessService } from '../../crm/access/access.service.js';
import { ContractService } from '../../crm/contract/contract.service.js';
import { ProjectAccessService } from './project-access.service.js';

type TxClient = Omit<
  ExtendedPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

type CrmContractHandoffPreview = ApplyCrmContractHandoffSnapshotDto['preview'];
type CrmContractHandoffBillingLine = CrmContractHandoffPreview['billingPlan'][number];

const CRM_HANDOFF_SNAPSHOT_ACTIVITY = 'crm-handoff-snapshot';
const CRM_HANDOFF_SNAPSHOT_BOUNDARY_NOTICE =
  'CRM 계약 원장은 CRM이 소유하고 PMS는 확인된 계약 인계 스냅샷만 프로젝트 실행 참고값으로 저장합니다.';

@Injectable()
export class ProjectHandoffContractService {
  constructor(
    private readonly db: DatabaseService,
    private readonly crmAccess?: CrmAccessService,
    private readonly crmContracts?: ContractService,
    private readonly projectAccess?: ProjectAccessService,
  ) {}

  async listHandoffs(projectId: bigint) {
    await this.requireProject(projectId);

    return this.db.client.projectHandoff.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ requestedAt: 'desc' }, { handoffId: 'desc' }],
    });
  }

  async createHandoff(
    projectId: bigint,
    dto: CreateProjectHandoffDto,
    actorUserId: bigint,
  ) {
    const project = await this.requireProject(projectId);

    return this.db.client.$transaction(async (tx) => {
      const created = await tx.projectHandoff.create({
        data: {
          projectId,
          fromPhaseCode:
            dto.fromPhaseCode
            ?? deriveProjectLifecycle({
              statusCode: project.statusCode,
              stageCode: project.stageCode,
              doneResultCode: project.doneResultCode,
            }).phase,
          toPhaseCode: dto.toPhaseCode,
          handoffTypeCode: dto.handoffTypeCode ?? 'phase_transition',
          fromUserId: this.toOptionalBigInt(dto.fromUserId) ?? project.currentOwnerUserId,
          toUserId: this.toOptionalBigInt(dto.toUserId),
          requestedByUserId: actorUserId,
          handoffStatusCode: dto.handoffStatusCode ?? 'pending',
          conditionNote: dto.conditionNote,
          assignedRoleCode: dto.assignedRoleCode,
          memo: dto.memo,
        },
      });

      await this.syncProjectHandoffSummary(tx, projectId, created);

      if (created.handoffStatusCode === 'accepted') {
        await this.applyAcceptedHandoff(tx, projectId, created);
      }

      return created;
    });
  }

  async updateHandoff(
    projectId: bigint,
    handoffId: bigint,
    dto: UpdateProjectHandoffDto,
    actorUserId: bigint,
  ) {
    const existing = await this.requireHandoff(projectId, handoffId);

    return this.db.client.$transaction(async (tx) => {
      const handoffStatusCode = dto.handoffStatusCode ?? existing.handoffStatusCode;
      const statusChanged = dto.handoffStatusCode !== undefined
        && dto.handoffStatusCode !== existing.handoffStatusCode;
      const isResponded = handoffStatusCode !== 'pending';

      const updated = await tx.projectHandoff.update({
        where: { handoffId },
        data: {
          ...(dto.toPhaseCode !== undefined && { toPhaseCode: dto.toPhaseCode }),
          ...(dto.handoffTypeCode !== undefined && { handoffTypeCode: dto.handoffTypeCode }),
          ...(dto.fromUserId !== undefined && { fromUserId: this.toOptionalBigInt(dto.fromUserId) }),
          ...(dto.toUserId !== undefined && { toUserId: this.toOptionalBigInt(dto.toUserId) }),
          ...(dto.handoffStatusCode !== undefined && { handoffStatusCode: dto.handoffStatusCode }),
          ...(dto.conditionNote !== undefined && { conditionNote: dto.conditionNote }),
          ...(dto.assignedRoleCode !== undefined && { assignedRoleCode: dto.assignedRoleCode }),
          ...(dto.memo !== undefined && { memo: dto.memo }),
          ...(statusChanged && {
            respondedAt: isResponded ? new Date() : null,
            respondedByUserId: isResponded ? actorUserId : null,
          }),
        },
      });

      await this.syncProjectHandoffSummary(tx, projectId, updated);

      if (updated.handoffStatusCode === 'accepted') {
        await this.applyAcceptedHandoff(tx, projectId, updated);
      }

      return updated;
    });
  }

  async listContracts(projectId: bigint) {
    await this.requireProject(projectId);

    return this.db.client.projectContract.findMany({
      where: { projectId, isActive: true },
      include: {
        payments: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { contractPaymentId: 'asc' }],
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { contractDate: 'desc' }, { contractId: 'desc' }],
    });
  }

  async createContract(projectId: bigint, dto: CreateProjectContractDto) {
    await this.requireProject(projectId);

    return this.db.client.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.projectContract.updateMany({
          where: { projectId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const created = await tx.projectContract.create({
        data: {
          projectId,
          contractCode: dto.contractCode,
          title: dto.title,
          contractTypeCode: dto.contractTypeCode ?? 'new',
          totalAmount: this.toOptionalBigInt(dto.totalAmount),
          currencyCode: dto.currencyCode ?? 'KRW',
          contractStatusCode: dto.contractStatusCode ?? 'draft',
          contractDate: this.toOptionalDate(dto.contractDate),
          startDate: this.toOptionalDate(dto.startDate),
          endDate: this.toOptionalDate(dto.endDate),
          managerUserId: this.toOptionalBigInt(dto.managerUserId),
          billingTypeCode: dto.billingTypeCode,
          deliveryMethodCode: dto.deliveryMethodCode,
          isPrimary: dto.isPrimary ?? false,
          memo: dto.memo,
        },
      });

      await this.syncExecutionDetailFromPrimaryContract(tx, projectId);
      return created;
    });
  }

  async applyCrmContractHandoffSnapshot(
    projectId: bigint,
    dto: ApplyCrmContractHandoffSnapshotDto,
    actorUserId: bigint,
  ) {
    const project = await this.requireProject(projectId);
    const submitted = this.assertReadyCrmContractHandoffPreview(dto.preview);
    const actor = await this.crmAccess!.actorForUser(actorUserId);
    await this.projectAccess!.assertProjectCapability(projectId, actor, 'canEditProject');
    await this.crmAccess!.assertContractCapability(actor, 'canReadContract', submitted.contractId);
    const preview = this.assertReadyCrmContractHandoffPreview(await this.crmContracts!.getPmsHandoffPreview(submitted.contractId));
    if ((preview.ownerOrganizationId ?? null) !== (project.ownerOrganizationId?.toString() ?? null)) {
      throw new BadRequestException('CRM 계약과 PMS 프로젝트의 업무 조직이 같아야 합니다.');
    }
    if (!isDeepStrictEqual(JSON.parse(JSON.stringify(submitted)), JSON.parse(JSON.stringify(preview)))) {
      throw new ConflictException('CRM 계약 인계 정보가 변경되었습니다. 미리보기를 새로 조회한 뒤 다시 반영해 주세요.');
    }
    const now = new Date();
    const contractStartDate = this.toRequiredDate(preview.contractStartDate, 'contractStartDate');
    const contractEndDate = this.toRequiredDate(preview.contractEndDate, 'contractEndDate');
    const contractAmount = this.toAmountBigInt(preview.financials.revenueTotal, 'financials.revenueTotal');

    return this.db.client.$transaction(async (tx) => {
      const existingContract = await tx.projectContract.findFirst({
        where: {
          projectId,
          contractCode: preview.contractCode,
          isActive: true,
        },
      });

      await tx.projectContract.updateMany({
        where: {
          projectId,
          isPrimary: true,
          ...(existingContract ? { contractId: { not: existingContract.contractId } } : {}),
        },
        data: {
          isPrimary: false,
          updatedBy: actorUserId,
          lastSource: 'crm',
          lastActivity: CRM_HANDOFF_SNAPSHOT_ACTIVITY,
        },
      });

      const contractData = {
        contractCode: preview.contractCode,
        title: preview.contractName,
        contractTypeCode: 'new',
        totalAmount: contractAmount,
        currencyCode: 'KRW',
        contractStatusCode: 'signed',
        contractDate: contractStartDate,
        startDate: contractStartDate,
        endDate: contractEndDate,
        billingTypeCode: 'crm-billing-plan',
        deliveryMethodCode: preview.region,
        isPrimary: true,
        memo: this.createCrmContractSnapshotMemo(preview, dto.memo),
        updatedBy: actorUserId,
        lastSource: 'crm',
        lastActivity: CRM_HANDOFF_SNAPSHOT_ACTIVITY,
      };

      const contract = existingContract
        ? await tx.projectContract.update({
          where: { contractId: existingContract.contractId },
          data: contractData,
        })
        : await tx.projectContract.create({
          data: {
            projectId,
            ...contractData,
            createdBy: actorUserId,
          },
        });

      await tx.contractPayment.updateMany({
        where: { contractId: contract.contractId, isActive: true },
        data: {
          isActive: false,
          updatedBy: actorUserId,
          lastSource: 'crm',
          lastActivity: `${CRM_HANDOFF_SNAPSHOT_ACTIVITY}-replace`,
        },
      });

      const payments = [];
      for (const [index, line] of preview.billingPlan.entries()) {
        payments.push(
          await tx.contractPayment.create({
            data: {
              contractId: contract.contractId,
              paymentTypeCode: this.resolveCrmBillingPaymentType(index, preview.billingPlan.length),
              amount: this.toAmountBigInt(line.revenueAmount, `billingPlan.${index}.revenueAmount`),
              triggerEvent: `${preview.contractCode} ${line.billingYm} CRM 청구계획`,
              paymentStatusCode: 'scheduled',
              dueDate: this.toBillingDueDate(line),
              requestedByUserId: actorUserId,
              sortOrder: index + 1,
              memo: `CRM 외부원가 ${line.externalCostAmount.toLocaleString('ko-KR')}원 · ${preview.boundaryNotice}`,
              createdBy: actorUserId,
              updatedBy: actorUserId,
              lastSource: 'crm',
              lastActivity: CRM_HANDOFF_SNAPSHOT_ACTIVITY,
            },
          }),
        );
      }

      const handoff = await tx.projectHandoff.create({
        data: {
          projectId,
          fromPhaseCode: 'contract',
          toPhaseCode: 'execution',
          handoffTypeCode: 'phase_transition',
          fromUserId: project.currentOwnerUserId,
          requestedByUserId: actorUserId,
          handoffStatusCode: 'accepted',
          conditionNote: this.createCrmHandoffConditionNote(preview),
          memo: dto.memo?.trim() || `CRM 계약 ${preview.contractCode} 인계 스냅샷을 PMS 프로젝트에 반영했습니다.`,
          requestedAt: now,
          respondedAt: now,
          respondedByUserId: actorUserId,
          createdBy: actorUserId,
          updatedBy: actorUserId,
          lastSource: 'crm',
          lastActivity: CRM_HANDOFF_SNAPSHOT_ACTIVITY,
        },
      });

      await this.syncProjectHandoffSummary(tx, projectId, handoff);
      await this.syncExecutionDetailFromPrimaryContract(tx, projectId);

      return {
        sourceApp: 'crm' as const,
        projectId,
        crmContractId: preview.contractId,
        crmContractCode: preview.contractCode,
        appliedAt: now,
        handoff,
        contract,
        payments,
        boundaryNotice: CRM_HANDOFF_SNAPSHOT_BOUNDARY_NOTICE,
      };
    });
  }

  async updateContract(
    projectId: bigint,
    contractId: bigint,
    dto: UpdateProjectContractDto,
  ) {
    await this.requireContract(projectId, contractId);

    return this.db.client.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.projectContract.updateMany({
          where: { projectId, isPrimary: true, contractId: { not: contractId } },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.projectContract.update({
        where: { contractId },
        data: {
          ...(dto.contractCode !== undefined && { contractCode: dto.contractCode }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.contractTypeCode !== undefined && { contractTypeCode: dto.contractTypeCode }),
          ...(dto.totalAmount !== undefined && { totalAmount: this.toOptionalBigInt(dto.totalAmount) }),
          ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
          ...(dto.contractStatusCode !== undefined && { contractStatusCode: dto.contractStatusCode }),
          ...(dto.contractDate !== undefined && { contractDate: this.toOptionalDate(dto.contractDate) }),
          ...(dto.startDate !== undefined && { startDate: this.toOptionalDate(dto.startDate) }),
          ...(dto.endDate !== undefined && { endDate: this.toOptionalDate(dto.endDate) }),
          ...(dto.managerUserId !== undefined && { managerUserId: this.toOptionalBigInt(dto.managerUserId) }),
          ...(dto.billingTypeCode !== undefined && { billingTypeCode: dto.billingTypeCode }),
          ...(dto.deliveryMethodCode !== undefined && { deliveryMethodCode: dto.deliveryMethodCode }),
          ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
          ...(dto.memo !== undefined && { memo: dto.memo }),
        },
      });

      await this.syncExecutionDetailFromPrimaryContract(tx, projectId);
      return updated;
    });
  }

  async listContractPayments(projectId: bigint, contractId: bigint) {
    await this.requireContract(projectId, contractId);

    return this.db.client.contractPayment.findMany({
      where: { contractId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { contractPaymentId: 'asc' }],
    });
  }

  async createContractPayment(
    projectId: bigint,
    contractId: bigint,
    dto: CreateContractPaymentDto,
    actorUserId: bigint,
  ) {
    await this.requireContract(projectId, contractId);

    return this.db.client.contractPayment.create({
      data: {
        contractId,
        paymentTypeCode: dto.paymentTypeCode ?? 'other',
        amount: this.toOptionalBigInt(dto.amount),
        triggerEvent: dto.triggerEvent,
        paymentStatusCode: dto.paymentStatusCode ?? 'scheduled',
        dueDate: this.toOptionalDate(dto.dueDate),
        paidDate: this.toOptionalDate(dto.paidDate),
        requestedByUserId: this.toOptionalBigInt(dto.requestedByUserId) ?? actorUserId,
        sortOrder: dto.sortOrder ?? 0,
        memo: dto.memo,
      },
    });
  }

  async updateContractPayment(
    projectId: bigint,
    contractId: bigint,
    paymentId: bigint,
    dto: UpdateContractPaymentDto,
  ) {
    await this.requireContract(projectId, contractId);

    const payment = await this.db.client.contractPayment.findFirst({
      where: { contractPaymentId: paymentId, contractId, isActive: true },
      select: { contractPaymentId: true },
    });

    if (!payment) {
      throw new NotFoundException(`Contract payment ${paymentId} not found`);
    }

    return this.db.client.contractPayment.update({
      where: { contractPaymentId: paymentId },
      data: {
        ...(dto.paymentTypeCode !== undefined && { paymentTypeCode: dto.paymentTypeCode }),
        ...(dto.amount !== undefined && { amount: this.toOptionalBigInt(dto.amount) }),
        ...(dto.triggerEvent !== undefined && { triggerEvent: dto.triggerEvent }),
        ...(dto.paymentStatusCode !== undefined && { paymentStatusCode: dto.paymentStatusCode }),
        ...(dto.dueDate !== undefined && { dueDate: this.toOptionalDate(dto.dueDate) }),
        ...(dto.paidDate !== undefined && { paidDate: this.toOptionalDate(dto.paidDate) }),
        ...(dto.requestedByUserId !== undefined && { requestedByUserId: this.toOptionalBigInt(dto.requestedByUserId) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });
  }

  private async requireProject(projectId: bigint) {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        statusCode: true,
        stageCode: true,
        doneResultCode: true,
        currentOwnerUserId: true,
        ownerOrganizationId: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  private async requireHandoff(projectId: bigint, handoffId: bigint) {
    const handoff = await this.db.client.projectHandoff.findFirst({
      where: { handoffId, projectId, isActive: true },
    });

    if (!handoff) {
      throw new NotFoundException(`Handoff ${handoffId} not found`);
    }

    return handoff;
  }

  private async requireContract(projectId: bigint, contractId: bigint) {
    const contract = await this.db.client.projectContract.findFirst({
      where: { contractId, projectId, isActive: true },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    return contract;
  }

  private async syncProjectHandoffSummary(
    tx: TxClient,
    projectId: bigint,
    handoff: {
      handoffTypeCode: string;
      handoffStatusCode: string;
      requestedAt: Date;
      respondedAt: Date | null;
      respondedByUserId: bigint | null;
      toUserId: bigint | null;
    },
  ): Promise<void> {
    await tx.project.update({
      where: { id: projectId },
      data: {
        handoffTypeCode: handoff.handoffTypeCode,
        handoffStatusCode: handoff.handoffStatusCode,
        handoffRequestedAt: handoff.requestedAt,
        handoffConfirmedAt:
          handoff.handoffStatusCode === 'accepted' && handoff.respondedAt
            ? handoff.respondedAt
            : null,
        handoffConfirmedBy:
          handoff.handoffStatusCode === 'accepted'
            ? this.toOptionalBigInt(handoff.respondedByUserId)
            : null,
        ...(handoff.handoffStatusCode === 'accepted' && handoff.toUserId
          ? { currentOwnerUserId: this.toOptionalBigInt(handoff.toUserId) }
          : {}),
      },
    });
  }

  private async applyAcceptedHandoff(
    tx: TxClient,
    projectId: bigint,
    handoff: {
      toPhaseCode: string;
      toUserId: bigint | null;
      assignedRoleCode: string | null;
    },
  ): Promise<void> {
    const toUserId = this.toOptionalBigInt(handoff.toUserId);
    if (!toUserId) {
      return;
    }

    if (handoff.toPhaseCode === 'operation') {
      await tx.projectTransitionDetail.upsert({
        where: { projectId },
        create: {
          projectId,
          operationOwnerUserId: toUserId,
        },
        update: {
          operationOwnerUserId: toUserId,
        },
      });
    }

    if (!handoff.assignedRoleCode) {
      return;
    }

    await tx.projectMember.updateMany({
      where: { projectId, isPhaseOwner: true },
      data: { isPhaseOwner: false },
    });

    const defaultOrganizationId = await this.resolveDefaultOrganizationId(tx, toUserId);
    const existingMember = await tx.projectMember.findUnique({
      where: {
        pk_pr_project_member_r_m: {
          projectId,
          userId: toUserId,
          roleCode: handoff.assignedRoleCode,
        },
      },
    });

    if (existingMember) {
      await tx.projectMember.update({
        where: {
          pk_pr_project_member_r_m: {
            projectId,
            userId: toUserId,
            roleCode: handoff.assignedRoleCode,
          },
        },
        data: {
          organizationId: existingMember.organizationId ?? defaultOrganizationId,
          accessLevel: 'owner',
          isPhaseOwner: true,
          isActive: true,
          releasedAt: null,
        },
      });
      return;
    }

    await tx.projectMember.create({
      data: {
        projectId,
        userId: toUserId,
        roleCode: handoff.assignedRoleCode,
        organizationId: defaultOrganizationId,
        accessLevel: 'owner',
        isPhaseOwner: true,
        assignedAt: new Date(),
        allocationRate: 100,
      },
    });
  }

  private async syncExecutionDetailFromPrimaryContract(tx: TxClient, projectId: bigint): Promise<void> {
    const primaryContract = await tx.projectContract.findFirst({
      where: { projectId, isPrimary: true, isActive: true },
      orderBy: [{ updatedAt: 'desc' }, { contractId: 'desc' }],
    });

    await tx.projectExecutionDetail.upsert({
      where: { projectId },
      create: {
        projectId,
        contractSignedAt: primaryContract?.contractDate ?? null,
        contractAmount: primaryContract?.totalAmount ?? null,
        contractUnitCode: primaryContract?.currencyCode ?? null,
        billingTypeCode: primaryContract?.billingTypeCode ?? null,
        deliveryMethodCode: primaryContract?.deliveryMethodCode ?? null,
      },
      update: {
        contractSignedAt: primaryContract?.contractDate ?? null,
        contractAmount: primaryContract?.totalAmount ?? null,
        contractUnitCode: primaryContract?.currencyCode ?? null,
        billingTypeCode: primaryContract?.billingTypeCode ?? null,
        deliveryMethodCode: primaryContract?.deliveryMethodCode ?? null,
      },
    });
  }

  private assertReadyCrmContractHandoffPreview(
    preview: CrmContractHandoffPreview | undefined,
  ): CrmContractHandoffPreview {
    if (!preview) {
      throw new BadRequestException('CRM 계약 인계 스냅샷이 필요합니다.');
    }

    const billingRevenueTotal = preview.billingPlan.reduce(
      (sum, line) => sum + line.revenueAmount,
      0,
    );
    const billingExternalCostTotal = preview.billingPlan.reduce(
      (sum, line) => sum + line.externalCostAmount,
      0,
    );
    const blockedReasons = [
      ...(!preview.contractId?.trim() ? ['CRM 계약 ID가 필요합니다.'] : []),
      ...(!preview.contractCode?.trim() ? ['CRM 계약번호가 필요합니다.'] : []),
      ...(!preview.contractName?.trim() ? ['CRM 계약명이 필요합니다.'] : []),
      ...(!preview.confirmed ? ['확정된 CRM 계약만 PMS 인계 스냅샷으로 반영할 수 있습니다.'] : []),
      ...(preview.readiness !== 'ready' ? ['CRM PMS 인계 preview가 ready 상태여야 합니다.'] : []),
      ...(!preview.wbsCode?.trim() ? ['PMS 실행 기준 WBS 코드가 필요합니다.'] : []),
      ...(preview.billingPlan.length === 0 ? ['CRM 청구계획이 필요합니다.'] : []),
      ...(billingRevenueTotal !== preview.financials.billingRevenueTotal
        ? ['청구계획 매출 합계와 preview 매출 합계가 일치해야 합니다.']
        : []),
      ...(billingExternalCostTotal !== preview.financials.billingExternalCostTotal
        ? ['청구계획 외부원가 합계와 preview 외부원가 합계가 일치해야 합니다.']
        : []),
      ...(preview.financials.billingRevenueTotal !== preview.financials.revenueTotal
        ? ['CRM 청구계획 매출 합계가 계약 매출과 일치해야 합니다.']
        : []),
      ...(preview.financials.billingExternalCostTotal !== preview.financials.externalCostTotal
        ? ['CRM 청구계획 외부원가 합계가 계약 외부원가와 일치해야 합니다.']
        : []),
      ...preview.blockedReasons,
    ];

    if (blockedReasons.length > 0) {
      throw new BadRequestException(`CRM 계약 인계 스냅샷을 반영할 수 없습니다: ${blockedReasons.join(' ')}`);
    }

    return preview;
  }

  private createCrmContractSnapshotMemo(
    preview: CrmContractHandoffPreview,
    memo?: string,
  ): string {
    return [
      `CRM 계약 ${preview.contractCode}(${preview.contractId}) 인계 스냅샷`,
      preview.sourceOpportunityCode ? `원천 영업기회 ${preview.sourceOpportunityCode}` : undefined,
      preview.wbsCode ? `WBS ${preview.wbsCode}` : undefined,
      memo?.trim() || undefined,
      CRM_HANDOFF_SNAPSHOT_BOUNDARY_NOTICE,
    ].filter((line): line is string => Boolean(line)).join('\n');
  }

  private createCrmHandoffConditionNote(preview: CrmContractHandoffPreview): string {
    return [
      `CRM 계약번호: ${preview.contractCode}`,
      `계약명: ${preview.contractName}`,
      `고객사: ${preview.customerName}`,
      `WBS: ${preview.wbsCode}`,
      `청구계획: ${preview.financials.billingPlanCount}건`,
      CRM_HANDOFF_SNAPSHOT_BOUNDARY_NOTICE,
    ].join('\n');
  }

  private resolveCrmBillingPaymentType(
    index: number,
    totalCount: number,
  ): 'advance' | 'interim' | 'final' | 'other' {
    if (totalCount <= 1) {
      return 'final';
    }

    if (index === 0) {
      return 'advance';
    }

    if (index === totalCount - 1) {
      return 'final';
    }

    return 'interim';
  }

  private toRequiredDate(value: string, fieldName: string): Date {
    const date = this.toOptionalDate(value);
    if (!date) {
      throw new BadRequestException(`${fieldName} 날짜가 필요합니다.`);
    }

    return date;
  }

  private toBillingDueDate(line: CrmContractHandoffBillingLine): Date {
    const match = /^(\d{4})[/-](\d{2})$/.exec(line.billingYm.trim());
    if (!match) {
      throw new BadRequestException(`청구월 형식이 올바르지 않습니다: ${line.billingYm}`);
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException(`청구월 형식이 올바르지 않습니다: ${line.billingYm}`);
    }

    return new Date(Date.UTC(year, month, 0));
  }

  private toAmountBigInt(value: number, fieldName: string): bigint {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`${fieldName} 금액이 올바르지 않습니다.`);
    }

    return BigInt(Math.round(value));
  }

  private async resolveDefaultOrganizationId(
    tx: TxClient,
    userId: bigint,
  ): Promise<bigint | null> {
    const now = new Date();
    const relation = await tx.userOrganizationRelation.findFirst({
      where: {
        userId,
        isActive: true,
        organization: {
          isActive: true,
          orgClass: 'permanent',
        },
        AND: [
          {
            OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
          },
          {
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
          },
        ],
      },
      select: {
        orgId: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return relation?.orgId ?? null;
  }

  private toOptionalBigInt(value?: string | bigint | null): bigint | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'bigint') {
      return value;
    }

    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    try {
      return BigInt(normalized);
    } catch {
      throw new BadRequestException('숫자 ID 형식이 올바르지 않습니다.');
    }
  }

  private toOptionalDate(value?: string | null): Date | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('날짜 형식이 올바르지 않습니다.');
    }

    return parsed;
  }
}
