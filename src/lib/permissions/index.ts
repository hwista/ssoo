// 권한 관리 시스템 통합 내보내기

// 타입 내보내기
export * from './types';

// 역할 정의
export {
  DEFAULT_ROLES,
  getRole,
  getAllRoles,
  getEffectivePermissions,
  roleHasPermission,
  compareRolePriority,
  isHigherRole,
  getRoleInheritanceChain,
  addCustomRole,
  removeCustomRole,
  getCustomRole,
  getAllRolesWithCustom,
  RESOURCE_PERMISSION_TEMPLATES,
  applyPermissionTemplate
} from './roles';

// 정책 (권한 검사)
export {
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

// 관리자 (고수준 API)
export {
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
  getAuditLogs
} from './manager';
