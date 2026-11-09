import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type { ManagedMembership, ManagedServiceGrant, ParticipationPage, PlatformAccessDiagnosis } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { activeMembershipWhere, ONBOARDING_SERVICES, PlatformAdmissionService, type OnboardingTransaction } from './platform-admission.service.js';
import { ParticipationWriteService, assertMembershipPeriod, assertParticipationReason, participationAudit, participationId } from './participation-write.service.js';
import type { CreateMembershipDto, CreateServiceGrantDto, ParticipationListQuery, ParticipationRevisionDto, TransferMembershipDto, UpdateMembershipDto, UpdateServiceGrantDto } from './participation-operations.dto.js';

const membershipInclude = {
  user: { select: { userName: true, isActive: true } },
  organization: { select: { orgName: true, isActive: true } },
} as const;
type MembershipRow = Prisma.UserOrganizationRelationGetPayload<{ include: typeof membershipInclude }>;

function membershipItem(row: MembershipRow, now = new Date()): ManagedMembership {
  return {
    id: row.userOrgRelationId.toString(), userId: row.userId.toString(), userName: row.user.userName,
    organizationId: row.orgId.toString(), organizationName: row.organization.orgName,
    isPrimary: row.isPrimary, isLeader: row.isLeader, positionCode: row.positionCode,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null, effectiveTo: row.effectiveTo?.toISOString() ?? null,
    isActive: row.isActive, effective: row.isActive && row.user.isActive && row.organization.isActive
      && (!row.effectiveFrom || row.effectiveFrom <= now) && (!row.effectiveTo || row.effectiveTo > now),
    reason: row.memo, updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ParticipationOperationsService {
  constructor(private readonly db: DatabaseService, private readonly admission: PlatformAdmissionService,
    private readonly writer: ParticipationWriteService) {}

  private async assertAdmin(actor: bigint, tx: OnboardingTransaction = this.db.client) {
    if (!await this.admission.isPlatformAdmin(actor, tx)) throw new ForbiddenException('플랫폼 관리자만 직접 소속·이용권을 관리할 수 있습니다.');
  }

  private async write<T>(actor: bigint, reason: string, operation: (tx: OnboardingTransaction) => Promise<T>): Promise<T> {
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
          if (error.code === 'P2002' || error.code === 'P2034') throw new ConflictException('다른 작업으로 상태가 변경됐습니다. 새로고침 후 다시 처리해 주세요.');
        }
        throw error;
      }
    }
  }

  private assertRevision(updatedAt: Date, expected: string) {
    if (updatedAt.getTime() !== new Date(expected).getTime()) throw new ConflictException('다른 작업으로 변경된 자료입니다. 새로고침 후 다시 처리해 주세요.');
  }

  async diagnose(actor: bigint, userId: bigint): Promise<PlatformAccessDiagnosis> {
    await this.assertAdmin(actor);
    const state = await this.admission.state(userId);
    if (!state.user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    const [account, admin, memberships, grants] = await Promise.all([
      this.db.client.userAuth.findUnique({ where: { userId }, select: { accountStatusCode: true } }),
      this.admission.isPlatformAdmin(userId),
      this.db.client.userOrganizationRelation.count({ where: activeMembershipWhere(userId) }),
      this.admission.grants(userId),
    ]);
    const accountStatus = account?.accountStatusCode ?? 'missing';
    const loginAllowed = state.user.isActive && accountStatus === 'active';
    const isPlatformAdmin = loginAllowed && admin;
    return {
      userId: userId.toString(), generatedAt: new Date().toISOString(), accountStatus,
      participationStatus: state.status, isPlatformAdmin, effectiveMembershipCount: memberships,
      services: [{ serviceCode: 'admin', allowed: loginAllowed, reason: !loginAllowed ? '계정 이용 불가' : isPlatformAdmin ? '공통 관리와 내 업무 이용 가능' : '내 업무 이용 가능 · 공통 관리는 관리자 권한 필요', roleCodes: isPlatformAdmin ? ['admin'] : [], organizationIds: [], grantIds: [] },
        ...ONBOARDING_SERVICES.map(serviceCode => {
          const serviceGrants = grants.filter(grant => grant.serviceCode === serviceCode);
          const allowed = loginAllowed && state.status === 'active' && (isPlatformAdmin || serviceGrants.length > 0);
          return { serviceCode, allowed, reason: !loginAllowed ? '계정 이용 불가' : state.status !== 'active' ? '플랫폼 참여 비활성'
            : isPlatformAdmin ? '플랫폼 관리자 권한' : !serviceGrants.length ? '유효한 이용권 없음 · 소속·회수·만료 상태 확인' : '유효한 서비스 이용권',
            roleCodes: isPlatformAdmin ? ['admin'] : [...new Set(serviceGrants.map(grant => grant.sourceCode === 'migration' || grant.sourceCode === 'bootstrap' ? state.user!.roleCode : grant.roleCode))],
            organizationIds: [...new Set(serviceGrants.flatMap(grant => grant.orgId === null ? [] : [grant.orgId.toString()]))],
            grantIds: serviceGrants.map(grant => grant.id.toString()),
          };
        })],
    };
  }

  async memberships(actor: bigint, query: ParticipationListQuery): Promise<ParticipationPage<ManagedMembership>> {
    await this.assertAdmin(actor);
    const where: Prisma.UserOrganizationRelationWhereInput = {
      ...(query.userId ? { userId: participationId(query.userId) } : {}),
      ...(query.organizationId ? { orgId: participationId(query.organizationId) } : {}),
      ...(query.status !== 'all' ? { isActive: query.status === 'active' } : {}),
      ...(query.search?.trim() ? { OR: [
        { user: { userName: { contains: query.search.trim(), mode: 'insensitive' } } },
        { organization: { orgName: { contains: query.search.trim(), mode: 'insensitive' } } },
      ] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.client.userOrganizationRelation.findMany({ where, include: membershipInclude,
        orderBy: [{ updatedAt: 'desc' }, { userOrgRelationId: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.client.userOrganizationRelation.count({ where }),
    ]);
    return { items: rows.map((row) => membershipItem(row)), total, page: query.page, pageSize: query.pageSize };
  }

  async createMembership(actor: bigint, dto: CreateMembershipDto) {
    return this.write(actor, dto.reason, async (tx) => {
      const row = await this.writer.createMembership(tx, {
        userId: participationId(dto.userId), orgId: participationId(dto.organizationId),
        isPrimary: dto.isPrimary, isLeader: dto.isLeader, positionCode: dto.positionCode,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null, reason: dto.reason,
      }, actor, 'membership.admin.create');
      return { id: row.userOrgRelationId.toString() };
    });
  }

  private async membershipForChange(tx: OnboardingTransaction, id: bigint, revision: string) {
    const row = await tx.userOrganizationRelation.findUnique({ where: { userOrgRelationId: id } });
    if (!row) throw new NotFoundException('소속을 찾을 수 없습니다.');
    this.assertRevision(row.updatedAt, revision);
    if (!row.isActive) throw new ConflictException('종료한 소속은 변경할 수 없습니다. 새 소속을 배치해 주세요.');
    return row;
  }

  async updateMembership(id: bigint, actor: bigint, dto: UpdateMembershipDto) {
    return this.write(actor, dto.reason, async (tx) => {
      const row = await this.membershipForChange(tx, id, dto.expectedUpdatedAt);
      await this.writer.assertSubject(tx, row.userId);
      await this.writer.assertOrganization(tx, row.orgId);
      const from = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
      const to = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
      assertMembershipPeriod(from, to);
      // Ended assignments must be terminated so dependent grants are revoked as well.
      if (to && to <= new Date()) throw new BadRequestException('소속 종료는 종료 기능을 사용해 주세요.');
      await this.writer.assertNoOverlap(tx, { userId: row.userId, orgId: row.orgId, effectiveFrom: from, effectiveTo: to, reason: dto.reason }, id);
      if (dto.isPrimary && from && from > new Date()) throw new BadRequestException('주 소속은 현재 유효한 소속에서 지정해 주세요.');
      const metadata = participationAudit(actor, 'membership.admin.update', dto.reason);
      if (dto.isPrimary) await tx.userOrganizationRelation.updateMany({ where: { userId: row.userId, isPrimary: true, isActive: true }, data: { isPrimary: false, ...metadata } });
      await tx.userOrganizationRelation.update({ where: { userOrgRelationId: id }, data: {
        isPrimary: dto.isPrimary, isLeader: dto.isLeader, positionCode: dto.positionCode ?? null,
        effectiveFrom: from, effectiveTo: to, ...metadata,
      } });
      await this.ensurePrimary(tx, row.userId, actor, dto.reason);
      return { id: id.toString() };
    });
  }

  private async ensurePrimary(tx: OnboardingTransaction, userId: bigint, actor: bigint, reason: string) {
    if (await tx.userOrganizationRelation.count({ where: { ...activeMembershipWhere(userId), isPrimary: true } })) return;
    const next = await tx.userOrganizationRelation.findFirst({ where: activeMembershipWhere(userId), orderBy: { userOrgRelationId: 'asc' } });
    if (next) await tx.userOrganizationRelation.update({ where: { userOrgRelationId: next.userOrgRelationId },
      data: { isPrimary: true, ...participationAudit(actor, 'membership.admin.primary', reason) } });
  }

  private async endRelation(tx: OnboardingTransaction, row: Prisma.UserOrganizationRelationGetPayload<Record<string, never>>, actor: bigint, reason: string) {
    const metadata = participationAudit(actor, 'membership.admin.end', reason);
    const now = new Date();
    await tx.userOrganizationRelation.update({ where: { userOrgRelationId: row.userOrgRelationId }, data: {
      isActive: false, isPrimary: false,
      // Cancelling a future assignment preserves its planned period; isActive records cancellation.
      ...(!row.effectiveFrom || row.effectiveFrom < now ? { effectiveTo: row.effectiveTo && row.effectiveTo < now ? row.effectiveTo : now } : {}),
      ...metadata,
    } });
    // Future assignments do not justify retaining today's privileges after a membership ends.
    if (!await tx.userOrganizationRelation.count({ where: { ...activeMembershipWhere(row.userId, now), orgId: row.orgId } })) {
      await tx.serviceGrant.updateMany({ where: { userId: row.userId, orgId: row.orgId, isActive: true }, data: { isActive: false, ...metadata } });
      await tx.approvalAuthority.updateMany({ where: { userId: row.userId, orgId: row.orgId, isActive: true }, data: { isActive: false, ...metadata } });
    }
    await this.ensurePrimary(tx, row.userId, actor, reason);
  }

  async endMembership(id: bigint, actor: bigint, dto: ParticipationRevisionDto) {
    return this.write(actor, dto.reason, async (tx) => {
      const row = await this.membershipForChange(tx, id, dto.expectedUpdatedAt);
      await this.endRelation(tx, row, actor, dto.reason);
      return { id: id.toString() };
    });
  }

  async transferMembership(id: bigint, actor: bigint, dto: TransferMembershipDto) {
    return this.write(actor, dto.reason, async (tx) => {
      const row = await this.membershipForChange(tx, id, dto.expectedUpdatedAt);
      const orgId = participationId(dto.organizationId);
      if (orgId === row.orgId) throw new BadRequestException('현재 소속과 다른 조직을 선택해 주세요.');
      await this.endRelation(tx, row, actor, dto.reason);
      const next = await this.writer.createMembership(tx, {
        userId: row.userId, orgId, isPrimary: row.isPrimary, positionCode: row.positionCode, reason: dto.reason,
      }, actor, 'membership.admin.transfer');
      return { id: next.userOrgRelationId.toString(), previousId: id.toString() };
    });
  }

  async grants(actor: bigint, query: ParticipationListQuery): Promise<ParticipationPage<ManagedServiceGrant>> {
    await this.assertAdmin(actor);
    const where: Prisma.ServiceGrantWhereInput = {
      ...(query.userId ? { userId: participationId(query.userId) } : {}),
      ...(query.organizationId ? { orgId: participationId(query.organizationId) } : {}),
      ...(query.serviceCode ? { serviceCode: query.serviceCode } : {}),
      ...(query.status !== 'all' ? { isActive: query.status === 'active' } : {}),
      ...(query.search?.trim() ? { user: { userName: { contains: query.search.trim(), mode: 'insensitive' } } } : {}),
    };
    const now = new Date();
    const [rows, total] = await Promise.all([
      this.db.client.serviceGrant.findMany({ where, include: {
        user: { select: { userName: true, isActive: true, platformEnrollment: { select: { statusCode: true, isActive: true } },
          authAccount: { select: { accountStatusCode: true } },
          organizationRelations: { where: { isActive: true, organization: { isActive: true, orgClass: 'permanent' },
            AND: [{ OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] }, { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }] }, select: { orgId: true } },
        } }, organization: { select: { orgName: true } },
      }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.client.serviceGrant.count({ where }),
    ]);
    return { total, page: query.page, pageSize: query.pageSize, items: rows.map((row) => {
      const reason = !row.isActive ? '회수됨' : row.expiresAt && row.expiresAt <= now ? '이용 기간 만료'
        : !row.user.isActive || row.user.authAccount?.accountStatusCode !== 'active' ? '계정 이용 불가'
          : !row.user.platformEnrollment?.isActive || row.user.platformEnrollment.statusCode !== 'active' ? '플랫폼 참여 비활성'
            : row.orgId && !row.user.organizationRelations.some((relation) => relation.orgId === row.orgId) ? '유효한 조직 소속 없음' : null;
      return { id: row.id.toString(), userId: row.userId.toString(), userName: row.user.userName,
        organizationId: row.orgId?.toString() ?? null, organizationName: row.organization?.orgName ?? null,
        serviceCode: row.serviceCode, roleCode: row.roleCode, expiresAt: row.expiresAt?.toISOString() ?? null,
        isActive: row.isActive, effective: reason === null, inactiveReason: reason, sourceCode: row.sourceCode,
        reason: row.memo, updatedAt: row.updatedAt.toISOString() };
    }) };
  }

  async createGrant(actor: bigint, dto: CreateServiceGrantDto) {
    return this.write(actor, dto.reason, async (tx) => {
      const userId = participationId(dto.userId);
      const orgId = participationId(dto.organizationId);
      const existing = await tx.serviceGrant.findUnique({ where: { userId_serviceCode_scopeKey: { userId, serviceCode: dto.serviceCode, scopeKey: orgId.toString() } } });
      if (existing) throw new ConflictException('기존 이용권이 있습니다. 목록에서 변경하거나 재부여해 주세요.');
      const row = await this.writer.setGrant(tx, { ...dto, userId, orgId, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }, actor, 'service-grant.admin.create');
      return { id: row.id.toString() };
    });
  }

  async updateGrant(id: bigint, actor: bigint, dto: UpdateServiceGrantDto) {
    return this.write(actor, dto.reason, async (tx) => {
      const row = await tx.serviceGrant.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('이용권을 찾을 수 없습니다.');
      this.assertRevision(row.updatedAt, dto.expectedUpdatedAt);
      if (!row.orgId) throw new BadRequestException('이전 플랫폼 전체 이용권은 회수한 뒤 조직별 이용권을 부여해 주세요.');
      await this.writer.setGrant(tx, { userId: row.userId, orgId: row.orgId, serviceCode: row.serviceCode,
        roleCode: dto.roleCode, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null, reason: dto.reason,
      }, actor, row.isActive ? 'service-grant.admin.update' : 'service-grant.admin.restore');
      return { id: id.toString() };
    });
  }

  async revokeGrant(id: bigint, actor: bigint, dto: ParticipationRevisionDto) {
    return this.write(actor, dto.reason, async (tx) => {
      const row = await tx.serviceGrant.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('이용권을 찾을 수 없습니다.');
      this.assertRevision(row.updatedAt, dto.expectedUpdatedAt);
      if (!row.isActive) throw new ConflictException('이미 회수된 이용권입니다.');
      await tx.serviceGrant.update({ where: { id }, data: { isActive: false, ...participationAudit(actor, 'service-grant.admin.revoke', dto.reason) } });
      return { id: id.toString() };
    });
  }
}
