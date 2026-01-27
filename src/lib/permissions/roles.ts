// 역할 정의 및 기본 권한 설정
import { Role, RoleDefinition, Permission, Action, ResourceType } from './types';

// 모든 액션
const ALL_ACTIONS: Action[] = ['create', 'read', 'update', 'delete', 'share', 'manage'];

// 읽기 전용 액션
const READ_ONLY_ACTIONS: Action[] = ['read'];

// 편집 액션
const EDIT_ACTIONS: Action[] = ['create', 'read', 'update', 'delete'];

// 전체 권한 생성 헬퍼
function fullAccess(resource: ResourceType): Permission {
  return { resource, actions: ALL_ACTIONS, scope: 'all' };
}

// 편집 권한 생성 헬퍼
function editAccess(resource: ResourceType, scope: 'own' | 'team' | 'all' = 'all'): Permission {
  return { resource, actions: EDIT_ACTIONS, scope };
}

// 읽기 권한 생성 헬퍼
function readAccess(resource: ResourceType, scope: 'own' | 'team' | 'all' = 'all'): Permission {
  return { resource, actions: READ_ONLY_ACTIONS, scope };
}

// 기본 역할 정의
export const DEFAULT_ROLES: RoleDefinition[] = [
  // 관리자: 모든 권한
  {
    id: 'admin',
    name: '관리자',
    description: '시스템의 모든 기능에 대한 완전한 접근 권한을 가져요',
    priority: 100,
    isSystem: true,
    permissions: [
      fullAccess('file'),
      fullAccess('folder'),
      fullAccess('comment'),
      fullAccess('user'),
      fullAccess('settings'),
      fullAccess('system')
    ]
  },

  // 매니저: 사용자/시스템 설정 제외한 대부분 권한
  {
    id: 'manager',
    name: '매니저',
    description: '팀 내 문서와 사용자를 관리할 수 있어요',
    priority: 80,
    isSystem: true,
    inherits: 'editor',
    permissions: [
      fullAccess('file'),
      fullAccess('folder'),
      fullAccess('comment'),
      { resource: 'user', actions: ['read', 'update'], scope: 'team' },
      { resource: 'settings', actions: ['read', 'update'], scope: 'team' }
    ]
  },

  // 편집자: 문서 편집 가능
  {
    id: 'editor',
    name: '편집자',
    description: '문서를 생성하고 편집할 수 있어요',
    priority: 60,
    isSystem: true,
    inherits: 'viewer',
    permissions: [
      editAccess('file'),
      editAccess('folder'),
      editAccess('comment'),
      { resource: 'user', actions: ['read'], scope: 'all' },
      { resource: 'settings', actions: ['read'], scope: 'own' }
    ]
  },

  // 뷰어: 읽기만 가능
  {
    id: 'viewer',
    name: '뷰어',
    description: '문서를 읽을 수 있어요',
    priority: 40,
    isSystem: true,
    permissions: [
      readAccess('file'),
      readAccess('folder'),
      readAccess('comment'),
      { resource: 'comment', actions: ['create'], scope: 'own' },  // 댓글은 작성 가능
      { resource: 'user', actions: ['read'], scope: 'all' }
    ]
  },

  // 게스트: 최소 권한
  {
    id: 'guest',
    name: '게스트',
    description: '공개 문서만 읽을 수 있어요',
    priority: 20,
    isSystem: true,
    permissions: [
      {
        resource: 'file',
        actions: ['read'],
        scope: 'all',
        conditions: [{ field: 'isPublic', operator: 'equals', value: true }]
      },
      {
        resource: 'folder',
        actions: ['read'],
        scope: 'all',
        conditions: [{ field: 'isPublic', operator: 'equals', value: true }]
      }
    ]
  }
];

// 역할 맵 (빠른 조회용)
const roleMap = new Map<Role, RoleDefinition>();
DEFAULT_ROLES.forEach(role => roleMap.set(role.id, role));

// 역할 조회
export function getRole(roleId: Role): RoleDefinition | undefined {
  return roleMap.get(roleId);
}

// 모든 역할 조회
export function getAllRoles(): RoleDefinition[] {
  return [...DEFAULT_ROLES];
}

