export interface ParticipationPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ParticipationFilter {
  userId?: string;
  organizationId?: string;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  serviceCode?: string;
  page?: number;
  pageSize?: number;
}

export interface ManagedMembership {
  id: string;
  userId: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  isPrimary: boolean;
  isLeader: boolean;
  positionCode: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  effective: boolean;
  reason: string | null;
  updatedAt: string;
}

export interface ManagedServiceGrant {
  id: string;
  userId: string;
  userName: string;
  organizationId: string | null;
  organizationName: string | null;
  serviceCode: string;
  roleCode: string;
  expiresAt: string | null;
  isActive: boolean;
  sourceCode: string;
  effective: boolean;
  inactiveReason: string | null;
  reason: string | null;
  updatedAt: string;
}

export interface MembershipFields {
  isPrimary: boolean;
  isLeader: boolean;
  positionCode?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  reason: string;
}

export interface CreateMembership extends MembershipFields {
  userId: string;
  organizationId: string;
}

export interface UpdateMembership extends MembershipFields { expectedUpdatedAt: string }
export interface ParticipationRevision { expectedUpdatedAt: string; reason: string }
export interface TransferMembership extends ParticipationRevision { organizationId: string }
export interface ServiceGrantFields { roleCode: string; expiresAt?: string | null; reason: string }
export interface CreateServiceGrant extends ServiceGrantFields { userId: string; organizationId: string; serviceCode: string }
export interface UpdateServiceGrant extends ServiceGrantFields { expectedUpdatedAt: string }
export interface PlatformAccessDiagnosis {
  userId: string;
  generatedAt: string;
  accountStatus: string;
  participationStatus: 'active' | 'pending' | 'suspended';
  isPlatformAdmin: boolean;
  effectiveMembershipCount: number;
  services: Array<{
    serviceCode: 'admin' | 'crm' | 'pms' | 'dms' | 'sns';
    allowed: boolean;
    reason: string;
    roleCodes: string[];
    organizationIds: string[];
    grantIds: string[];
  }>;
}
