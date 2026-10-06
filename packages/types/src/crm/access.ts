import type { PermissionResolutionTrace } from '../common/access';

export interface CrmOpportunityAccessFeatures {
  canViewOpportunity: boolean;
  canCreateOpportunity: boolean;
  canEditOpportunity: boolean;
  canConfirmOpportunity: boolean;
  canAddVersion: boolean;
}

export interface CrmCustomerAccessFeatures {
  canViewCustomer: boolean;
  canCreateCustomer: boolean;
  canEditCustomer: boolean;
  canViewCustomerActivity: boolean;
  canCreateCustomerActivity: boolean;
}

export interface CrmOperationsAccessFeatures {
  canReadOperations: boolean;
  canExecuteOperations: boolean;
  canManageSettings: boolean;
}

/**
 * CRM 도메인별 전역 action 권한입니다.
 *
 * 기존 opportunity capability는 객체 owner/exception 호환 때문에 별도로 유지하고,
 * 계약·사업계획·원가·보고·공급자 설정은 이 snapshot을 정본으로 사용합니다.
 */
export interface CrmDomainAccessFeatures {
  canReadBusinessYear: boolean;
  canManageBusinessYear: boolean;
  canReadContract: boolean;
  canWriteContract: boolean;
  canConfirmContract: boolean;
  canReadBusinessPlan: boolean;
  canWriteBusinessPlan: boolean;
  canConfirmBusinessPlan: boolean;
  canDeleteBusinessPlan: boolean;
  canReadCostPlan: boolean;
  canWriteCostPlan: boolean;
  canConfirmCostPlan: boolean;
  canReadReport: boolean;
  canConfirmReport: boolean;
  canReadQuoteSettings: boolean;
  canManageQuoteSettings: boolean;
}

export interface CrmOpportunityAccessRoles {
  isOpportunityOwnerUserMatch: boolean;
  isOpportunityOwnerNameMatch: boolean;
  ownerUserId: string | null;
  ownerName: string | null;
}

export interface CrmCustomerAccessRoles {
  isCustomerOwnerUserMatch: boolean;
  isCustomerOwnerNameMatch: boolean;
  ownerUserId: string | null;
  ownerName: string | null;
}

export interface CrmOpportunityGlobalAccessSnapshot {
  features: CrmOpportunityAccessFeatures;
  policy: PermissionResolutionTrace;
}

export interface CrmCustomerGlobalAccessSnapshot {
  features: CrmCustomerAccessFeatures;
  policy: PermissionResolutionTrace;
}

export interface CrmOperationsAccessSnapshot {
  features: CrmOperationsAccessFeatures;
  policy: PermissionResolutionTrace;
}

export interface CrmDomainAccessSnapshot {
  features: CrmDomainAccessFeatures;
  policy: PermissionResolutionTrace;
}

export interface CrmOpportunityAccessSnapshot extends CrmOpportunityGlobalAccessSnapshot {
  opportunityId: string;
  groupId: string;
  roles: CrmOpportunityAccessRoles;
}

export interface CrmCustomerAccessSnapshot extends CrmCustomerGlobalAccessSnapshot {
  customerId: string;
  customerCode: string;
  roles: CrmCustomerAccessRoles;
}
