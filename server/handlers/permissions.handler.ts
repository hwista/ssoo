/**
 * 권한 핸들러
 * @description 역할 기반 권한 관리 (역할, 리소스 권한, 그룹, 감사 로그)
 */

import {
  Role,
  Action,
  ResourceType,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_ICONS
} from '@/lib/permissions/types';
import {
  checkPermission,
  checkPermissions,
  getAllowedActions,
  getUserRole,
  getAllRoles,
  getRole,
  getEffectivePermissions,
  assignRole,
  revokeRole,
  getUserRoleInfo,
  grantResourcePermission,
  revokeResourcePermission,
  getResourcePermissions,
  createPermissionGroup,
  deletePermissionGroup,
  manageGroupMember,
  manageGroupRole,
  getPermissionSummary,
  getAuditLogs,
  getGroup,
  getAllGroups
} from '@/lib/permissions';

// ============================================================================
// Types
// ============================================================================

export type HandlerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: number };

// ============================================================================
// GET Handler - 권한 조회
// ============================================================================

type PermissionGetAction = 
  | 'roles' 
  | 'role' 
  | 'userRole' 
  | 'summary' 
  | 'check' 
  | 'allowedActions' 
  | 'resourcePermissions' 
  | 'groups' 
  | 'group' 
  | 'auditLogs';

export async function getPermissionInfo(params: {
  action?: PermissionGetAction;
  userId?: string;
  roleId?: string;
  resourceType?: string;
  resourceAction?: string;
  resourceId?: string;
  groupId?: string;
  targetUserId?: string;
  limit?: string;
}): Promise<HandlerResult<unknown>> {
  try {
    const { action, userId, roleId, resourceType, resourceAction, resourceId, groupId, targetUserId, limit } = params;

    switch (action) {
      // 모든 역할 목록
      case 'roles': {
        const roles = getAllRoles().map(r => ({
          ...r,
          label: ROLE_LABELS[r.id],
          color: ROLE_COLORS[r.id],
          icon: ROLE_ICONS[r.id]
        }));
        return { success: true, data: { roles } };
      }

      // 특정 역할 조회
      case 'role': {
        if (!roleId) {
          return {
            success: false,
            error: '역할 ID가 필요해요',
            status: 400
          };
        }
        const role = getRole(roleId as Role);
        if (!role) {
          return {
            success: false,
            error: '역할을 찾을 수 없어요',
            status: 404
          };
        }
        const permissions = getEffectivePermissions(roleId as Role);
        return {
          success: true,
          data: {
            role: {
              ...role,
              label: ROLE_LABELS[role.id],
              color: ROLE_COLORS[role.id],
              icon: ROLE_ICONS[role.id]
            },
            permissions
          }
        };
      }

      // 사용자 역할 조회
      case 'userRole': {
        if (!userId) {
          return {
            success: false,
            error: '사용자 ID가 필요해요',
            status: 400
          };
        }
        const roleInfo = getUserRoleInfo(userId);
        return {
          success: true,
          data: {
            ...roleInfo,
            roleLabel: ROLE_LABELS[roleInfo.role],
            roleColor: ROLE_COLORS[roleInfo.role],
            roleIcon: ROLE_ICONS[roleInfo.role]
          }
        };
      }

      // 사용자 권한 요약
      case 'summary': {
        if (!userId) {
          return {
            success: false,
            error: '사용자 ID가 필요해요',
            status: 400
          };
        }
        const summary = getPermissionSummary(userId);
        return { success: true, data: { summary } };
      }

      // 권한 검사
      case 'check': {
        if (!userId) {
          return {
            success: false,
            error: '사용자 ID가 필요해요',
            status: 400
          };
        }
        if (!resourceType || !resourceAction) {
          return {
            success: false,
            error: '리소스 타입과 액션이 필요해요',
            status: 400
          };
        }

        const result = checkPermission({
          userId,
          action: resourceAction as Action,
          resourceType: resourceType as ResourceType,
          resourceId: resourceId || undefined
        });

        return { success: true, data: { result } };
      }

      // 허용된 액션 목록
      case 'allowedActions': {
        if (!userId) {
          return {
            success: false,
            error: '사용자 ID가 필요해요',
            status: 400
          };
        }
        if (!resourceType) {
          return {
            success: false,
            error: '리소스 타입이 필요해요',
            status: 400
          };
        }

        const actions = getAllowedActions(userId, resourceType as ResourceType, resourceId || undefined);
        return { success: true, data: { actions } };
      }

      // 리소스 권한 조회
      case 'resourcePermissions': {
        if (!resourceType || !resourceId) {
          return {
            success: false,
            error: '리소스 타입과 ID가 필요해요',
            status: 400
          };
        }

        const permissions = getResourcePermissions(resourceType as ResourceType, resourceId);
        return { success: true, data: { permissions } };
      }

      // 그룹 목록
      case 'groups': {
        const groups = getAllGroups();
        return { success: true, data: { groups } };
      }

      // 특정 그룹 조회
      case 'group': {
        if (!groupId) {
          return {
            success: false,
            error: '그룹 ID가 필요해요',
            status: 400
          };
        }
        const group = getGroup(groupId);
        if (!group) {
          return {
            success: false,
            error: '그룹을 찾을 수 없어요',
            status: 404
          };
        }
        return { success: true, data: { group } };
      }

      // 감사 로그
      case 'auditLogs': {
        const logs = getAuditLogs({
          userId: targetUserId || undefined,
          resourceType: resourceType as ResourceType | undefined,
          resourceId: resourceId || undefined,
          limit: parseInt(limit || '50')
        });

        return { success: true, data: { logs } };
      }

      default:
        return {
          success: false,
          error: '알 수 없는 액션이에요',
          status: 400
        };
    }
  } catch (error) {
    console.error('권한 조회 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '권한 조회 중 오류가 발생했어요',
      status: 500
    };
  }
}

