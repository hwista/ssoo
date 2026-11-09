import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type { CommonPermissionTarget, ManagedCommonPermission, ParticipationPage } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { PlatformAdmissionService, type OnboardingTransaction } from '../onboarding/platform-admission.service.js';
import { assertParticipationReason, participationId } from '../onboarding/participation-write.service.js';
import type { ParticipationRevisionDto } from '../onboarding/participation-operations.dto.js';
import type { CommonPermissionDto, CommonPermissionQuery, CommonPermissionUpdateDto } from './dto/common-permissions.dto.js';

const commonPermissionWhere: Prisma.PermissionWhereInput = {
  OR: [{ permissionCode: { startsWith: 'common.' } }, { permissionCode: { startsWith: 'system.' } }],
  NOT: { permissionCode: 'system.override' },
};
const globalAction = { exceptionAxis: 'action', targetOrgId: null, targetObjectType: null, targetObjectId: null } as const;

/** Common action assignments only. Domain object policies remain in their owning applications. */
@Injectable()
export class CommonPermissionsService {
  constructor(private readonly db: DatabaseService, private readonly admission: PlatformAdmissionService) {}

  private async assertAdmin(actor: bigint, tx: OnboardingTransaction = this.db.client) {
    if (!await this.admission.isPlatformAdmin(actor, tx)) throw new ForbiddenException('플랫폼 관리자만 공통 권한을 관리할 수 있습니다.');
  }

