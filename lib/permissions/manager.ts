// 권한 관리자 - 통합 권한 관리 API
import {
  Role,
  Action,
  ResourceType,
  Permission,
  ResourcePermission,
  ResourcePermissionEntry,
  PermissionCheckRequest,
  PermissionCheckResult,
  PermissionSummary,
  PermissionChangeEvent,
  PermissionAuditLog,
  Group,
  UserRole,
  ADMIN_ROLE,
  GUEST_ROLE
} from './types';
import { getAllRoles, getRole, getEffectivePermissions, isHigherRole } from './roles';
import {
  checkPermission,
  checkPermissions,
  getAllowedActions,
  getUserRole,
  setUserRole,
  removeUserRole,
  getResourcePermission,
  setResourcePermission,
  removeResourcePermission,
  createGroup,
  getGroup,
  getAllGroups,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  addGroupRole,
  removeGroupRole,
  getUserGroups
} from './policies';

// 감사 로그 저장소
const auditLogs: PermissionAuditLog[] = [];

// 감사 로그 ID 생성
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 감사 로그 기록
function logAuditEvent(
  event: PermissionChangeEvent,
  previousState?: unknown,
  newState?: unknown
): void {
  auditLogs.push({
    id: generateAuditId(),
    event,
    previousState,
    newState
  });

  // 최대 1000개 유지
  if (auditLogs.length > 1000) {
    auditLogs.shift();
  }
}

// =====================
// 역할 관리
// =====================

// 사용자 역할 할당
export function assignRole(
  userId: string,
  role: Role,
  assignedBy: string,
  expiresAt?: number
): { success: boolean; error?: string } {
  // 할당자 권한 확인
  const assignerRole = getUserRole(assignedBy);
  if (!isHigherRole(assignerRole, role) && assignerRole !== ADMIN_ROLE) {
    return { success: false, error: '자신보다 높은 역할은 할당할 수 없어요' };
  }

  const previousRole = getUserRole(userId);
  setUserRole(userId, role, assignedBy, expiresAt);

  // 감사 로그
  logAuditEvent({
    type: 'role_assigned',
    targetUserId: userId,
    targetRole: role,
    changedBy: assignedBy,
    timestamp: Date.now(),
    details: { expiresAt }
  }, previousRole, role);

  return { success: true };
}

// 사용자 역할 제거
export function revokeRole(
  userId: string,
  revokedBy: string
): { success: boolean; error?: string } {
  const previousRole = getUserRole(userId);
  if (previousRole === GUEST_ROLE) {
    return { success: false, error: '이미 기본 역할이에요' };
  }

  // 권한 확인
  const revokerRole = getUserRole(revokedBy);
  if (!isHigherRole(revokerRole, previousRole) && revokerRole !== ADMIN_ROLE) {
    return { success: false, error: '자신보다 높은 역할은 제거할 수 없어요' };
  }

  removeUserRole(userId);

  // 감사 로그
  logAuditEvent({
    type: 'role_removed',
    targetUserId: userId,
    targetRole: previousRole,
    changedBy: revokedBy,
    timestamp: Date.now()
  }, previousRole, GUEST_ROLE);

  return { success: true };
}

// 사용자 역할 조회 (상세)
export function getUserRoleInfo(userId: string): {
  role: Role;
  roleInfo: ReturnType<typeof getRole>;
  permissions: Permission[];
  groups: Group[];
} {
  const role = getUserRole(userId);
  const roleInfo = getRole(role);
  const permissions = getEffectivePermissions(role);
  const groups = getUserGroups(userId);

  return { role, roleInfo, permissions, groups };
}

// =====================
// 리소스 권한 관리
// =====================

