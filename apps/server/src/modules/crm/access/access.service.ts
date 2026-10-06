import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CrmCustomerAccessFeatures,
  CrmCustomerAccessSnapshot,
  CrmCustomerGlobalAccessSnapshot,
  CrmDomainAccessFeatures,
  CrmDomainAccessSnapshot,
  CrmOperationsAccessFeatures,
  CrmOperationsAccessSnapshot,
  CrmOpportunityAccessFeatures,
  CrmOpportunityAccessSnapshot,
  CrmOpportunityGlobalAccessSnapshot,
} from '@ssoo/types/crm';
import { DatabaseService } from '../../../database/database.service.js';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';

const CRM_OPPORTUNITY_OBJECT_TYPE = 'crm.opportunity';
const CRM_CUSTOMER_OBJECT_TYPE = 'crm.customer';

const CRM_OPPORTUNITY_PERMISSION_CODES = {
  read: 'crm.opportunity.read',
  write: 'crm.opportunity.write',
  confirm: 'crm.opportunity.confirm',
  manageVersion: 'crm.opportunity.version.manage',
} as const;

const CRM_CUSTOMER_PERMISSION_CODES = {
  read: 'crm.customer.read',
  write: 'crm.customer.write',
  activityRead: 'crm.customer.activity.read',
  activityWrite: 'crm.customer.activity.write',
} as const;

const CRM_OPERATIONS_PERMISSION_CODES = {
  read: 'crm.operations.read',
  execute: 'crm.operations.execute',
  manageSettings: 'crm.settings.manage',
} as const;

const CRM_DOMAIN_PERMISSION_CODES = {
  businessYearRead: 'crm.business-year.read',
  businessYearManage: 'crm.business-year.manage',
  contractRead: 'crm.contract.read',
  contractWrite: 'crm.contract.write',
  contractConfirm: 'crm.contract.confirm',
  businessPlanRead: 'crm.business-plan.read',
  businessPlanWrite: 'crm.business-plan.write',
  businessPlanConfirm: 'crm.business-plan.confirm',
  businessPlanDelete: 'crm.business-plan.delete',
  costPlanRead: 'crm.cost-plan.read',
  costPlanWrite: 'crm.cost-plan.write',
  costPlanConfirm: 'crm.cost-plan.confirm',
  reportRead: 'crm.report.read',
  reportConfirm: 'crm.report.confirm',
  quoteSettingsRead: 'crm.quote-settings.read',
  quoteSettingsManage: 'crm.quote-settings.manage',
} as const;

const CAPABILITY_ERROR_MESSAGES: Record<CrmOpportunityCapabilityKey, string> = {
  canViewOpportunity: 'CRM 영업기회를 조회할 권한이 없습니다.',
  canCreateOpportunity: 'CRM 영업기회를 등록할 권한이 없습니다.',
  canEditOpportunity: 'CRM 영업기회를 수정할 권한이 없습니다.',
  canConfirmOpportunity: 'CRM 영업기회를 확정하거나 확정 해제할 권한이 없습니다.',
  canAddVersion: 'CRM 영업기회 차수를 추가할 권한이 없습니다.',
};

const CUSTOMER_CAPABILITY_ERROR_MESSAGES: Record<CrmCustomerCapabilityKey, string> = {
  canViewCustomer: 'CRM 고객을 조회할 권한이 없습니다.',
  canCreateCustomer: 'CRM 고객을 등록할 권한이 없습니다.',
  canEditCustomer: 'CRM 고객을 수정할 권한이 없습니다.',
  canViewCustomerActivity: 'CRM 고객 활동을 조회할 권한이 없습니다.',
  canCreateCustomerActivity: 'CRM 고객 활동을 등록할 권한이 없습니다.',
};

const OPERATIONS_CAPABILITY_ERROR_MESSAGES: Record<CrmOperationsCapabilityKey, string> = {
  canReadOperations: 'CRM 운영 현황을 조회할 권한이 없습니다.',
  canExecuteOperations: 'CRM 운영 작업을 실행하거나 재시도할 권한이 없습니다.',
  canManageSettings: 'CRM 시스템 설정을 변경할 권한이 없습니다.',
};