  private async write<T>(actor: bigint, reason: string, operation: (tx: OnboardingTransaction) => Promise<T>) {
    assertParticipationReason(reason);
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.client.$transaction(async (tx) => {
          await this.assertAdmin(actor, tx);
          return operation(tx);
        }, { isolationLevel: 'Serializable' });
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (error.code === 'P2034' || error.code === 'P2002') throw new ConflictException('다른 작업으로 상태가 변경됐습니다. 새로고침 후 다시 처리해 주세요.');
        }
        throw error;
      }
    }
  }

  private audit(actor: bigint, reason: string, activity: string) {
    return { updatedBy: actor, memo: reason.trim(), lastSource: 'admin-common-permissions', lastActivity: activity };
  }

  private assertRevision(actual: Date, expected: string) {
    if (actual.getTime() !== new Date(expected).getTime()) throw new ConflictException('다른 작업으로 변경된 기록입니다. 새로고침 후 다시 처리해 주세요.');
  }

  private assertCommonCode(code: string) {
    if (!/^(common|system)\./.test(code) || code === 'system.override') {
      throw new BadRequestException('이 프로그램에서는 system.override를 제외한 공통 action 권한만 관리합니다.');
    }
  }

  private async validate(tx: OnboardingTransaction, kind: CommonPermissionTarget, dto: CommonPermissionDto) {
    this.assertCommonCode(dto.permissionCode);
    const targetId = participationId(dto.targetId);
    const permission = await tx.permission.findFirst({ where: { permissionCode: dto.permissionCode, isActive: true } });
    if (!permission) throw new BadRequestException('활성 공통 권한을 선택해 주세요.');
    const from = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
    const to = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if ((from && !Number.isFinite(from.getTime())) || (to && (!Number.isFinite(to.getTime()) || to <= new Date())) || (from && to && from >= to)) {
      throw new BadRequestException('시작일은 종료일보다 빨라야 하며 종료일은 현재 이후여야 합니다.');
    }
    if (kind === 'organization') {
      if (dto.effect !== 'grant') throw new BadRequestException('조직 권한은 직접 부여만 지원합니다. 차단은 사용자 예외에서 처리해 주세요.');
      if (!await tx.organization.count({ where: { orgId: targetId, isActive: true, orgClass: 'permanent' } })) throw new BadRequestException('활성 조직을 선택해 주세요.');
    } else {
      if (from) throw new BadRequestException('사용자 예외는 즉시 적용되며 시작일을 예약할 수 없습니다.');
      if (!await tx.user.count({ where: { id: targetId, isActive: true } })) throw new BadRequestException('활성 사용자를 선택해 주세요.');
    }
    return { targetId, permission, from, to };
  }

  async list(kind: CommonPermissionTarget, actor: bigint, query: CommonPermissionQuery): Promise<ParticipationPage<ManagedCommonPermission>> {
    await this.assertAdmin(actor);
    const now = new Date();
    const targetId = query.targetId ? participationId(query.targetId) : undefined;
    const active = query.status === 'all' ? {} : { isActive: query.status === 'active' };
    const pagination = { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
    if (kind === 'organization') {
      const where: Prisma.OrganizationPermissionWhereInput = { orgId: targetId, permission: commonPermissionWhere, ...active };
      const [rows, total] = await Promise.all([
        this.db.client.organizationPermission.findMany({ where, ...pagination, include: { organization: true, permission: true }, orderBy: [{ updatedAt: 'desc' }, { orgPermissionId: 'desc' }] }),
        this.db.client.organizationPermission.count({ where }),
      ]);
      return { total, page: query.page, pageSize: query.pageSize, items: rows.map(row => {
        const reason = !row.isActive ? '회수됨' : !row.permission.isActive ? '권한 중지' : !row.organization.isActive || row.organization.orgClass !== 'permanent' ? '조직 이용 불가'
          : row.effectiveFrom && row.effectiveFrom > now ? '시작 전' : row.effectiveTo && row.effectiveTo <= now ? '기간 만료' : null;
        return { id: row.orgPermissionId.toString(), targetId: row.orgId.toString(), targetName: row.organization.orgName,
          permissionCode: row.permission.permissionCode, permissionName: row.permission.permissionName, effect: 'grant',
          effectiveFrom: row.effectiveFrom?.toISOString() ?? null, effectiveTo: row.effectiveTo?.toISOString() ?? null,
          isActive: row.isActive, effective: reason === null, inactiveReason: reason, reason: row.memo, updatedAt: row.updatedAt.toISOString() };
      }) };
    }
    const where: Prisma.UserPermissionExceptionWhereInput = { userId: targetId, ...globalAction, permission: commonPermissionWhere, ...active };
    const [rows, total] = await Promise.all([
      this.db.client.userPermissionException.findMany({ where, ...pagination, include: { user: true, permission: true }, orderBy: [{ updatedAt: 'desc' }, { userPermissionExceptionId: 'desc' }] }),
      this.db.client.userPermissionException.count({ where }),
    ]);
    return { total, page: query.page, pageSize: query.pageSize, items: rows.map(row => {
      const reason = !row.isActive ? '회수됨' : !row.permission.isActive ? '권한 중지' : !row.user.isActive ? '사용자 중지' : row.expiresAt && row.expiresAt <= now ? '기간 만료' : null;
      return { id: row.userPermissionExceptionId.toString(), targetId: row.userId.toString(), targetName: row.user.userName,
        permissionCode: row.permission.permissionCode, permissionName: row.permission.permissionName, effect: row.effectType === 'revoke' ? 'revoke' : 'grant',
        effectiveFrom: null, effectiveTo: row.expiresAt?.toISOString() ?? null, isActive: row.isActive, effective: reason === null,
        inactiveReason: reason, reason: row.reason ?? row.memo, updatedAt: row.updatedAt.toISOString() };
    }) };
  }

  async create(kind: CommonPermissionTarget, actor: bigint, dto: CommonPermissionDto) {
    return this.write(actor, dto.reason, async tx => {
      const { targetId, permission, from, to } = await this.validate(tx, kind, dto);
      const data = this.audit(actor, dto.reason, `common-permission.${kind}.create`);
      if (kind === 'organization') {
        if (await tx.organizationPermission.count({ where: { orgId: targetId, permissionId: permission.permissionId } })) throw new ConflictException('기존 조직 권한 기록이 있습니다. 해당 기록에서 변경하거나 재부여해 주세요.');
        const row = await tx.organizationPermission.create({ data: { orgId: targetId, permissionId: permission.permissionId, effectiveFrom: from, effectiveTo: to, createdBy: actor, ...data } });
        return { id: row.orgPermissionId.toString() };
      }
      await this.assertNoDuplicate(tx, targetId, permission.permissionId, dto.effect);
      const row = await tx.userPermissionException.create({ data: { userId: targetId, permissionId: permission.permissionId, ...globalAction,
        effectType: dto.effect, expiresAt: to, appliedByUserId: actor, appliedAt: new Date(), reason: dto.reason.trim(), createdBy: actor, ...data } });
      return { id: row.userPermissionExceptionId.toString() };
    });
  }

  private async assertNoDuplicate(tx: OnboardingTransaction, userId: bigint, permissionId: bigint, effectType: string, excluding?: bigint) {
    if (await tx.userPermissionException.count({ where: { userId, permissionId, effectType, ...globalAction, isActive: true,
      userPermissionExceptionId: excluding ? { not: excluding } : undefined, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } })) {
      throw new ConflictException('같은 효과의 유효한 사용자 예외가 있습니다. 기존 기록을 변경해 주세요.');
    }
  }

  async update(kind: CommonPermissionTarget, id: bigint, actor: bigint, dto: CommonPermissionUpdateDto) {
    return this.write(actor, dto.reason, async tx => {
      const { targetId, permission, from, to } = await this.validate(tx, kind, dto);
      const data = this.audit(actor, dto.reason, `common-permission.${kind}.update`);
      if (kind === 'organization') {
        const row = await tx.organizationPermission.findUnique({ where: { orgPermissionId: id } });
        if (!row) throw new NotFoundException('조직 권한을 찾을 수 없습니다.');
        this.assertRevision(row.updatedAt, dto.expectedUpdatedAt);
        if (row.orgId !== targetId || row.permissionId !== permission.permissionId) throw new BadRequestException('대상과 권한은 변경할 수 없습니다. 기존 권한을 회수한 뒤 새로 부여해 주세요.');
        await tx.organizationPermission.update({ where: { orgPermissionId: id }, data: { isActive: true, effectiveFrom: from, effectiveTo: to, ...data } });
      } else {
        const row = await tx.userPermissionException.findUnique({ where: { userPermissionExceptionId: id } });
        if (!row) throw new NotFoundException('사용자 예외를 찾을 수 없습니다.');
        this.assertGlobalAction(row);
        this.assertRevision(row.updatedAt, dto.expectedUpdatedAt);
        if (row.userId !== targetId || row.permissionId !== permission.permissionId) throw new BadRequestException('대상과 권한은 변경할 수 없습니다.');
        await this.assertNoDuplicate(tx, targetId, permission.permissionId, dto.effect, id);
        await tx.userPermissionException.update({ where: { userPermissionExceptionId: id }, data: { isActive: true,
          effectType: dto.effect, expiresAt: to, appliedByUserId: actor, appliedAt: new Date(), reason: dto.reason.trim(), ...data } });
      }
      return { id: id.toString() };
    });
  }

  private assertGlobalAction(row: { exceptionAxis: string; targetOrgId: bigint | null; targetObjectType: string | null; targetObjectId: string | null }) {
    if (row.exceptionAxis !== 'action' || row.targetOrgId !== null || row.targetObjectType !== null || row.targetObjectId !== null) throw new BadRequestException('대상 범위가 있는 예외는 해당 애플리케이션에서 관리해 주세요.');
  }

  async revoke(kind: CommonPermissionTarget, id: bigint, actor: bigint, dto: ParticipationRevisionDto) {
    return this.write(actor, dto.reason, async tx => {
      const data = { isActive: false, ...this.audit(actor, dto.reason, `common-permission.${kind}.revoke`) };
      if (kind === 'organization') {
        const row = await tx.organizationPermission.findUnique({ where: { orgPermissionId: id }, include: { permission: true } });
        if (!row) throw new NotFoundException('조직 권한을 찾을 수 없습니다.');
        this.assertCommonCode(row.permission.permissionCode);
        this.assertRevision(row.updatedAt, dto.expectedUpdatedAt);
        if (!row.isActive) throw new ConflictException('이미 회수한 조직 권한입니다.');
        await tx.organizationPermission.update({ where: { orgPermissionId: id }, data });
      } else {
        const row = await tx.userPermissionException.findUnique({ where: { userPermissionExceptionId: id }, include: { permission: true } });
        if (!row) throw new NotFoundException('사용자 예외를 찾을 수 없습니다.');
        this.assertGlobalAction(row);
        this.assertCommonCode(row.permission.permissionCode);
        this.assertRevision(row.updatedAt, dto.expectedUpdatedAt);
        if (!row.isActive) throw new ConflictException('이미 회수한 사용자 예외입니다.');
        await tx.userPermissionException.update({ where: { userPermissionExceptionId: id }, data: { ...data, reason: dto.reason.trim() } });
      }
      return { id: id.toString() };
    });
  }
}
