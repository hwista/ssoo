export type OnboardingServiceCode = 'crm' | 'pms' | 'dms' | 'sns';
export type OnboardingRoleCode = 'viewer' | 'user' | 'manager';
export type OnboardingRequestKind = 'membership' | 'organization' | 'service';
export type OnboardingRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PlatformEnrollmentStatus = 'pending' | 'active' | 'suspended';

export interface OnboardingOrganization {
  id: string;
  name: string;
  parentId: string | null;
  member: boolean;
}

export interface OnboardingRequest {
  id: string;
  userId: string;
  userName: string;
  kind: OnboardingRequestKind;
  status: OnboardingRequestStatus;
  organizationId: string | null;
  organizationName: string | null;
  parentOrganizationId: string | null;
  serviceCode: OnboardingServiceCode | null;
  message: string;
  decisionMessage: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface OnboardingServiceGrant {
  id: string;
  serviceCode: OnboardingServiceCode;
  organizationId: string | null;
  roleCode: OnboardingRoleCode;
  isActive: boolean;
  expiresAt: string | null;
  sourceCode: string;
}

export interface OnboardingSnapshot {
  status: PlatformEnrollmentStatus;
  isPlatformAdmin: boolean;
  canReview: boolean;
  organizations: OnboardingOrganization[];
  grants: OnboardingServiceGrant[];
  requests: OnboardingRequest[];
  availableServices: OnboardingServiceCode[];
}

export interface CreateOnboardingRequest {
  kind: OnboardingRequestKind;
  organizationId?: string;
  organizationName?: string;
  parentOrganizationId?: string;
  serviceCode?: OnboardingServiceCode;
  message: string;
}

export interface DecideOnboardingRequest {
  decision: 'approve' | 'reject';
  message: string;
  roleCode?: OnboardingRoleCode;
}