const DOMAIN_CAPABILITY_ERROR_MESSAGES: Record<CrmDomainAccessCapabilityKey, string> = {
  canReadBusinessYear: 'CRM 사업연도를 조회할 권한이 없습니다.',
  canManageBusinessYear: 'CRM 사업연도를 관리할 권한이 없습니다.',
  canReadContract: 'CRM 계약을 조회할 권한이 없습니다.',
  canWriteContract: 'CRM 계약을 등록하거나 수정할 권한이 없습니다.',
  canConfirmContract: 'CRM 계약을 확정하거나 확정 해제할 권한이 없습니다.',
  canReadBusinessPlan: 'CRM 사업계획을 조회할 권한이 없습니다.',
  canWriteBusinessPlan: 'CRM 사업계획을 등록하거나 수정할 권한이 없습니다.',
  canConfirmBusinessPlan: 'CRM 사업계획을 확정하거나 확정 해제할 권한이 없습니다.',
  canDeleteBusinessPlan: 'CRM 사업계획 차수를 삭제할 권한이 없습니다.',
  canReadCostPlan: 'CRM 원가계획을 조회할 권한이 없습니다.',
  canWriteCostPlan: 'CRM 원가계획을 등록하거나 수정할 권한이 없습니다.',
  canConfirmCostPlan: 'CRM 원가계획을 확정하거나 확정 해제할 권한이 없습니다.',
  canReadReport: 'CRM 보고를 조회할 권한이 없습니다.',
  canConfirmReport: 'CRM 보고를 확정하거나 확정 해제할 권한이 없습니다.',
  canReadQuoteSettings: 'CRM 공급자 설정을 조회할 권한이 없습니다.',
  canManageQuoteSettings: 'CRM 공급자 설정을 변경할 권한이 없습니다.',
};

const buildOpportunityFeatures = (enabled: boolean): CrmOpportunityAccessFeatures => ({
  canViewOpportunity: enabled,
  canCreateOpportunity: enabled,
  canEditOpportunity: enabled,
  canConfirmOpportunity: enabled,
  canAddVersion: enabled,
});

const buildCustomerFeatures = (enabled: boolean): CrmCustomerAccessFeatures => ({
  canViewCustomer: enabled,
  canCreateCustomer: enabled,
  canEditCustomer: enabled,
  canViewCustomerActivity: enabled,
  canCreateCustomerActivity: enabled,
});

const buildOperationsFeatures = (enabled: boolean): CrmOperationsAccessFeatures => ({
  canReadOperations: enabled,
  canExecuteOperations: enabled,
  canManageSettings: enabled,
});

const buildDomainFeatures = (enabled: boolean): CrmDomainAccessFeatures => ({
  canReadBusinessYear: enabled,
  canManageBusinessYear: enabled,
  canReadContract: enabled,
  canWriteContract: enabled,
  canConfirmContract: enabled,
  canReadBusinessPlan: enabled,
  canWriteBusinessPlan: enabled,
  canConfirmBusinessPlan: enabled,
  canDeleteBusinessPlan: enabled,
  canReadCostPlan: enabled,
  canWriteCostPlan: enabled,
  canConfirmCostPlan: enabled,
  canReadReport: enabled,
  canConfirmReport: enabled,
  canReadQuoteSettings: enabled,
  canManageQuoteSettings: enabled,
});

export type CrmOpportunityCapabilityKey = keyof CrmOpportunityAccessFeatures;
export type CrmCustomerCapabilityKey = keyof CrmCustomerAccessFeatures;
export type CrmOperationsCapabilityKey = keyof CrmOperationsAccessFeatures;
export type CrmDomainAccessCapabilityKey = keyof CrmDomainAccessFeatures;

