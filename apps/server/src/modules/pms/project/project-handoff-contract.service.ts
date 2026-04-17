import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
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

type TxClient = Omit<
  ExtendedPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class ProjectHandoffContractService {
  constructor(private readonly db: DatabaseService) {}

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
