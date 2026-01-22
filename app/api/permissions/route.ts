import { NextRequest, NextResponse } from 'next/server';
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

// 권한 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    switch (action) {
      // 모든 역할 목록
      case 'roles': {
        const roles = getAllRoles().map(r => ({
          ...r,
          label: ROLE_LABELS[r.id],
          color: ROLE_COLORS[r.id],
          icon: ROLE_ICONS[r.id]
        }));
        return NextResponse.json({ success: true, roles });
      }

      // 특정 역할 조회
      case 'role': {
        const roleId = searchParams.get('roleId') as Role;
        if (!roleId) {
          return NextResponse.json(
            { error: '역할 ID가 필요해요' },
            { status: 400 }
          );
        }
        const role = getRole(roleId);
        if (!role) {
          return NextResponse.json(
            { error: '역할을 찾을 수 없어요' },
            { status: 404 }
          );
        }
        const permissions = getEffectivePermissions(roleId);
        return NextResponse.json({
          success: true,
          role: {
            ...role,
            label: ROLE_LABELS[role.id],
            color: ROLE_COLORS[role.id],
            icon: ROLE_ICONS[role.id]
          },
          permissions
        });
      }

      // 사용자 역할 조회
      case 'userRole': {
        if (!userId) {
          return NextResponse.json(
            { error: '사용자 ID가 필요해요' },
            { status: 400 }
          );
        }
        const roleInfo = getUserRoleInfo(userId);
        return NextResponse.json({
          success: true,
          ...roleInfo,
          roleLabel: ROLE_LABELS[roleInfo.role],
          roleColor: ROLE_COLORS[roleInfo.role],
          roleIcon: ROLE_ICONS[roleInfo.role]
        });
      }

      // 사용자 권한 요약
      case 'summary': {
        if (!userId) {
          return NextResponse.json(
            { error: '사용자 ID가 필요해요' },
            { status: 400 }
          );
        }
        const summary = getPermissionSummary(userId);
        return NextResponse.json({ success: true, summary });
      }

      // 권한 검사
      case 'check': {
        if (!userId) {
          return NextResponse.json(
            { error: '사용자 ID가 필요해요' },
            { status: 400 }
          );
        }
        const resourceType = searchParams.get('resourceType') as ResourceType;
        const resourceAction = searchParams.get('resourceAction') as Action;
        const resourceId = searchParams.get('resourceId') || undefined;

        if (!resourceType || !resourceAction) {
          return NextResponse.json(
            { error: '리소스 타입과 액션이 필요해요' },
            { status: 400 }
          );
        }

        const result = checkPermission({
          userId,
          action: resourceAction,
          resourceType,
          resourceId
        });

        return NextResponse.json({ success: true, result });
      }

      // 허용된 액션 목록
      case 'allowedActions': {
        if (!userId) {
          return NextResponse.json(
            { error: '사용자 ID가 필요해요' },
            { status: 400 }
          );
        }
        const resourceType = searchParams.get('resourceType') as ResourceType;
        const resourceId = searchParams.get('resourceId') || undefined;

        if (!resourceType) {
          return NextResponse.json(
            { error: '리소스 타입이 필요해요' },
            { status: 400 }
          );
        }

        const actions = getAllowedActions(userId, resourceType, resourceId);
        return NextResponse.json({ success: true, actions });
      }

      // 리소스 권한 조회
      case 'resourcePermissions': {
        const resourceType = searchParams.get('resourceType') as ResourceType;
        const resourceId = searchParams.get('resourceId');

        if (!resourceType || !resourceId) {
          return NextResponse.json(
            { error: '리소스 타입과 ID가 필요해요' },
            { status: 400 }
          );
        }

        const permissions = getResourcePermissions(resourceType, resourceId);
        return NextResponse.json({ success: true, permissions });
      }

      // 그룹 목록
      case 'groups': {
        const groups = getAllGroups();
        return NextResponse.json({ success: true, groups });
      }

      // 특정 그룹 조회
      case 'group': {
        const groupId = searchParams.get('groupId');
        if (!groupId) {
          return NextResponse.json(
            { error: '그룹 ID가 필요해요' },
            { status: 400 }
          );
        }
        const group = getGroup(groupId);
        if (!group) {
          return NextResponse.json(
            { error: '그룹을 찾을 수 없어요' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, group });
      }

      // 감사 로그
      case 'auditLogs': {
        const targetUserId = searchParams.get('targetUserId') || undefined;
        const resourceType = searchParams.get('resourceType') as ResourceType | undefined;
        const resourceId = searchParams.get('resourceId') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');

        const logs = getAuditLogs({
          userId: targetUserId,
          resourceType,
          resourceId,
          limit
        });

        return NextResponse.json({ success: true, logs });
      }

      default:
        return NextResponse.json(
          { error: '알 수 없는 액션이에요' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('권한 조회 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '권한 조회 중 오류가 발생했어요' },
      { status: 500 }
    );
  }
}

// 권한 설정/변경
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      // 역할 할당
      case 'assignRole': {
        const { userId, role, assignedBy, expiresAt } = body;

        if (!userId || !role || !assignedBy) {
          return NextResponse.json(
            { error: '필수 정보가 누락되었어요 (userId, role, assignedBy)' },
            { status: 400 }
          );
        }

        const result = assignRole(userId, role, assignedBy, expiresAt);
        return NextResponse.json({
          success: result.success,
          message: result.success ? '역할을 할당했어요' : result.error,
          error: result.error
        });
      }

      // 역할 회수
      case 'revokeRole': {
        const { userId, revokedBy } = body;

        if (!userId || !revokedBy) {
          return NextResponse.json(
            { error: '필수 정보가 누락되었어요 (userId, revokedBy)' },
            { status: 400 }
          );
        }

        const result = revokeRole(userId, revokedBy);
        return NextResponse.json({
          success: result.success,
          message: result.success ? '역할을 회수했어요' : result.error,
          error: result.error
        });
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
          return NextResponse.json(
            { error: '필수 정보가 누락되었어요' },
            { status: 400 }
          );
        }

        const result = grantResourcePermission(
          resourceType,
          resourceId,
          principalType,
          principalId,
          actions,
          grantedBy,
          { scope, expiresAt, inheritFromParent }
        );

        return NextResponse.json({
          success: result.success,
          message: result.success ? '권한을 부여했어요' : result.error,
          error: result.error
        });
      }

      // 리소스 권한 회수
      case 'revokePermission': {
        const { resourceType, resourceId, principalType, principalId, revokedBy } = body;

        if (!resourceType || !resourceId || !principalType || !principalId || !revokedBy) {
          return NextResponse.json(
            { error: '필수 정보가 누락되었어요' },
            { status: 400 }
          );
        }

        const result = revokeResourcePermission(
          resourceType,
          resourceId,
          principalType,
          principalId,
          revokedBy
        );

        return NextResponse.json({
          success: result.success,
          message: result.success ? '권한을 회수했어요' : result.error,
          error: result.error
        });
      }

      // 그룹 생성
      case 'createGroup': {
        const { groupId, name, createdBy, description } = body;

        if (!groupId || !name || !createdBy) {
          return NextResponse.json(
            { error: '필수 정보가 누락되었어요 (groupId, name, createdBy)' },
            { status: 400 }
          );
        }

        const result = createPermissionGroup(groupId, name, createdBy, description);
        return NextResponse.json({
          success: result.success,
          group: result.group,
          message: result.success ? '그룹을 생성했어요' : result.error,
          error: result.error
        });
      }

      // 그룹 삭제
      case 'deleteGroup': {
        const { groupId, deletedBy } = body;

        if (!groupId || !deletedBy) {
          return NextResponse.json(
            { error: '필수 정보가 누락되었어요 (groupId, deletedBy)' },
            { status: 400 }
          );
        }

        const result = deletePermissionGroup(groupId, deletedBy);
        return NextResponse.json({
          success: result.success,
          message: result.success ? '그룹을 삭제했어요' : result.error,
          error: result.error
        });
      }

      // 그룹 멤버 관리
      case 'manageGroupMember': {
        const { groupId, userId, memberAction, managedBy } = body;

        if (!groupId || !userId || !memberAction || !managedBy) {
          return NextResponse.json(
            { error: '필수 정보가 누락되었어요' },
            { status: 400 }
          );
        }

        const result = manageGroupMember(groupId, userId, memberAction, managedBy);
        return NextResponse.json({
          success: result.success,
          message: result.success
            ? (memberAction === 'add' ? '멤버를 추가했어요' : '멤버를 제거했어요')
            : result.error,
          error: result.error
        });
      }

      // 그룹 역할 관리
      case 'manageGroupRole': {
        const { groupId, role, roleAction, managedBy } = body;

        if (!groupId || !role || !roleAction || !managedBy) {
          return NextResponse.json(
            { error: '필수 정보가 누락되었어요' },
            { status: 400 }
          );
        }

        const result = manageGroupRole(groupId, role, roleAction, managedBy);
        return NextResponse.json({
          success: result.success,
          message: result.success
            ? (roleAction === 'add' ? '역할을 추가했어요' : '역할을 제거했어요')
            : result.error,
          error: result.error
        });
      }

      // 여러 액션 권한 일괄 검사
      case 'checkPermissions': {
        const { userId, resourceType, actions, resourceId, context } = body;

        if (!userId || !resourceType || !actions) {
          return NextResponse.json(
            { error: '필수 정보가 누락되었어요 (userId, resourceType, actions)' },
            { status: 400 }
          );
        }

        const result = checkPermissions(userId, resourceType, actions, resourceId, context);
        return NextResponse.json({ success: true, permissions: result });
      }

      default:
        return NextResponse.json(
          { error: '알 수 없는 액션이에요' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('권한 설정 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '권한 설정 중 오류가 발생했어요' },
      { status: 500 }
    );
  }
}
