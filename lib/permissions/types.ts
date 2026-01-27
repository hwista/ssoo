// 권한 관리 시스템 타입 정의

// 기본 역할
export type Role = 'admin' | 'manager' | 'editor' | 'viewer' | 'guest';

// 리소스 타입
export type ResourceType = 'file' | 'folder' | 'comment' | 'user' | 'settings' | 'system';

// 액션 타입
export type Action = 'create' | 'read' | 'update' | 'delete' | 'share' | 'manage';

// 권한 범위
export type PermissionScope = 'own' | 'team' | 'all';

// 개별 권한
export interface Permission {
  resource: ResourceType;
  actions: Action[];
  scope?: PermissionScope;
  conditions?: PermissionCondition[];
}

// 권한 조건
export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'in' | 'gt' | 'lt';
  value: unknown;
}

// 역할 정의
export interface RoleDefinition {
  id: Role;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: Role;  // 권한 상속
  isSystem?: boolean;  // 시스템 역할 (수정 불가)
  priority: number;  // 높을수록 우선순위 높음
}

// 사용자 역할 할당
export interface UserRole {
  userId: string;
  role: Role;
  assignedBy?: string;
  assignedAt: number;
  expiresAt?: number;  // 임시 권한
}

// 리소스별 권한 (ACL)
export interface ResourcePermission {
  resourceType: ResourceType;
  resourceId: string;
  resourcePath?: string;
  permissions: ResourcePermissionEntry[];
  inheritFromParent?: boolean;
  createdAt: number;
  updatedAt: number;
}

// ACL 항목
export interface ResourcePermissionEntry {
  principalType: 'user' | 'role' | 'group';
  principalId: string;
  actions: Action[];
  scope?: PermissionScope;
  grantedBy?: string;
  grantedAt: number;
  expiresAt?: number;
}

// 그룹 정의
export interface Group {
  id: string;
  name: string;
  description?: string;
  members: string[];  // userId[]
  roles: Role[];  // 그룹에 할당된 역할
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

// 권한 검사 요청
export interface PermissionCheckRequest {
  userId: string;
  action: Action;
  resourceType: ResourceType;
  resourceId?: string;
  resourcePath?: string;
  context?: Record<string, unknown>;
}

// 권한 검사 결과
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  grantedBy?: 'role' | 'resource' | 'group' | 'inherit';
  effectiveRole?: Role;
}

// 권한 변경 이벤트
export interface PermissionChangeEvent {
  type: 'role_assigned' | 'role_removed' | 'permission_granted' | 'permission_revoked';
  targetUserId?: string;
  targetRole?: Role;
  resourceType?: ResourceType;
  resourceId?: string;
  changedBy: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

// 권한 감사 로그
export interface PermissionAuditLog {
  id: string;
  event: PermissionChangeEvent;
  previousState?: unknown;
  newState?: unknown;
}

// 권한 요약 (UI 표시용)
export interface PermissionSummary {
  userId: string;
  effectiveRole: Role;
  directPermissions: Permission[];
  inheritedPermissions: Permission[];
  groupPermissions: Array<{
    groupId: string;
    groupName: string;
    permissions: Permission[];
  }>;
  resourceOverrides: Array<{
    resourceType: ResourceType;
    resourceId: string;
    actions: Action[];
  }>;
}

// 역할별 색상 (UI용)
export const ROLE_COLORS: Record<Role, string> = {
  admin: '#EF4444',     // 빨간색
  manager: '#F97316',   // 주황색
  editor: '#3B82F6',    // 파란색
  viewer: '#22C55E',    // 초록색
  guest: '#9CA3AF'      // 회색
};

// 역할별 아이콘 (UI용)
export const ROLE_ICONS: Record<Role, string> = {
  admin: '👑',
  manager: '🔧',
  editor: '✏️',
  viewer: '👁️',
  guest: '👤'
};

// 역할별 한글 이름
export const ROLE_LABELS: Record<Role, string> = {
  admin: '관리자',
  manager: '매니저',
  editor: '편집자',
  viewer: '뷰어',
  guest: '게스트'
};

// 액션별 한글 이름
export const ACTION_LABELS: Record<Action, string> = {
  create: '생성',
  read: '읽기',
  update: '수정',
  delete: '삭제',
  share: '공유',
  manage: '관리'
};

// 리소스별 한글 이름
export const RESOURCE_LABELS: Record<ResourceType, string> = {
  file: '파일',
  folder: '폴더',
  comment: '댓글',
  user: '사용자',
  settings: '설정',
  system: '시스템'
};

// 기본 게스트 역할
export const GUEST_ROLE: Role = 'guest';

// 시스템 관리자 역할
export const ADMIN_ROLE: Role = 'admin';
