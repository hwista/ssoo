import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma, ExtendedPrismaClient } from '@ssoo/database';
export type OnboardingTransaction = Parameters<Parameters<ExtendedPrismaClient['$transaction']>[0]>[0];
import type { OnboardingServiceCode } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';

export function serviceForController(path: string): OnboardingServiceCode | null {
  const root = path.replace(/^\//, '').split('/')[0];
  if (['crm', 'dms', 'sns'].includes(root)) return root as OnboardingServiceCode;
  return ['projects', 'pms', 'master', 'customers', 'home', 'menus', 'roles'].includes(root) ? 'pms' : null;
}

export const ONBOARDING_SERVICES: OnboardingServiceCode[] = ['crm', 'pms', 'dms', 'sns'];
export const activeMembershipWhere = (userId: bigint, now = new Date()): Prisma.UserOrganizationRelationWhereInput => ({
  userId, isActive: true, organization: { isActive: true, orgClass: 'permanent' },
  AND: [{ OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
    { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }],
});

@Injectable()
export class PlatformAdmissionService {
  constructor(private readonly db: DatabaseService) {}

  async state(userId: bigint, tx: OnboardingTransaction = this.db.client) {
    const user = await tx.user.findUnique({
      where: { id: userId }, include: { platformEnrollment: true },
    });
    const enrollment = user?.platformEnrollment;
    const status = !user?.isActive || enrollment?.statusCode === 'suspended' || enrollment?.isActive === false
      ? 'suspended' : enrollment?.statusCode === 'active' ? 'active' : 'pending';
    return { status, user, enrollment } as const;
  }

  async isPlatformAdmin(userId: bigint, tx: OnboardingTransaction = this.db.client): Promise<boolean> {
    const state = await this.state(userId, tx);
    if (state.status !== 'active' || !state.user) return false;
    const now = new Date();
    const exceptions = await tx.userPermissionException.findMany({ where: {
      userId, isActive: true, exceptionAxis: 'action', targetOrgId: null,
      targetObjectType: null, targetObjectId: null,
      permission: { permissionCode: 'system.override' },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    } });
    if (exceptions.some((entry) => entry.effectType === 'revoke')) return false;
    if (exceptions.some((entry) => entry.effectType === 'grant')) return true;
    return (await tx.rolePermission.count({ where: {
      isActive: true, role: { roleCode: state.user.roleCode, isActive: true },
      permission: { permissionCode: 'system.override' },
    } })) > 0;
  }

  async grants(userId: bigint, tx: OnboardingTransaction = this.db.client) {
    if ((await this.state(userId, tx)).status !== 'active') return [];
    const now = new Date();
    const memberships = await tx.userOrganizationRelation.findMany({ where: activeMembershipWhere(userId, now), select: { orgId: true } });
    return tx.serviceGrant.findMany({ where: {
      userId, isActive: true,
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [
          { orgId: null, scopeKey: 'platform', sourceCode: { in: ['migration', 'bootstrap'] } },
          { orgId: { in: memberships.map((entry) => entry.orgId) }, sourceCode: 'approval' },
        ] },
      ],
    } });
  }

  async assertService(userId: bigint, service: OnboardingServiceCode) {
    await this.assertActive(userId);
    if (await this.isPlatformAdmin(userId)) return;
    if (!(await this.grants(userId)).some((grant) => grant.serviceCode === service)) {
      throw new ForbiddenException({ code: 'SERVICE_APPROVAL_REQUIRED', message: '서비스 이용 승인이 필요합니다. 온보딩에서 이용을 신청해 주세요.' });
    }
  }

  async businessOrganizations(userId: bigint, service: OnboardingServiceCode, tx: OnboardingTransaction = this.db.client) {
    const state = await this.state(userId, tx);
    if (state.status !== 'active') return [];
    if (await this.isPlatformAdmin(userId, tx)) {
      return tx.organization.findMany({ where: { isActive: true, orgClass: 'permanent' }, orderBy: { orgName: 'asc' } });
    }
    const grants = (await this.grants(userId, tx)).filter((grant) => grant.serviceCode === service);
    const hasCompatibilityGrant = grants.some((grant) => grant.sourceCode === 'migration' || grant.sourceCode === 'bootstrap');
    const memberships = await tx.userOrganizationRelation.findMany({ where: activeMembershipWhere(userId), select: { orgId: true } });
    const orgIds = memberships.map((membership) => membership.orgId).filter((id) => hasCompatibilityGrant || grants.some((grant) => grant.orgId === id));
    return tx.organization.findMany({ where: { orgId: { in: orgIds }, isActive: true, orgClass: 'permanent' }, orderBy: { orgName: 'asc' } });
  }

  async resolveBusinessOrganization(userId: bigint, service: OnboardingServiceCode, requestedId?: string | null, tx: OnboardingTransaction = this.db.client): Promise<bigint> {
    const organizations = await this.businessOrganizations(userId, service, tx);
    if (requestedId === undefined && organizations.length === 1) requestedId = organizations[0].orgId.toString();
    if (!requestedId || !/^[1-9]\d{0,18}$/.test(requestedId) || BigInt(requestedId) > 9223372036854775807n) {
      throw new BadRequestException({ code: 'BUSINESS_ORGANIZATION_REQUIRED', message: '자료를 소유할 업무 조직을 선택해 주세요.' });
    }
    const organization = organizations.find((entry) => entry.orgId.toString() === requestedId);
    if (!organization) throw new ForbiddenException({ code: 'BUSINESS_ORGANIZATION_FORBIDDEN', message: '해당 조직에서 서비스를 이용하도록 승인받지 않았습니다.' });
    if (!await this.isPlatformAdmin(userId, tx)) {
      const grants = (await this.grants(userId, tx)).filter((grant) => grant.serviceCode === service && (grant.orgId === organization.orgId || grant.sourceCode === 'migration' || grant.sourceCode === 'bootstrap'));
      if (!grants.some((grant) => grant.sourceCode !== 'approval' || grant.roleCode === 'user' || grant.roleCode === 'manager')) {
        throw new ForbiddenException({ code: 'BUSINESS_ORGANIZATION_READ_ONLY', message: '조회자 권한으로 업무 자료를 등록하거나 다른 조직으로 이전할 수 없습니다.' });
      }
    }
    return organization.orgId;
  }

  async assertActive(userId: bigint) {
    if ((await this.state(userId)).status !== 'active') {
      throw new ForbiddenException({ code: 'ONBOARDING_REQUIRED', message: '조직 소속 승인 후 서비스를 이용할 수 있습니다.' });
    }
  }
}
