// 권한 검사 정책 로직
import {
  Role,
  Action,
  ResourceType,
  Permission,
  PermissionCondition,
  PermissionCheckRequest,
  PermissionCheckResult,
  PermissionScope,
  ResourcePermission,
  UserRole,
  Group,
  ADMIN_ROLE
} from './types';
import { getEffectivePermissions, roleHasPermission, isHigherRole } from './roles';

// 저장소 (실제로는 DB나 외부 스토어 사용)
const userRoles = new Map<string, UserRole>();
const resourcePermissions = new Map<string, ResourcePermission>();
const groups = new Map<string, Group>();
const userGroups = new Map<string, Set<string>>(); // userId -> Set<groupId>

// 사용자의 역할 조회
export function getUserRole(userId: string): Role {
  const userRole = userRoles.get(userId);
  if (!userRole) return 'guest';

  // 만료 확인
  if (userRole.expiresAt && userRole.expiresAt < Date.now()) {
    userRoles.delete(userId);
    return 'guest';
  }

  return userRole.role;
}

// 사용자의 역할 설정
export function setUserRole(userId: string, role: Role, assignedBy?: string, expiresAt?: number): void {
  userRoles.set(userId, {
    userId,
    role,
    assignedBy,
    assignedAt: Date.now(),
    expiresAt
  });
}

// 사용자의 역할 제거
export function removeUserRole(userId: string): void {
  userRoles.delete(userId);
}

// 리소스 권한 조회
export function getResourcePermission(
  resourceType: ResourceType,
  resourceId: string
): ResourcePermission | undefined {
  const key = `${resourceType}:${resourceId}`;
  return resourcePermissions.get(key);
}

// 리소스 권한 설정
export function setResourcePermission(permission: ResourcePermission): void {
  const key = `${permission.resourceType}:${permission.resourceId}`;
  resourcePermissions.set(key, permission);
}

// 리소스 권한 삭제
export function removeResourcePermission(resourceType: ResourceType, resourceId: string): void {
  const key = `${resourceType}:${resourceId}`;
  resourcePermissions.delete(key);
}

// 조건 평가
function evaluateCondition(
  condition: PermissionCondition,
  context: Record<string, unknown>
): boolean {
  const fieldValue = context[condition.field];

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'notEquals':
      return fieldValue !== condition.value;
    case 'contains':
      if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
        return fieldValue.includes(condition.value);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value);
      }
      return false;
    case 'in':
      if (Array.isArray(condition.value)) {
        return condition.value.includes(fieldValue);
      }
      return false;
    case 'gt':
      return Number(fieldValue) > Number(condition.value);
    case 'lt':
      return Number(fieldValue) < Number(condition.value);
    default:
      return false;
  }
}

// 범위 검사
function checkScope(
  scope: PermissionScope | undefined,
  userId: string,
  context: Record<string, unknown>
): boolean {
  if (!scope || scope === 'all') return true;

  const resourceOwnerId = context.ownerId as string | undefined;
  const resourceTeamId = context.teamId as string | undefined;
  const userTeamId = context.userTeamId as string | undefined;

  switch (scope) {
    case 'own':
      return resourceOwnerId === userId;
    case 'team':
      return resourceTeamId === userTeamId;
    default:
      return true;
  }
}

// 권한 검사
export function checkPermission(request: PermissionCheckRequest): PermissionCheckResult {
  const { userId, action, resourceType, resourceId, resourcePath, context = {} } = request;

  // 1. 관리자는 모든 권한 허용
  const userRole = getUserRole(userId);
  if (userRole === ADMIN_ROLE) {
    return {
      allowed: true,
      reason: '관리자 권한',
      grantedBy: 'role',
      effectiveRole: ADMIN_ROLE
    };
  }

  // 2. 리소스별 직접 권한 확인 (ACL)
  if (resourceId) {
    const resourcePerm = getResourcePermission(resourceType, resourceId);
    if (resourcePerm) {
      // 사용자 직접 권한
      const userEntry = resourcePerm.permissions.find(
        p => p.principalType === 'user' && p.principalId === userId
      );
      if (userEntry && userEntry.actions.includes(action)) {
        // 만료 확인
        if (!userEntry.expiresAt || userEntry.expiresAt > Date.now()) {
          if (checkScope(userEntry.scope, userId, context)) {
            return {
              allowed: true,
              reason: '리소스 직접 권한',
              grantedBy: 'resource',
              effectiveRole: userRole
            };
          }
        }
      }

      // 역할 기반 권한
      const roleEntry = resourcePerm.permissions.find(
        p => p.principalType === 'role' && p.principalId === userRole
      );
      if (roleEntry && roleEntry.actions.includes(action)) {
        if (!roleEntry.expiresAt || roleEntry.expiresAt > Date.now()) {
          if (checkScope(roleEntry.scope, userId, context)) {
            return {
              allowed: true,
              reason: '리소스 역할 권한',
              grantedBy: 'resource',
              effectiveRole: userRole
            };
          }
        }
      }

      // 그룹 권한
      const userGroupIds = userGroups.get(userId);
      if (userGroupIds) {
        for (const groupId of userGroupIds) {
          const groupEntry = resourcePerm.permissions.find(
            p => p.principalType === 'group' && p.principalId === groupId
          );
          if (groupEntry && groupEntry.actions.includes(action)) {
            if (!groupEntry.expiresAt || groupEntry.expiresAt > Date.now()) {
              if (checkScope(groupEntry.scope, userId, context)) {
                return {
                  allowed: true,
                  reason: `그룹 권한 (${groupId})`,
                  grantedBy: 'group',
                  effectiveRole: userRole
                };
              }
            }
          }
        }
      }

      // 상위 폴더에서 상속
      if (resourcePerm.inheritFromParent && resourcePath) {
        const parentPath = resourcePath.split('/').slice(0, -1).join('/');
        if (parentPath) {
          const parentResult = checkPermission({
            ...request,
            resourceId: parentPath,
            resourcePath: parentPath
          });
          if (parentResult.allowed) {
            return {
              ...parentResult,
              grantedBy: 'inherit',
              reason: `상위 폴더에서 상속 (${parentPath})`
            };
          }
        }
      }
    }
  }

  // 3. 그룹 역할 권한 확인
  const userGroupIds = userGroups.get(userId);
  if (userGroupIds) {
    for (const groupId of userGroupIds) {
      const group = groups.get(groupId);
      if (group) {
        for (const groupRole of group.roles) {
          if (isHigherRole(groupRole, userRole) || groupRole === userRole) {
            if (roleHasPermission(groupRole, resourceType, action)) {
              return {
                allowed: true,
                reason: `그룹 역할 (${group.name})`,
                grantedBy: 'group',
                effectiveRole: groupRole
              };
            }
          }
        }
      }
    }
  }

  // 4. 사용자 역할 기반 권한 확인
  const permissions = getEffectivePermissions(userRole);
  for (const permission of permissions) {
    if (permission.resource === resourceType && permission.actions.includes(action)) {
      // 조건 확인
      if (permission.conditions) {
        const allConditionsMet = permission.conditions.every(cond =>
          evaluateCondition(cond, context)
        );
        if (!allConditionsMet) continue;
      }

      // 범위 확인
      if (!checkScope(permission.scope, userId, context)) continue;

      return {
        allowed: true,
        reason: `역할 권한 (${userRole})`,
        grantedBy: 'role',
        effectiveRole: userRole
      };
    }
  }

  // 5. 기본: 거부
  return {
    allowed: false,
    reason: '권한이 없어요',
    effectiveRole: userRole
  };
}

