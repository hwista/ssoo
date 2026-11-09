import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { activeMembershipWhere, PlatformAdmissionService, type OnboardingTransaction } from './platform-admission.service.js';

export interface MembershipWrite {
  userId: bigint;
  orgId: bigint;
  isPrimary?: boolean;
  isLeader?: boolean;
  positionCode?: string | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  reason: string;
}

export const participationAudit = (actor: bigint, activity: string, reason: string) => ({
  updatedBy: actor, lastSource: 'common-participation', lastActivity: activity, memo: reason.trim(),
});

export function participationId(value: string): bigint {
  if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
    throw new BadRequestException('ID 형식이 올바르지 않습니다.');
  }
  return BigInt(value);
}

export function assertParticipationReason(reason: string) {
  if (!reason.trim() || reason.length > 2000) throw new BadRequestException('변경 사유를 1~2000자로 입력해 주세요.');
}

export function assertMembershipPeriod(from: Date | null, to: Date | null) {
  if ((from && !Number.isFinite(from.getTime())) || (to && !Number.isFinite(to.getTime())) || (from && to && from >= to)) {
    throw new BadRequestException('소속 시작일은 종료일보다 빨라야 합니다.');
  }
}

/** Shared invariants for operator assignment and request approval; callers own the transaction. */
@Injectable()
export class ParticipationWriteService {
  constructor(private readonly admission: PlatformAdmissionService) {}

  async assertSubject(tx: OnboardingTransaction, userId: bigint) {
    const state = await this.admission.state(userId, tx);
    if (!state.user || state.status === 'suspended') throw new BadRequestException('활성 사용자에게만 소속·이용권을 부여할 수 있습니다.');
    if (!await tx.userAuth.count({ where: { userId, accountStatusCode: 'active' } })) {
      throw new BadRequestException('로그인 가능한 활성 계정이 필요합니다.');
    }
    return state;
  }

  async assertOrganization(tx: OnboardingTransaction, orgId: bigint) {
    if (!await tx.organization.count({ where: { orgId, isActive: true, orgClass: 'permanent' } })) {
      throw new BadRequestException('활성 조직을 선택해 주세요.');
    }
  }

  async assertNoOverlap(tx: OnboardingTransaction, value: MembershipWrite, excluding?: bigint) {
    assertMembershipPeriod(value.effectiveFrom ?? null, value.effectiveTo ?? null);
    const duplicates = await tx.userOrganizationRelation.count({ where: {
      userId: value.userId, orgId: value.orgId, isActive: true,
      ...(excluding ? { userOrgRelationId: { not: excluding } } : {}),
      AND: [
        ...(value.effectiveTo ? [{ OR: [{ effectiveFrom: null }, { effectiveFrom: { lt: value.effectiveTo } }] }] : []),
        ...(value.effectiveFrom ? [{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: value.effectiveFrom } }] }] : []),
      ],
    } });
    if (duplicates) throw new ConflictException('같은 조직에 기간이 겹치는 소속이 있습니다. 기존 소속을 변경해 주세요.');
  }

  async createMembership(tx: OnboardingTransaction, value: MembershipWrite, actor: bigint, activity: string) {
    assertParticipationReason(value.reason);
    await this.assertSubject(tx, value.userId);
    await this.assertOrganization(tx, value.orgId);
    const now = new Date();
    const effectiveFrom = value.effectiveFrom ?? now;
    const effectiveTo = value.effectiveTo ?? null;
    await this.assertNoOverlap(tx, { ...value, effectiveFrom, effectiveTo });
    const current = effectiveFrom <= now && (!effectiveTo || effectiveTo > now);
    if (value.isPrimary && !current) throw new BadRequestException('주 소속은 현재 유효한 소속에서 지정해 주세요.');
    const isPrimary = current && (value.isPrimary === true || !await tx.userOrganizationRelation.count({
      where: { ...activeMembershipWhere(value.userId, now), isPrimary: true },
    }));
    const metadata = participationAudit(actor, activity, value.reason);
    if (isPrimary) await tx.userOrganizationRelation.updateMany({ where: { userId: value.userId, isPrimary: true, isActive: true }, data: { isPrimary: false, ...metadata } });
    const relation = await tx.userOrganizationRelation.create({ data: {
      userId: value.userId, orgId: value.orgId, isPrimary, isLeader: value.isLeader ?? false,
      positionCode: value.positionCode ?? null, effectiveFrom, effectiveTo,
      createdBy: actor, ...metadata,
    } });
    // An approved future assignment is recorded now; app access still requires an effective membership.
    await tx.platformEnrollment.upsert({ where: { userId: value.userId },
      create: { userId: value.userId, statusCode: 'active', sourceCode: 'approval', createdBy: actor, ...metadata },
      update: { statusCode: 'active', ...metadata },
    });
    return relation;
  }

  async setGrant(tx: OnboardingTransaction, value: {
    userId: bigint; orgId: bigint; serviceCode: string; roleCode: string; expiresAt: Date | null; reason: string;
  }, actor: bigint, activity: string) {
    assertParticipationReason(value.reason);
    if (!['crm', 'pms', 'dms', 'sns'].includes(value.serviceCode) || !['viewer', 'user', 'manager'].includes(value.roleCode)) {
      throw new BadRequestException('서비스와 부여할 역할을 확인해 주세요.');
    }
    const state = await this.assertSubject(tx, value.userId);
    await this.assertOrganization(tx, value.orgId);
    if (state.status !== 'active' || !await tx.userOrganizationRelation.count({ where: { ...activeMembershipWhere(value.userId), orgId: value.orgId } })) {
      throw new ConflictException('이용권을 부여하려면 해당 조직의 유효 소속이 필요합니다.');
    }
    if (value.expiresAt && (!Number.isFinite(value.expiresAt.getTime()) || value.expiresAt <= new Date())) {
      throw new BadRequestException('이용 종료일은 현재 시각보다 이후여야 합니다.');
    }
    const metadata = participationAudit(actor, activity, value.reason);
    // sourceCode describes the existing approved organization-scope DB contract.
    // lastActivity distinguishes an operator decision from a numbered request approval.
    return tx.serviceGrant.upsert({ where: { userId_serviceCode_scopeKey: {
      userId: value.userId, serviceCode: value.serviceCode, scopeKey: value.orgId.toString(),
    } }, create: {
      userId: value.userId, orgId: value.orgId, serviceCode: value.serviceCode, roleCode: value.roleCode,
      scopeKey: value.orgId.toString(), sourceCode: 'approval', expiresAt: value.expiresAt,
      createdBy: actor, ...metadata,
    }, update: { roleCode: value.roleCode, expiresAt: value.expiresAt, isActive: true, ...metadata } });
  }
}