// ============================================================================
// POST Handler - 권한 설정/변경
// ============================================================================

type PermissionPostAction = 
  | 'assignRole' 
  | 'revokeRole' 
  | 'grantPermission' 
  | 'revokePermission' 
  | 'createGroup' 
  | 'deleteGroup' 
  | 'manageGroupMember' 
  | 'manageGroupRole'
  | 'checkPermissions';

export async function handlePermissionAction(body: {
  action: PermissionPostAction;
  userId?: string;
  role?: string;
  assignedBy?: string;
  revokedBy?: string;
  expiresAt?: string;
  resourceType?: string;
  resourceId?: string;
  principalType?: string;
  principalId?: string;
  actions?: string[];
  grantedBy?: string;
  scope?: string;
  inheritFromParent?: boolean;
  groupId?: string;
  name?: string;
  createdBy?: string;
  deletedBy?: string;
  description?: string;
  memberAction?: 'add' | 'remove';
  roleAction?: 'add' | 'remove';
  managedBy?: string;
  context?: unknown;
}): Promise<HandlerResult<unknown>> {
  try {
    const { action } = body;

    switch (action) {
      // 역할 할당
      case 'assignRole': {
        const { userId, role, assignedBy, expiresAt } = body;

        if (!userId || !role || !assignedBy) {
          return {
            success: false,
            error: '필수 정보가 누락되었어요 (userId, role, assignedBy)',
            status: 400
          };
        }

        const result = assignRole(userId, role as Role, assignedBy, expiresAt ? Number(expiresAt) : undefined);
        return {
          success: true,
          data: {
            success: result.success,
            message: result.success ? '역할을 할당했어요' : result.error,
            error: result.error
          }
        };
      }

      // 역할 회수
      case 'revokeRole': {
        const { userId, revokedBy } = body;

        if (!userId || !revokedBy) {
          return {
            success: false,
            error: '필수 정보가 누락되었어요 (userId, revokedBy)',
            status: 400
          };
        }

        const result = revokeRole(userId, revokedBy);
        return {
          success: true,
          data: {
            success: result.success,
            message: result.success ? '역할을 회수했어요' : result.error,
            error: result.error
          }
        };
      }

      // 리소스 권한 부여
      case 'grantPermission': {
        const {
          resourceType,
          resourceId,
          principalType,
          principalId,
          actions,
          grantedBy,
          scope,
          expiresAt,
          inheritFromParent
        } = body;

        if (!resourceType || !resourceId || !principalType || !principalId || !actions || !grantedBy) {
          return {
            success: false,
            error: '필수 정보가 누락되었어요',
            status: 400
          };
        }

        const result = grantResourcePermission(
          resourceType as ResourceType,
          resourceId,
          principalType as 'user' | 'group',
          principalId,
          actions as Action[],
          grantedBy,
          { 
            scope: scope as 'own' | 'team' | 'all' | undefined, 
            expiresAt: expiresAt ? Number(expiresAt) : undefined, 
            inheritFromParent 
          }
        );

        return {
          success: true,
          data: {
            success: result.success,
            message: result.success ? '권한을 부여했어요' : result.error,
            error: result.error
          }
        };
      }

      // 리소스 권한 회수
      case 'revokePermission': {
        const { resourceType, resourceId, principalType, principalId, revokedBy } = body;

        if (!resourceType || !resourceId || !principalType || !principalId || !revokedBy) {
          return {
            success: false,
            error: '필수 정보가 누락되었어요',
            status: 400
          };
        }

        const result = revokeResourcePermission(
          resourceType as ResourceType,
          resourceId,
          principalType as 'user' | 'group',
          principalId,
          revokedBy
        );

        return {
          success: true,
          data: {
            success: result.success,
            message: result.success ? '권한을 회수했어요' : result.error,
            error: result.error
          }
        };
      }

      // 그룹 생성
      case 'createGroup': {
        const { groupId, name, createdBy, description } = body;

        if (!groupId || !name || !createdBy) {
          return {
            success: false,
            error: '필수 정보가 누락되었어요 (groupId, name, createdBy)',
            status: 400
          };
        }

        const result = createPermissionGroup(groupId, name, createdBy, description);
        return {
          success: true,
          data: {
            success: result.success,
            group: result.group,
            message: result.success ? '그룹을 생성했어요' : result.error,
            error: result.error
          }
        };
      }

      // 그룹 삭제
      case 'deleteGroup': {
        const { groupId, deletedBy } = body;

        if (!groupId || !deletedBy) {
          return {
            success: false,
            error: '필수 정보가 누락되었어요 (groupId, deletedBy)',
            status: 400
          };
        }

        const result = deletePermissionGroup(groupId, deletedBy);
        return {
          success: true,
          data: {
            success: result.success,
            message: result.success ? '그룹을 삭제했어요' : result.error,
            error: result.error
          }
        };
      }

      // 그룹 멤버 관리
      case 'manageGroupMember': {
        const { groupId, userId, memberAction, managedBy } = body;

        if (!groupId || !userId || !memberAction || !managedBy) {
          return {
            success: false,
            error: '필수 정보가 누락되었어요',
            status: 400
          };
        }

        const result = manageGroupMember(groupId, userId, memberAction, managedBy);
        return {
          success: true,
          data: {
            success: result.success,
            message: result.success
              ? (memberAction === 'add' ? '멤버를 추가했어요' : '멤버를 제거했어요')
              : result.error,
            error: result.error
          }
        };
      }

      // 그룹 역할 관리
      case 'manageGroupRole': {
        const { groupId, role, roleAction, managedBy } = body;

        if (!groupId || !role || !roleAction || !managedBy) {
          return {
            success: false,
            error: '필수 정보가 누락되었어요',
            status: 400
          };
        }

        const result = manageGroupRole(groupId, role as Role, roleAction, managedBy);
        return {
          success: true,
          data: {
            success: result.success,
            message: result.success
              ? (roleAction === 'add' ? '역할을 추가했어요' : '역할을 제거했어요')
              : result.error,
            error: result.error
          }
        };
      }

      // 여러 액션 권한 일괄 검사
      case 'checkPermissions': {
        const { userId, resourceType, actions, resourceId, context } = body;

        if (!userId || !resourceType || !actions) {
          return {
            success: false,
            error: '필수 정보가 누락되었어요 (userId, resourceType, actions)',
            status: 400
          };
        }

        const result = checkPermissions(
          userId, 
          resourceType as ResourceType, 
          actions as Action[], 
          resourceId || undefined, 
          context as Record<string, unknown> | undefined
        );
        return { success: true, data: { permissions: result } };
      }

      default:
        return {
          success: false,
          error: '알 수 없는 액션이에요',
          status: 400
        };
    }
  } catch (error) {
    console.error('권한 설정 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '권한 설정 중 오류가 발생했어요',
      status: 500
    };
  }
}