// 여러 액션에 대한 권한 일괄 검사
export function checkPermissions(
  userId: string,
  resourceType: ResourceType,
  actions: Action[],
  resourceId?: string,
  context?: Record<string, unknown>
): Record<Action, boolean> {
  const result: Record<string, boolean> = {};

  for (const action of actions) {
    const check = checkPermission({
      userId,
      action,
      resourceType,
      resourceId,
      context
    });
    result[action] = check.allowed;
  }

  return result as Record<Action, boolean>;
}

// 사용자가 수행할 수 있는 모든 액션 조회
export function getAllowedActions(
  userId: string,
  resourceType: ResourceType,
  resourceId?: string,
  context?: Record<string, unknown>
): Action[] {
  const allActions: Action[] = ['create', 'read', 'update', 'delete', 'share', 'manage'];
  const allowed: Action[] = [];

  for (const action of allActions) {
    const result = checkPermission({
      userId,
      action,
      resourceType,
      resourceId,
      context
    });
    if (result.allowed) {
      allowed.push(action);
    }
  }

  return allowed;
}

// 그룹 관련 함수들

// 그룹 생성
export function createGroup(
  id: string,
  name: string,
  createdBy: string,
  description?: string
): Group {
  const group: Group = {
    id,
    name,
    description,
    members: [],
    roles: [],
    createdBy,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  groups.set(id, group);
  return group;
}

// 그룹 조회
export function getGroup(groupId: string): Group | undefined {
  return groups.get(groupId);
}

// 모든 그룹 조회
export function getAllGroups(): Group[] {
  return Array.from(groups.values());
}

// 그룹 삭제
export function deleteGroup(groupId: string): boolean {
  const group = groups.get(groupId);
  if (!group) return false;

  // 멤버들의 그룹 참조 제거
  for (const memberId of group.members) {
    const memberGroups = userGroups.get(memberId);
    if (memberGroups) {
      memberGroups.delete(groupId);
    }
  }

  return groups.delete(groupId);
}

// 그룹에 멤버 추가
export function addGroupMember(groupId: string, userId: string): boolean {
  const group = groups.get(groupId);
  if (!group) return false;

  if (!group.members.includes(userId)) {
    group.members.push(userId);
    group.updatedAt = Date.now();
  }

  // 사용자의 그룹 목록 업데이트
  if (!userGroups.has(userId)) {
    userGroups.set(userId, new Set());
  }
  userGroups.get(userId)!.add(groupId);

  return true;
}

// 그룹에서 멤버 제거
export function removeGroupMember(groupId: string, userId: string): boolean {
  const group = groups.get(groupId);
  if (!group) return false;

  group.members = group.members.filter(id => id !== userId);
  group.updatedAt = Date.now();

  // 사용자의 그룹 목록 업데이트
  const memberGroups = userGroups.get(userId);
  if (memberGroups) {
    memberGroups.delete(groupId);
  }

  return true;
}

// 그룹에 역할 추가
export function addGroupRole(groupId: string, role: Role): boolean {
  const group = groups.get(groupId);
  if (!group) return false;

  if (!group.roles.includes(role)) {
    group.roles.push(role);
    group.updatedAt = Date.now();
  }

  return true;
}

// 그룹에서 역할 제거
export function removeGroupRole(groupId: string, role: Role): boolean {
  const group = groups.get(groupId);
  if (!group) return false;

  group.roles = group.roles.filter(r => r !== role);
  group.updatedAt = Date.now();

  return true;
}

// 사용자가 속한 그룹 조회
export function getUserGroups(userId: string): Group[] {
  const groupIds = userGroups.get(userId);
  if (!groupIds) return [];

  return Array.from(groupIds)
    .map(id => groups.get(id))
    .filter((g): g is Group => g !== undefined);
}

// 내보내기 (테스트/관리용)
export {
  userRoles,
  resourcePermissions,
  groups,
  userGroups
};