// 리소스에 권한 부여
export function grantResourcePermission(
  resourceType: ResourceType,
  resourceId: string,
  principalType: 'user' | 'role' | 'group',
  principalId: string,
  actions: Action[],
  grantedBy: string,
  options?: {
    scope?: 'own' | 'team' | 'all';
    expiresAt?: number;
    inheritFromParent?: boolean;
  }
): { success: boolean; error?: string } {
  // 권한 검사
  const canManage = checkPermission({
    userId: grantedBy,
    action: 'manage',
    resourceType,
    resourceId
  });

  if (!canManage.allowed) {
    return { success: false, error: '이 리소스를 관리할 권한이 없어요' };
  }

  let permission = getResourcePermission(resourceType, resourceId);

  if (!permission) {
    permission = {
      resourceType,
      resourceId,
      permissions: [],
      inheritFromParent: options?.inheritFromParent ?? true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // 기존 항목 찾기
  const existingIndex = permission.permissions.findIndex(
    p => p.principalType === principalType && p.principalId === principalId
  );

  const entry: ResourcePermissionEntry = {
    principalType,
    principalId,
    actions,
    scope: options?.scope,
    grantedBy,
    grantedAt: Date.now(),
    expiresAt: options?.expiresAt
  };

  if (existingIndex >= 0) {
    permission.permissions[existingIndex] = entry;
  } else {
    permission.permissions.push(entry);
  }

  permission.updatedAt = Date.now();
  setResourcePermission(permission);

  // 감사 로그
  logAuditEvent({
    type: 'permission_granted',
    resourceType,
    resourceId,
    changedBy: grantedBy,
    timestamp: Date.now(),
    details: { principalType, principalId, actions }
  });

  return { success: true };
}

// 리소스 권한 회수
export function revokeResourcePermission(
  resourceType: ResourceType,
  resourceId: string,
  principalType: 'user' | 'role' | 'group',
  principalId: string,
  revokedBy: string
): { success: boolean; error?: string } {
  // 권한 검사
  const canManage = checkPermission({
    userId: revokedBy,
    action: 'manage',
    resourceType,
    resourceId
  });

  if (!canManage.allowed) {
    return { success: false, error: '이 리소스를 관리할 권한이 없어요' };
  }

  const permission = getResourcePermission(resourceType, resourceId);
  if (!permission) {
    return { success: false, error: '리소스 권한을 찾을 수 없어요' };
  }

  const previousLength = permission.permissions.length;
  permission.permissions = permission.permissions.filter(
    p => !(p.principalType === principalType && p.principalId === principalId)
  );

  if (permission.permissions.length === previousLength) {
    return { success: false, error: '해당 권한 항목을 찾을 수 없어요' };
  }

  permission.updatedAt = Date.now();
  setResourcePermission(permission);

  // 감사 로그
  logAuditEvent({
    type: 'permission_revoked',
    resourceType,
    resourceId,
    changedBy: revokedBy,
    timestamp: Date.now(),
    details: { principalType, principalId }
  });

  return { success: true };
}

// 리소스 권한 조회
export function getResourcePermissions(
  resourceType: ResourceType,
  resourceId: string
): ResourcePermission | null {
  return getResourcePermission(resourceType, resourceId) || null;
}

// =====================
// 그룹 관리
// =====================

// 그룹 생성
export function createPermissionGroup(
  id: string,
  name: string,
  createdBy: string,
  description?: string
): { success: boolean; group?: Group; error?: string } {
  // 관리자만 그룹 생성 가능
  const creatorRole = getUserRole(createdBy);
  if (creatorRole !== ADMIN_ROLE && creatorRole !== 'manager') {
    return { success: false, error: '그룹을 생성할 권한이 없어요' };
  }

  const group = createGroup(id, name, createdBy, description);
  return { success: true, group };
}

// 그룹 삭제
export function deletePermissionGroup(
  groupId: string,
  deletedBy: string
): { success: boolean; error?: string } {
  const deleterRole = getUserRole(deletedBy);
  if (deleterRole !== ADMIN_ROLE && deleterRole !== 'manager') {
    return { success: false, error: '그룹을 삭제할 권한이 없어요' };
  }

  const success = deleteGroup(groupId);
  return { success, error: success ? undefined : '그룹을 찾을 수 없어요' };
}

// 그룹 멤버 관리
export function manageGroupMember(
  groupId: string,
  userId: string,
  action: 'add' | 'remove',
  managedBy: string
): { success: boolean; error?: string } {
  const managerRole = getUserRole(managedBy);
  if (managerRole !== ADMIN_ROLE && managerRole !== 'manager') {
    return { success: false, error: '그룹 멤버를 관리할 권한이 없어요' };
  }

  const success = action === 'add'
    ? addGroupMember(groupId, userId)
    : removeGroupMember(groupId, userId);

  return { success, error: success ? undefined : '그룹을 찾을 수 없어요' };
}

// 그룹 역할 관리
export function manageGroupRole(
  groupId: string,
  role: Role,
  action: 'add' | 'remove',
  managedBy: string
): { success: boolean; error?: string } {
  const managerRole = getUserRole(managedBy);
  if (managerRole !== ADMIN_ROLE) {
    return { success: false, error: '그룹 역할을 관리할 권한이 없어요' };
  }

  const success = action === 'add'
    ? addGroupRole(groupId, role)
    : removeGroupRole(groupId, role);

  return { success, error: success ? undefined : '그룹을 찾을 수 없어요' };
}

// =====================
// 권한 요약 및 조회
// =====================

// 사용자 권한 요약
export function getPermissionSummary(userId: string): PermissionSummary {
  const role = getUserRole(userId);
  const directPermissions = getEffectivePermissions(role);
  const groups = getUserGroups(userId);

  const groupPermissions = groups.map(group => ({
    groupId: group.id,
    groupName: group.name,
    permissions: group.roles.flatMap(r => getEffectivePermissions(r))
  }));

  // TODO: 리소스별 오버라이드 수집
  const resourceOverrides: PermissionSummary['resourceOverrides'] = [];

  return {
    userId,
    effectiveRole: role,
    directPermissions,
    inheritedPermissions: [], // 역할 상속은 이미 directPermissions에 포함
    groupPermissions,
    resourceOverrides
  };
}

// 감사 로그 조회
export function getAuditLogs(options?: {
  userId?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
}): PermissionAuditLog[] {
  let logs = [...auditLogs];

  if (options?.userId) {
    logs = logs.filter(l => l.event.targetUserId === options.userId);
  }

  if (options?.resourceType) {
    logs = logs.filter(l => l.event.resourceType === options.resourceType);
  }

  if (options?.resourceId) {
    logs = logs.filter(l => l.event.resourceId === options.resourceId);
  }

  if (options?.startDate) {
    logs = logs.filter(l => l.event.timestamp >= options.startDate!);
  }

  if (options?.endDate) {
    logs = logs.filter(l => l.event.timestamp <= options.endDate!);
  }

  // 최신순 정렬
  logs.sort((a, b) => b.event.timestamp - a.event.timestamp);

  if (options?.limit) {
    logs = logs.slice(0, options.limit);
  }

  return logs;
}

// =====================
// 내보내기
// =====================

export {
  // 기본 함수
  checkPermission,
  checkPermissions,
  getAllowedActions,
  getUserRole,
  // 역할 관련
  getAllRoles,
  getRole,
  getEffectivePermissions,
  isHigherRole,
  // 그룹 관련
  getGroup,
  getAllGroups,
  getUserGroups
};
