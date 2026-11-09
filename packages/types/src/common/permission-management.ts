export type CommonPermissionTarget = 'organization' | 'user';

export interface ManagedCommonPermission {
  id: string;
  targetId: string;
  targetName: string;
  permissionCode: string;
  permissionName: string;
  effect: 'grant' | 'revoke';
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
  effective: boolean;
  inactiveReason: string | null;
  reason: string | null;
  updatedAt: string;
}

export interface CommonPermissionWrite {
  targetId: string;
  permissionCode: string;
  effect: 'grant' | 'revoke';
  effectiveFrom: string | null;
  effectiveTo: string | null;
  reason: string;
}

export interface CommonPermissionRevision extends CommonPermissionWrite {
  expectedUpdatedAt: string;
}
