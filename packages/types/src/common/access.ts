export type PermissionExceptionAxis = 'action' | 'object';

export type PermissionEffectType = 'grant' | 'revoke';

export interface PermissionResolutionTrace {
  hasSystemOverride: boolean;
  grantedPermissionCodes: string[];
  rolePermissionCodes: string[];
  organizationPermissionCodes: string[];
  userGrantedPermissionCodes: string[];
  userRevokedPermissionCodes: string[];
  domainGrantedPermissionCodes: string[];
  objectGrantedPermissionCodes: string[];
  objectRevokedPermissionCodes: string[];
}

export interface AccessInspectionSubject {
  userId: string;
  loginId: string;
  userName: string;
  displayName: string | null;
  roleCode: string;
  isActive: boolean;
}

export interface AccessInspectionSnapshot {
  grantedPermissionCodes: string[];
  policy: PermissionResolutionTrace;
}

export interface AccessInspectionObjectSnapshot extends AccessInspectionSnapshot {
  targetObjectType: string;
  targetObjectId: string;
  domainPermissionCodes: string[];
}

export interface PermissionExceptionRecord {
  id: string;
  userId: string;
  loginId: string | null;
  userName: string;
  displayName: string | null;
  roleCode: string;
  permissionCode: string;
  permissionName: string;
  exceptionAxis: PermissionExceptionAxis;
  effectType: PermissionEffectType;
  targetOrgId: string | null;
  targetOrgName: string | null;
  targetObjectType: string | null;
  targetObjectId: string | null;
  appliedByUserId: string | null;
  appliedAt: string | null;
  expiresAt: string | null;
  reason: string | null;
  memo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccessInspectionResult {
  subject: AccessInspectionSubject;
  organizationIds: string[];
  input: {
    targetObjectType: string | null;
    targetObjectId: string | null;
    domainPermissionCodes: string[];
    includeInactive: boolean;
  };
  action: AccessInspectionSnapshot;
  object: AccessInspectionObjectSnapshot | null;
  permissionExceptions: {
    action: PermissionExceptionRecord[];
    object: PermissionExceptionRecord[];
  };
}

export interface PermissionExceptionListResult {
  filters: {
    userId: string | null;
    loginId: string | null;
    exceptionAxis: PermissionExceptionAxis | null;
    targetObjectType: string | null;
    targetObjectId: string | null;
    permissionCode: string | null;
    includeInactive: boolean;
    limit: number;
  };
  total: number;
  items: PermissionExceptionRecord[];
}
