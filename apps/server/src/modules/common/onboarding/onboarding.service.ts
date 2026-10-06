import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type { OnboardingTransaction } from './platform-admission.service.js';
import type { OnboardingRequest, OnboardingRequestKind, OnboardingRequestStatus, OnboardingRoleCode, OnboardingServiceCode, OnboardingSnapshot } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { CreateOnboardingRequestDto, DecideOnboardingRequestDto, SetApprovalAuthorityDto } from './onboarding.dto.js';
import { activeMembershipWhere, ONBOARDING_SERVICES, PlatformAdmissionService } from './platform-admission.service.js';

type RequestRecord = Prisma.OnboardingRequestGetPayload<{ include: { user: true; organization: true } }>;
const includeRequest = { user: true, organization: true } as const;
function inputId(value: string): bigint {
  if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) throw new BadRequestException('ID 형식이 올바르지 않습니다.');
  return BigInt(value);
}
const rank = (role: string) => ['viewer', 'user', 'manager'].indexOf(role);
const audit = (userId: bigint, activity: string) => ({ updatedBy: userId, lastSource: 'common-onboarding', lastActivity: activity });
const item = (request: RequestRecord): OnboardingRequest => ({
  id: request.id.toString(), userId: request.userId.toString(), userName: request.user.userName,
  kind: request.kind as OnboardingRequestKind, status: request.statusCode as OnboardingRequestStatus,
  organizationId: (request.resolvedOrgId ?? request.orgId)?.toString() ?? null,
  organizationName: request.organization?.orgName ?? request.organizationName,
  parentOrganizationId: request.parentOrgId?.toString() ?? null,
  serviceCode: request.serviceCode as OnboardingServiceCode | null, message: request.message,
  decisionMessage: request.decisionMessage, createdAt: request.createdAt.toISOString(), decidedAt: request.decidedAt?.toISOString() ?? null,
});

@Injectable()
export class OnboardingService {
  constructor(private readonly db: DatabaseService, private readonly admission: PlatformAdmissionService) {}