interface CrmOpportunityAccessRow {
  id: bigint;
  opportunityCode: string;
  opportunityGroupCode: string;
  ownerName: string;
  ownerUserId: bigint | null;
  ownerOrganizationId: bigint | null;
}

interface CrmCustomerAccessRow {
  id: bigint;
  customerCode: string;
  ownerName: string;
  ownerUserId: bigint | null;
  ownerOrganizationId: bigint | null;
}

@Injectable()
export class CrmAccessService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessFoundationService: AccessFoundationService,
    private readonly admission: PlatformAdmissionService = new PlatformAdmissionService(db),
  ) {}

  async businessOrganizationScope(user: TokenPayload): Promise<bigint[] | null> {
    return this.accessFoundationService.getBusinessOrganizationScope(BigInt(user.userId), 'crm');
  }

  /** Aggregate workspaces need one explicit organization; only admitted legacy users retain the old unselected view. */
  async resolveReadOrganization(user: TokenPayload, requestedId?: string): Promise<bigint | null> {
    const scope = await this.businessOrganizationScope(user);
    if (!requestedId) {
      if (scope === null) return null;
      if (scope.length === 1) return scope[0];
      throw new BadRequestException({ code: 'BUSINESS_ORGANIZATION_REQUIRED', message: '조회할 업무 조직을 선택해 주세요.' });
    }
    if (!/^[1-9]\d{0,18}$/.test(requestedId) || BigInt(requestedId) > 9223372036854775807n) {
      throw new BadRequestException('업무 조직 ID가 올바르지 않습니다.');
    }
    const id = BigInt(requestedId);
    if (scope !== null && !scope.includes(id)) throw new ForbiddenException('해당 조직의 CRM 이용 승인이 필요합니다.');
    return id;
  }

  async assertOrganizationCapability(user: TokenPayload, capability: CrmDomainAccessCapabilityKey, organizationId: bigint | null) {
    const scope = await this.businessOrganizationScope(user);
    const access = await this.getDomainAccess(user, organizationId);
    if ((scope !== null && (organizationId === null || !scope.includes(organizationId))) || !access.features[capability]) {
      throw new ForbiddenException(DOMAIN_CAPABILITY_ERROR_MESSAGES[capability]);
    }
  }

  async actorForUser(userId?: bigint): Promise<TokenPayload> {
    if (!userId) throw new ForbiddenException('CRM 작업자 인증이 필요합니다.');
    const user = await this.db.client.user.findUnique({ where: { id: userId }, select: { authAccount: { select: { loginId: true } }, isActive: true } });
    if (!user?.isActive || !user.authAccount) throw new ForbiddenException('CRM 작업자 인증이 필요합니다.');
    return { userId: userId.toString(), loginId: user.authAccount.loginId };
  }

  async resolveWriteOrganization(userId: bigint | undefined, requestedId: string | undefined, capability: CrmDomainAccessCapabilityKey) {
    const user = await this.actorForUser(userId);
    const organizationId = await this.admission.resolveBusinessOrganization(BigInt(user.userId), 'crm', requestedId);
    await this.assertOrganizationCapability(user, capability, organizationId);
    return { user, organizationId };
  }

  async getGlobalOpportunityAccess(user: TokenPayload): Promise<CrmOpportunityGlobalAccessSnapshot> {
    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(user);

    if (actionContext.policy.hasSystemOverride) {
      return {
        features: buildOpportunityFeatures(true),
        policy: actionContext.policy,
      };
    }

    return {
      features: this.buildFeaturesFromPermissionCodes(actionContext.grantedPermissionCodes),
      policy: actionContext.policy,
    };
  }

  async getOpportunityAccess(
    id: string,
    user: TokenPayload,
  ): Promise<CrmOpportunityAccessSnapshot> {
    const row = await this.findOpportunityRow(id);
    if (!row) {
      throw new NotFoundException('CRM opportunity not found');
    }

    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(user, { serviceCode: 'crm', organizationId: row.ownerOrganizationId ?? null });
    const isOpportunityOwnerUserMatch = this.isOwnerUserMatch(row.ownerUserId, user);
    const isOpportunityOwnerNameMatch = this.isOwnerNameMatch(row.ownerName, user);

    if (actionContext.policy.hasSystemOverride) {
      return {
        opportunityId: row.opportunityCode,
        groupId: row.opportunityGroupCode,
        features: buildOpportunityFeatures(true),
        roles: {
          isOpportunityOwnerUserMatch,
          isOpportunityOwnerNameMatch,
          ownerUserId: row.ownerUserId?.toString() ?? null,
          ownerName: row.ownerName,
        },
        policy: actionContext.policy,
      };
    }

    const domainGrantedPermissionCodes = new Set<string>();
    if (isOpportunityOwnerUserMatch || isOpportunityOwnerNameMatch) {
      domainGrantedPermissionCodes.add(CRM_OPPORTUNITY_PERMISSION_CODES.read);
      domainGrantedPermissionCodes.add(CRM_OPPORTUNITY_PERMISSION_CODES.write);
    }

    const objectContext = await this.accessFoundationService.resolveObjectPermissionContext({
      user,
      targetObjectType: CRM_OPPORTUNITY_OBJECT_TYPE,
      targetObjectId: row.opportunityCode,
      targetOrganizationId: row.ownerOrganizationId ?? null,
      actionContext,
      domainGrantedPermissionCodes,
    });

    const scope = await this.businessOrganizationScope(user);
    const withinOrganization = scope === null || (row.ownerOrganizationId != null && scope.includes(row.ownerOrganizationId));
    return {
      opportunityId: row.opportunityCode,
      groupId: row.opportunityGroupCode,
      features: withinOrganization ? this.buildFeaturesFromPermissionCodes(objectContext.grantedPermissionCodes) : buildOpportunityFeatures(false),
      roles: {
        isOpportunityOwnerUserMatch,
        isOpportunityOwnerNameMatch,
        ownerUserId: row.ownerUserId?.toString() ?? null,
        ownerName: row.ownerName,
      },
      policy: objectContext.policy,
    };
  }

  async assertOpportunityCapability(
    user: TokenPayload,
    capability: CrmOpportunityCapabilityKey,
    opportunityId?: string,
  ): Promise<CrmOpportunityGlobalAccessSnapshot | CrmOpportunityAccessSnapshot> {
    const snapshot = opportunityId
      ? await this.getOpportunityAccess(opportunityId, user)
      : await this.getGlobalOpportunityAccess(user);

    if (!snapshot.features[capability]) {
      throw new ForbiddenException(CAPABILITY_ERROR_MESSAGES[capability]);
    }

    return snapshot;
  }

  async getGlobalCustomerAccess(user: TokenPayload): Promise<CrmCustomerGlobalAccessSnapshot> {
    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(user);

    if (actionContext.policy.hasSystemOverride) {
      return {
        features: buildCustomerFeatures(true),
        policy: actionContext.policy,
      };
    }

    return {
      features: this.buildCustomerFeaturesFromPermissionCodes(
        this.mapOpportunityPermissionsToCustomerCompatCodes(actionContext.grantedPermissionCodes),
      ),
      policy: actionContext.policy,
    };
  }

  async getCustomerAccess(
    id: string,
    user: TokenPayload,
  ): Promise<CrmCustomerAccessSnapshot> {
    const row = await this.findCustomerRow(id);
    if (!row) {
      throw new NotFoundException('CRM customer not found');
    }

    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(user, { serviceCode: 'crm', organizationId: row.ownerOrganizationId ?? null });
    const isCustomerOwnerUserMatch = this.isOwnerUserMatch(row.ownerUserId, user);
    const isCustomerOwnerNameMatch = this.isOwnerNameMatch(row.ownerName, user);

    if (actionContext.policy.hasSystemOverride) {
      return {
        customerId: row.id.toString(),
        customerCode: row.customerCode,
        features: buildCustomerFeatures(true),
        roles: {
          isCustomerOwnerUserMatch,
          isCustomerOwnerNameMatch,
          ownerUserId: row.ownerUserId?.toString() ?? null,
          ownerName: row.ownerName,
        },
        policy: actionContext.policy,
      };
    }

    const domainGrantedPermissionCodes = this.mapOpportunityPermissionsToCustomerCompatCodes(
      actionContext.grantedPermissionCodes,
    );
    if (isCustomerOwnerUserMatch || isCustomerOwnerNameMatch) {
      domainGrantedPermissionCodes.add(CRM_CUSTOMER_PERMISSION_CODES.read);
      domainGrantedPermissionCodes.add(CRM_CUSTOMER_PERMISSION_CODES.write);
      domainGrantedPermissionCodes.add(CRM_CUSTOMER_PERMISSION_CODES.activityRead);
      domainGrantedPermissionCodes.add(CRM_CUSTOMER_PERMISSION_CODES.activityWrite);
    }

    const objectContext = await this.accessFoundationService.resolveObjectPermissionContext({
      user,
      targetObjectType: CRM_CUSTOMER_OBJECT_TYPE,
      targetObjectId: row.customerCode,
      targetOrganizationId: row.ownerOrganizationId ?? null,
      actionContext,
      domainGrantedPermissionCodes,
    });

    const scope = await this.businessOrganizationScope(user);
    const withinOrganization = scope === null || (row.ownerOrganizationId != null && scope.includes(row.ownerOrganizationId));
    return {
      customerId: row.id.toString(),
      customerCode: row.customerCode,
      features: withinOrganization ? this.buildCustomerFeaturesFromPermissionCodes(objectContext.grantedPermissionCodes) : buildCustomerFeatures(false),
      roles: {
        isCustomerOwnerUserMatch,
        isCustomerOwnerNameMatch,
        ownerUserId: row.ownerUserId?.toString() ?? null,
        ownerName: row.ownerName,
      },
      policy: objectContext.policy,
    };
  }

  async assertCustomerCapability(
    user: TokenPayload,
    capability: CrmCustomerCapabilityKey,
    customerId?: string,
  ): Promise<CrmCustomerGlobalAccessSnapshot | CrmCustomerAccessSnapshot> {
    const snapshot = customerId
      ? await this.getCustomerAccess(customerId, user)
      : await this.getGlobalCustomerAccess(user);

    if (!snapshot.features[capability]) {
      throw new ForbiddenException(CUSTOMER_CAPABILITY_ERROR_MESSAGES[capability]);
    }

    return snapshot;
  }

  async getOperationsAccess(user: TokenPayload): Promise<CrmOperationsAccessSnapshot> {
    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(user);
    if (actionContext.policy.hasSystemOverride) {
      return {
        features: buildOperationsFeatures(true),
        policy: actionContext.policy,
      };
    }

    const permissions = actionContext.grantedPermissionCodes;
    const canManageSettings = permissions.has(CRM_OPERATIONS_PERMISSION_CODES.manageSettings);
    const canExecuteOperations = permissions.has(CRM_OPERATIONS_PERMISSION_CODES.execute) || canManageSettings;
    const canReadOperations = permissions.has(CRM_OPERATIONS_PERMISSION_CODES.read)
      || canExecuteOperations;
    return {
      features: {
        canReadOperations,
        canExecuteOperations,
        canManageSettings,
      },
      policy: actionContext.policy,
    };
  }

  async getDomainAccess(user: TokenPayload, organizationId?: bigint | null): Promise<CrmDomainAccessSnapshot> {
    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(user, organizationId === undefined ? undefined : { serviceCode: 'crm', organizationId });
    if (actionContext.policy.hasSystemOverride) {
      return {
        features: buildDomainFeatures(true),
        policy: actionContext.policy,
      };
    }

    return {
      features: this.buildDomainFeaturesFromPermissionCodes(actionContext.grantedPermissionCodes),
      policy: actionContext.policy,
    };
  }

  async assertContractCapability(user: TokenPayload, capability: CrmDomainAccessCapabilityKey, id: string) {
    const numericId = /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n ? BigInt(id) : null;
    const row = await this.db.client.crmContract.findFirst({ where: { isActive: true, OR: [
      { contractCode: id }, ...(numericId ? [{ id: numericId }] : []),
    ] }, select: { ownerOrganizationId: true } });
    if (!row) throw new NotFoundException('CRM contract not found');
    const scope = await this.businessOrganizationScope(user);
    const context = await this.accessFoundationService.resolveActionPermissionContext(user, { serviceCode: 'crm', organizationId: row.ownerOrganizationId });
    if ((scope !== null && (row.ownerOrganizationId === null || !scope.includes(row.ownerOrganizationId)))
      || (!context.policy.hasSystemOverride && !this.buildDomainFeaturesFromPermissionCodes(context.grantedPermissionCodes)[capability])) {
      throw new ForbiddenException(DOMAIN_CAPABILITY_ERROR_MESSAGES[capability]);
    }
  }

  async assertDomainCapability(
    user: TokenPayload,
    capability: CrmDomainAccessCapabilityKey,
  ): Promise<CrmDomainAccessSnapshot> {
    const snapshot = await this.getDomainAccess(user);
    if (!snapshot.features[capability]) {
      throw new ForbiddenException(DOMAIN_CAPABILITY_ERROR_MESSAGES[capability]);
    }
    return snapshot;
  }

  async assertOperationsCapability(
    user: TokenPayload,
    capability: CrmOperationsCapabilityKey,
  ): Promise<CrmOperationsAccessSnapshot> {
    const snapshot = await this.getOperationsAccess(user);
    if (!snapshot.features[capability]) {
      throw new ForbiddenException(OPERATIONS_CAPABILITY_ERROR_MESSAGES[capability]);
    }
    return snapshot;
  }

  private buildFeaturesFromPermissionCodes(permissionCodes: Set<string>): CrmOpportunityAccessFeatures {
    const canWrite = permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.write);
    const canConfirm = permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.confirm);
    const canAddVersion = permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.manageVersion);
    const canView =
      permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.read)
      || canWrite
      || canConfirm
      || canAddVersion;

    return {
      canViewOpportunity: canView,
      canCreateOpportunity: canWrite,
      canEditOpportunity: canWrite,
      canConfirmOpportunity: canConfirm,
      canAddVersion,
    };
  }

  private buildCustomerFeaturesFromPermissionCodes(permissionCodes: Set<string>): CrmCustomerAccessFeatures {
    const canWrite = permissionCodes.has(CRM_CUSTOMER_PERMISSION_CODES.write);
    const canActivityWrite = permissionCodes.has(CRM_CUSTOMER_PERMISSION_CODES.activityWrite) || canWrite;
    const canActivityRead =
      permissionCodes.has(CRM_CUSTOMER_PERMISSION_CODES.activityRead)
      || canActivityWrite;
    const canView =
      permissionCodes.has(CRM_CUSTOMER_PERMISSION_CODES.read)
      || canWrite
      || canActivityRead;

    return {
      canViewCustomer: canView,
      canCreateCustomer: canWrite,
      canEditCustomer: canWrite,
      canViewCustomerActivity: canActivityRead || canView,
      canCreateCustomerActivity: canActivityWrite,
    };
  }

  private buildDomainFeaturesFromPermissionCodes(permissionCodes: Set<string>): CrmDomainAccessFeatures {
    const canWriteContract = permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.contractWrite);
    const canConfirmContract = permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.contractConfirm);
    const canWriteBusinessPlan = permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.businessPlanWrite);
    const canConfirmBusinessPlan = permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.businessPlanConfirm);
    const canWriteCostPlan = permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.costPlanWrite);
    const canConfirmCostPlan = permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.costPlanConfirm);
    const canConfirmReport = permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.reportConfirm);
    const canManageQuoteSettings = permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.quoteSettingsManage);

    return {
      canReadContract: permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.contractRead)
        || canWriteContract
        || canConfirmContract,
      canWriteContract,
      canConfirmContract,
      canReadBusinessPlan: permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.businessPlanRead)
        || canWriteBusinessPlan
        || canConfirmBusinessPlan,
      canWriteBusinessPlan,
      canConfirmBusinessPlan,
      canDeleteBusinessPlan: permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.businessPlanDelete),
      canReadCostPlan: permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.costPlanRead)
        || canWriteCostPlan
        || canConfirmCostPlan,
      canWriteCostPlan,
      canConfirmCostPlan,
      canReadReport: permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.reportRead) || canConfirmReport,
      canConfirmReport,
      canReadQuoteSettings: permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.quoteSettingsRead)
        || canManageQuoteSettings,
      canManageQuoteSettings,
      canReadBusinessYear: permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.businessYearRead)
        || permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.businessYearManage),
      canManageBusinessYear: permissionCodes.has(CRM_DOMAIN_PERMISSION_CODES.businessYearManage),
    };
  }

  private mapOpportunityPermissionsToCustomerCompatCodes(permissionCodes: Set<string>): Set<string> {
    const mappedCodes = new Set(permissionCodes);
    const hasOpportunityWrite = permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.write);
    const hasOpportunityRead =
      permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.read)
      || hasOpportunityWrite
      || permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.confirm)
      || permissionCodes.has(CRM_OPPORTUNITY_PERMISSION_CODES.manageVersion);

    if (hasOpportunityRead) {
      mappedCodes.add(CRM_CUSTOMER_PERMISSION_CODES.read);
      mappedCodes.add(CRM_CUSTOMER_PERMISSION_CODES.activityRead);
    }

    if (hasOpportunityWrite) {
      mappedCodes.add(CRM_CUSTOMER_PERMISSION_CODES.write);
      mappedCodes.add(CRM_CUSTOMER_PERMISSION_CODES.activityWrite);
    }

    return mappedCodes;
  }

  private async findOpportunityRow(id: string): Promise<CrmOpportunityAccessRow | null> {
    const normalizedId = id.trim();
    const numericId = /^\d+$/.test(normalizedId) ? BigInt(normalizedId) : null;

    return this.db.client.crmOpportunity.findFirst({
      where: {
        isActive: true,
        OR: [
          { opportunityCode: normalizedId },
          ...(numericId ? [{ id: numericId }] : []),
        ],
      },
      select: {
        id: true,
        opportunityCode: true,
        opportunityGroupCode: true,
        ownerName: true,
        ownerUserId: true,
        ownerOrganizationId: true,
      },
    }) as Promise<CrmOpportunityAccessRow | null>;
  }

  private async findCustomerRow(id: string): Promise<CrmCustomerAccessRow | null> {
    const normalizedId = id.trim();
    const numericId = /^\d+$/.test(normalizedId) ? BigInt(normalizedId) : null;

    return this.db.client.crmCustomer.findFirst({
      where: {
        isActive: true,
        OR: [
          { customerCode: normalizedId },
          ...(numericId ? [{ id: numericId }] : []),
        ],
      },
      select: {
        id: true,
        customerCode: true,
        ownerName: true,
        ownerUserId: true,
        ownerOrganizationId: true,
      },
    }) as Promise<CrmCustomerAccessRow | null>;
  }

  private isOwnerUserMatch(ownerUserId: bigint | null | undefined, user: TokenPayload): boolean {
    return ownerUserId !== null && ownerUserId !== undefined && ownerUserId.toString() === user.userId;
  }

  private isOwnerNameMatch(ownerName: string | null | undefined, user: TokenPayload): boolean {
    const normalizedOwnerName = this.normalizeIdentity(ownerName);
    if (!normalizedOwnerName) {
      return false;
    }

    return [
      user.loginId,
      user.userName,
    ].some((candidate) => this.normalizeIdentity(candidate) === normalizedOwnerName);
  }

  private normalizeIdentity(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? '';
  }
}