// 역할의 실제 권한 조회 (상속 포함)
export function getEffectivePermissions(roleId: Role): Permission[] {
  const role = roleMap.get(roleId);
  if (!role) return [];

  const permissions = [...role.permissions];

  // 상속된 권한 추가
  if (role.inherits) {
    const inheritedPermissions = getEffectivePermissions(role.inherits);
    // 중복 제거하며 병합
    for (const inheritedPerm of inheritedPermissions) {
      const existing = permissions.find(p => p.resource === inheritedPerm.resource);
      if (existing) {
        // 더 넓은 범위의 액션으로 병합
        const mergedActions = new Set([...existing.actions, ...inheritedPerm.actions]);
        existing.actions = Array.from(mergedActions) as Action[];
      } else {
        permissions.push({ ...inheritedPerm });
      }
    }
  }

  return permissions;
}

// 역할이 특정 액션을 수행할 수 있는지 확인
export function roleHasPermission(
  roleId: Role,
  resource: ResourceType,
  action: Action
): boolean {
  const permissions = getEffectivePermissions(roleId);
  return permissions.some(p =>
    p.resource === resource && p.actions.includes(action)
  );
}

// 역할 우선순위 비교 (높을수록 상위)
export function compareRolePriority(roleA: Role, roleB: Role): number {
  const a = roleMap.get(roleA);
  const b = roleMap.get(roleB);
  return (a?.priority || 0) - (b?.priority || 0);
}

// 역할이 다른 역할보다 상위인지 확인
export function isHigherRole(roleA: Role, roleB: Role): boolean {
  return compareRolePriority(roleA, roleB) > 0;
}

// 역할 상속 체인 조회
export function getRoleInheritanceChain(roleId: Role): Role[] {
  const chain: Role[] = [roleId];
  let current = roleMap.get(roleId);

  while (current?.inherits) {
    chain.push(current.inherits);
    current = roleMap.get(current.inherits);
  }

  return chain;
}

// 커스텀 역할 저장소
const customRoles = new Map<string, RoleDefinition>();

// 커스텀 역할 추가
export function addCustomRole(role: RoleDefinition): boolean {
  // 시스템 역할 ID는 사용 불가
  if (DEFAULT_ROLES.some(r => r.id === role.id)) {
    return false;
  }

  customRoles.set(role.id, role);
  return true;
}

// 커스텀 역할 제거
export function removeCustomRole(roleId: string): boolean {
  return customRoles.delete(roleId);
}

// 커스텀 역할 조회
export function getCustomRole(roleId: string): RoleDefinition | undefined {
  return customRoles.get(roleId);
}

// 모든 역할 조회 (시스템 + 커스텀)
export function getAllRolesWithCustom(): RoleDefinition[] {
  return [...DEFAULT_ROLES, ...Array.from(customRoles.values())];
}

// 리소스별 기본 권한 템플릿
export const RESOURCE_PERMISSION_TEMPLATES: Record<string, Permission[]> = {
  // 공개 문서
  public: [
    { resource: 'file', actions: ['read'], scope: 'all' },
    { resource: 'folder', actions: ['read'], scope: 'all' },
    { resource: 'comment', actions: ['read', 'create'], scope: 'all' }
  ],

  // 팀 문서
  team: [
    { resource: 'file', actions: ['read', 'update'], scope: 'team' },
    { resource: 'folder', actions: ['read'], scope: 'team' },
    { resource: 'comment', actions: ['read', 'create', 'update', 'delete'], scope: 'team' }
  ],

  // 비공개 문서
  private: [
    { resource: 'file', actions: ['read', 'update', 'delete'], scope: 'own' },
    { resource: 'folder', actions: ['read', 'update', 'delete'], scope: 'own' },
    { resource: 'comment', actions: ['read', 'create', 'update', 'delete'], scope: 'own' }
  ],

  // 읽기 전용
  readonly: [
    { resource: 'file', actions: ['read'], scope: 'all' },
    { resource: 'folder', actions: ['read'], scope: 'all' }
  ]
};

// 권한 템플릿 적용
export function applyPermissionTemplate(templateName: string): Permission[] {
  return RESOURCE_PERMISSION_TEMPLATES[templateName] || [];
}