  // Retry serialization conflicts only. A failed attempt commits neither the decision nor its grants.
  private async transaction<T>(operation: (tx: OnboardingTransaction) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await this.db.client.$transaction(operation, { isolationLevel: 'Serializable' }); }
      catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2034' && attempt < 2) continue;
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
          throw new ConflictException('동일한 신청 또는 권한이 이미 존재합니다. 최신 상태를 확인해 주세요.');
        }
        throw error;
      }
    }
  }

  private async assertApplicant(userId: bigint, tx: OnboardingTransaction) {
    const state = await this.admission.state(userId, tx);
    if (!state.user || state.status === 'suspended') throw new ForbiddenException('정지된 계정은 신청할 수 없습니다.');
  }

  private async authorities(userId: bigint, tx: OnboardingTransaction) {
    if ((await this.admission.state(userId, tx)).status !== 'active') return [];
    const now = new Date();
    const memberships = await tx.userOrganizationRelation.findMany({ where: activeMembershipWhere(userId, now) });
    return tx.approvalAuthority.findMany({ where: {
      userId, isActive: true,
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ orgId: null }, { orgId: { in: memberships.map((membership) => membership.orgId) } }] }],
    } });
  }

  private async reviewScope(userId: bigint, tx: OnboardingTransaction): Promise<Prisma.OnboardingRequestWhereInput> {
    if (await this.admission.isPlatformAdmin(userId, tx)) return { userId: { not: userId } };
    const authorities = await this.authorities(userId, tx);
    const scopes: Prisma.OnboardingRequestWhereInput[] = authorities.map((authority) => authority.authorityKind === 'organization'
      ? { OR: [{ kind: 'membership', orgId: authority.orgId }, { kind: 'organization', parentOrgId: authority.orgId }] }
      : { kind: 'service', serviceCode: authority.serviceCode, ...(authority.orgId ? { orgId: authority.orgId } : {}) });
    return { userId: { not: userId }, OR: scopes };
  }

  async snapshot(userId: bigint): Promise<OnboardingSnapshot> {
    const [state, organizations, memberships, requests, grants, isPlatformAdmin, authorities] = await Promise.all([
      this.admission.state(userId),
      this.db.client.organization.findMany({ where: { isActive: true, orgClass: 'permanent' }, orderBy: { orgName: 'asc' } }),
      this.db.client.userOrganizationRelation.findMany({ where: activeMembershipWhere(userId) }),
      this.db.client.onboardingRequest.findMany({ where: { userId }, include: includeRequest, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.admission.grants(userId), this.admission.isPlatformAdmin(userId), this.authorities(userId, this.db.client),
    ]);
    return {
      status: state.status, isPlatformAdmin, canReview: isPlatformAdmin || authorities.length > 0,
      organizations: organizations.map((organization) => ({ id: organization.orgId.toString(), name: organization.orgName,
        parentId: organization.parentOrgId?.toString() ?? null, member: memberships.some((membership) => membership.orgId === organization.orgId) })),
      requests: requests.map(item),
      grants: grants.map((grant) => ({ id: grant.id.toString(), serviceCode: grant.serviceCode as OnboardingServiceCode,
        organizationId: grant.orgId?.toString() ?? null, roleCode: (rank(grant.roleCode) >= 0 ? grant.roleCode : 'manager') as OnboardingRoleCode,
        isActive: grant.isActive, expiresAt: grant.expiresAt?.toISOString() ?? null, sourceCode: grant.sourceCode })),
      availableServices: state.status !== 'active' ? [] : isPlatformAdmin ? ONBOARDING_SERVICES : ONBOARDING_SERVICES.filter((code) => grants.some((grant) => grant.serviceCode === code)),
    };
  }

  async create(userId: bigint, dto: CreateOnboardingRequestDto) {
    if (!dto.message.trim()) throw new BadRequestException('신청 사유를 입력해 주세요.');
    if (dto.kind === 'organization') {
      if (!dto.organizationName?.trim() || dto.organizationId || dto.serviceCode) throw new BadRequestException('신규 조직의 이름과 상위 조직만 지정해 주세요.');
    } else if (!dto.organizationId || dto.organizationName || dto.parentOrganizationId || (dto.kind === 'service' ? !dto.serviceCode : dto.serviceCode)) {
      throw new BadRequestException('소속 조직과 신청 유형을 확인해 주세요.');
    }
    return this.transaction(async (tx) => {
      await this.assertApplicant(userId, tx);
      const orgId = dto.organizationId ? inputId(dto.organizationId) : null;
      const parentOrgId = dto.parentOrganizationId ? inputId(dto.parentOrganizationId) : null;
      if (orgId ?? parentOrgId) await this.assertOrganization((orgId ?? parentOrgId)!, tx);
      if (dto.kind === 'membership' && (await this.admission.state(userId, tx)).status === 'active' && await tx.userOrganizationRelation.count({ where: { ...activeMembershipWhere(userId), orgId: orgId! } })) {
        throw new ConflictException('이미 소속된 조직입니다.');
      }
      if (dto.kind === 'service' && await tx.serviceGrant.count({ where: { userId, orgId, serviceCode: dto.serviceCode, isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } })) throw new ConflictException('이미 해당 조직의 서비스 이용권이 있습니다.');
      return item(await tx.onboardingRequest.create({ data: {
        userId, kind: dto.kind, orgId, parentOrgId, organizationName: dto.organizationName?.trim(), serviceCode: dto.serviceCode,
        message: dto.message.trim(), createdBy: userId, ...audit(userId, 'onboarding.request'),
      }, include: includeRequest }));
    });
  }

  async reviewQueue(userId: bigint) {
    return (await this.db.client.onboardingRequest.findMany({
      where: { AND: [await this.reviewScope(userId, this.db.client), { statusCode: 'pending' }] },
      include: includeRequest, orderBy: { createdAt: 'asc' }, take: 200,
    })).map(item);
  }

  async decide(id: bigint, userId: bigint, dto: DecideOnboardingRequestDto) {
    if (!dto.message.trim()) throw new BadRequestException('결정 사유를 입력해 주세요.');
    return this.transaction(async (tx) => {
      const request = await tx.onboardingRequest.findFirst({ where: { id, AND: [await this.reviewScope(userId, tx)] }, include: includeRequest });
      if (!request) throw new ForbiddenException('이 신청을 처리할 승인 권한이 없습니다. 본인 신청은 승인할 수 없습니다.');
      if (request.statusCode !== 'pending') throw new ConflictException('이미 처리된 신청입니다.');
      await this.assertApplicant(request.userId, tx);
      let resolvedOrgId: bigint | null = null;
      if (dto.decision === 'approve') {
        if (request.kind === 'service') {
          const orgId = request.orgId!;
          await this.assertOrganization(orgId, tx);
          if ((await this.admission.state(request.userId, tx)).status !== 'active' || !await tx.userOrganizationRelation.count({ where: { ...activeMembershipWhere(request.userId), orgId: orgId! } })) {
            throw new ConflictException('신청자의 조직 소속 승인이 먼저 필요합니다.');
          }
          const roleCode = dto.roleCode ?? 'user';
          if (!await this.admission.isPlatformAdmin(userId, tx)) {
            const authorities = await this.authorities(userId, tx);
            if (!authorities.some((authority) => authority.authorityKind === 'service' && authority.serviceCode === request.serviceCode &&
              (authority.orgId === null || authority.orgId === orgId) && rank(authority.maxRoleCode) >= rank(roleCode))) {
              throw new ForbiddenException('위임받은 범위를 넘는 서비스 역할은 부여할 수 없습니다.');
            }
          }
          await tx.serviceGrant.upsert({ where: { userId_serviceCode_scopeKey: { userId: request.userId, serviceCode: request.serviceCode!, scopeKey: orgId.toString() } },
            create: { userId: request.userId, orgId, serviceCode: request.serviceCode!, roleCode, scopeKey: orgId.toString(), sourceCode: 'approval', createdBy: userId, ...audit(userId, `onboarding.approve.${id}`) },
            update: { roleCode, isActive: true, expiresAt: null, ...audit(userId, `onboarding.approve.${id}`) },
          });
        } else {
          let orgId = request.orgId;
          if (request.kind === 'organization') {
            if (request.parentOrgId) await this.assertOrganization(request.parentOrgId, tx);
            if (await tx.organization.count({ where: { isActive: true, parentOrgId: request.parentOrgId, orgName: { equals: request.organizationName!, mode: 'insensitive' } } })) {
              throw new ConflictException('같은 상위 조직에 동일한 이름의 조직이 있습니다. 기존 조직 소속 신청을 이용해 주세요.');
            }
            const organization = await tx.organization.create({ data: {
              orgCode: `ONBOARDING-${request.id}`, orgName: request.organizationName!, orgType: 'internal',
              orgClass: 'permanent', scope: 'internal', parentOrgId: request.parentOrgId,
              createdBy: userId, ...audit(userId, `onboarding.approve.${id}`),
            } });
            orgId = organization.orgId; resolvedOrgId = orgId;
          } else await this.assertOrganization(orgId!, tx);
          if (!await tx.userOrganizationRelation.count({ where: { ...activeMembershipWhere(request.userId), orgId: orgId! } })) {
            const existing = await tx.userOrganizationRelation.count({ where: activeMembershipWhere(request.userId) });
            await tx.userOrganizationRelation.create({ data: {
              userId: request.userId, orgId: orgId!, isPrimary: existing === 0, isLeader: false,
              createdBy: userId, ...audit(userId, `onboarding.approve.${id}`),
            } });
          }
          await tx.platformEnrollment.upsert({ where: { userId: request.userId },
            create: { userId: request.userId, statusCode: 'active', sourceCode: 'approval', createdBy: userId, ...audit(userId, `onboarding.approve.${id}`) },
            update: { statusCode: 'active', ...audit(userId, `onboarding.approve.${id}`) },
          });
        }
      }
      const updated = await tx.onboardingRequest.updateMany({ where: { id, statusCode: 'pending' }, data: {
        statusCode: dto.decision === 'approve' ? 'approved' : 'rejected', decidedBy: userId, decidedAt: new Date(),
        decisionMessage: dto.message.trim(), resolvedOrgId, ...audit(userId, `onboarding.${dto.decision}`),
      } });
      if (updated.count !== 1) throw new ConflictException('다른 승인자가 이미 처리한 신청입니다.');
      return item(await tx.onboardingRequest.findUniqueOrThrow({ where: { id }, include: includeRequest }));
    });
  }

  async cancel(id: bigint, userId: bigint) {
    const updated = await this.db.client.onboardingRequest.updateMany({ where: { id, userId, statusCode: 'pending' },
      data: { statusCode: 'cancelled', decidedAt: new Date(), decidedBy: userId, ...audit(userId, 'onboarding.cancel') } });
    if (!updated.count) throw new ConflictException('취소할 수 있는 대기 신청이 없습니다.');
    return { id: id.toString() };
  }

  private async assertOrganization(orgId: bigint, tx: OnboardingTransaction) {
    if (!await tx.organization.count({ where: { orgId, isActive: true, orgClass: 'permanent' } })) throw new BadRequestException('신청 가능한 조직이 아닙니다.');
  }

  private async assertAdmin(userId: bigint, tx: OnboardingTransaction) {
    if (!await this.admission.isPlatformAdmin(userId, tx)) throw new ForbiddenException('플랫폼 관리자 권한이 필요합니다.');
  }

  async listAuthorities(userId: bigint) {
    await this.assertAdmin(userId, this.db.client);
    const records = await this.db.client.approvalAuthority.findMany({ include: { user: true, organization: true }, orderBy: { id: 'desc' } });
    return records.map((entry) => ({ id: entry.id.toString(), userId: entry.userId.toString(), userName: entry.user.userName,
      organizationId: entry.orgId?.toString() ?? null, organizationName: entry.organization?.orgName ?? null,
      authorityKind: entry.authorityKind, serviceCode: entry.serviceCode, maxRoleCode: entry.maxRoleCode, isActive: entry.isActive }));
  }

  async setAuthority(userId: bigint, dto: SetApprovalAuthorityDto) {
    return this.transaction(async (tx) => {
      await this.assertAdmin(userId, tx);
      const targetUserId = inputId(dto.userId);
      if ((await this.admission.state(targetUserId, tx)).status !== 'active') throw new BadRequestException('참여 승인된 사용자에게만 승인 권한을 위임할 수 있습니다.');
      const orgId = dto.organizationId ? inputId(dto.organizationId) : null;
      if (dto.authorityKind === 'organization' ? !orgId || dto.serviceCode : !dto.serviceCode) throw new BadRequestException('승인 유형과 조직·서비스 범위를 확인해 주세요.');
      if (orgId) {
        await this.assertOrganization(orgId, tx);
        if (!await tx.userOrganizationRelation.count({ where: { ...activeMembershipWhere(targetUserId), orgId } })) throw new BadRequestException('해당 조직에 소속된 사용자에게 위임해 주세요.');
      }
      const key = { userId: targetUserId, authorityKind: dto.authorityKind, serviceCode: dto.serviceCode ?? '', scopeKey: orgId?.toString() ?? 'platform' };
      const record = await tx.approvalAuthority.upsert({ where: { userId_authorityKind_serviceCode_scopeKey: key },
        create: { ...key, orgId, maxRoleCode: dto.maxRoleCode, createdBy: userId, ...audit(userId, 'onboarding.delegate') },
        update: { maxRoleCode: dto.maxRoleCode, isActive: true, expiresAt: null, ...audit(userId, 'onboarding.delegate') },
      });
      return { id: record.id.toString() };
    });
  }

  async revokeAuthority(id: bigint, userId: bigint) {
    return this.transaction(async (tx) => {
      await this.assertAdmin(userId, tx);
      if (!(await tx.approvalAuthority.updateMany({ where: { id }, data: { isActive: false, ...audit(userId, 'onboarding.revoke-authority') } })).count) throw new NotFoundException('승인 위임을 찾을 수 없습니다.');
      return { id: id.toString() };
    });
  }

  async revokeGrant(id: bigint, userId: bigint) {
    return this.transaction(async (tx) => {
      const grant = await tx.serviceGrant.findUnique({ where: { id } });
      if (!grant) throw new NotFoundException('이용권을 찾을 수 없습니다.');
      const admin = await this.admission.isPlatformAdmin(userId, tx);
      const authorities = await this.authorities(userId, tx);
      if (!admin && !authorities.some((entry) => entry.authorityKind === 'service' && entry.serviceCode === grant.serviceCode && (entry.orgId === null || entry.orgId === grant.orgId) && rank(grant.roleCode) >= 0 && rank(entry.maxRoleCode) >= rank(grant.roleCode))) throw new ForbiddenException('이용권 회수 권한이 없습니다.');
      await tx.serviceGrant.update({ where: { id }, data: { isActive: false, ...audit(userId, 'onboarding.revoke-service') } });
      return { id: id.toString() };
    });
  }
}
