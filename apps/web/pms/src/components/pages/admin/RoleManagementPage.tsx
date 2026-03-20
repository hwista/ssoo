'use client';

import { useState, useCallback, useRef } from 'react';
import { UserCog, Save, ChevronRight, Shield, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/common/StateDisplay';
import {
  useRoleList,
  useRoleMenuPermissions,
  useUpdateRolePermissions,
} from '@/hooks/queries/useRoles';
import type { RoleMenuPermission } from '@/lib/api/endpoints/roles';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

type AccessType = 'full' | 'read' | 'none';

interface MenuTreeNode extends RoleMenuPermission {
  children: MenuTreeNode[];
}

function buildMenuTree(menus: RoleMenuPermission[]): MenuTreeNode[] {
  const nodeMap = new Map<string, MenuTreeNode>();
  const roots: MenuTreeNode[] = [];

  for (const menu of menus) {
    nodeMap.set(menu.menuId, { ...menu, children: [] });
  }

  for (const node of nodeMap.values()) {
    if (node.parentMenuId && nodeMap.has(node.parentMenuId)) {
      nodeMap.get(node.parentMenuId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortChildren = (nodes: MenuTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const n of nodes) {
      if (n.children.length > 0) sortChildren(n.children);
    }
  };
  sortChildren(roots);

  return roots;
}

const ACCESS_LABELS: Record<AccessType, string> = {
  full: '전체',
  read: '읽기',
  none: '없음',
};

const ACCESS_ICONS: Record<AccessType, typeof ShieldCheck> = {
  full: ShieldCheck,
  read: Shield,
  none: ShieldX,
};

function MenuRow({
  node,
  localPermissions,
  onChangeAccess,
  depth,
}: {
  node: MenuTreeNode;
  localPermissions: Map<string, AccessType>;
  onChangeAccess: (menuId: string, accessType: AccessType) => void;
  depth: number;
}) {
  const currentAccess = localPermissions.get(node.menuId) ?? node.accessType;
  const Icon = ACCESS_ICONS[currentAccess];
  const hasChildren = node.children.length > 0;

  return (
    <>
      <tr className="border-b hover:bg-gray-50 transition-colors">
        <td className="px-4 py-2.5">
          <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
            {hasChildren && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mr-1.5 rotate-90" />
            )}
            {!hasChildren && <span className="w-5 mr-1.5" />}
            <Icon className={cn('h-4 w-4 mr-2', {
              'text-green-600': currentAccess === 'full',
              'text-blue-500': currentAccess === 'read',
              'text-gray-400': currentAccess === 'none',
            })} />
            <span className={cn('text-sm', hasChildren && 'font-medium')}>
              {node.menuName}
            </span>
            {node.isAdminMenu && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                관리자
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
          {node.menuPath ?? '-'}
        </td>
        <td className="px-4 py-2.5 w-36">
          <Select
            value={currentAccess}
            onValueChange={(val: AccessType) => onChangeAccess(node.menuId, val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">{ACCESS_LABELS.full}</SelectItem>
              <SelectItem value="read">{ACCESS_LABELS.read}</SelectItem>
              <SelectItem value="none">{ACCESS_LABELS.none}</SelectItem>
            </SelectContent>
          </Select>
        </td>
      </tr>
      {node.children.map((child) => (
        <MenuRow
          key={child.menuId}
          node={child}
          localPermissions={localPermissions}
          onChangeAccess={onChangeAccess}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

export function RoleManagementPage() {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [localPermissions, setLocalPermissions] = useState<Map<string, AccessType>>(new Map());
  const originalPermissionsRef = useRef<Map<string, AccessType>>(new Map());

  const {
    data: rolesResponse,
    isLoading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useRoleList();

  const {
    data: permissionsResponse,
    isLoading: permissionsLoading,
  } = useRoleMenuPermissions(selectedRole);

  const updateMutation = useUpdateRolePermissions();

  const roles = rolesResponse?.data ?? [];
  const permissions = permissionsResponse?.data ?? [];
  const menuTree = buildMenuTree(permissions);

  const isDirty = localPermissions.size > 0;

  const handleRoleClick = useCallback((roleCode: string) => {
    setSelectedRole(roleCode);
    setLocalPermissions(new Map());
    originalPermissionsRef.current = new Map();
  }, []);

  // Sync original permissions when data loads
  const prevPermissionsRef = useRef<RoleMenuPermission[]>([]);
  if (permissions !== prevPermissionsRef.current && permissions.length > 0) {
    prevPermissionsRef.current = permissions;
    const original = new Map<string, AccessType>();
    for (const p of permissions) {
      original.set(p.menuId, p.accessType);
    }
    originalPermissionsRef.current = original;
  }

  const handleChangeAccess = useCallback(
    (menuId: string, accessType: AccessType) => {
      setLocalPermissions((prev) => {
        const next = new Map(prev);
        const original = originalPermissionsRef.current.get(menuId);
        if (original === accessType) {
          next.delete(menuId);
        } else {
          next.set(menuId, accessType);
        }
        return next;
      });
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!selectedRole || localPermissions.size === 0) return;

    const changedPermissions = Array.from(localPermissions.entries()).map(
      ([menuId, accessType]) => ({ menuId, accessType }),
    );

    updateMutation.mutate(
      { roleCode: selectedRole, data: { permissions: changedPermissions } },
      {
        onSuccess: () => {
          toast.success('권한이 저장되었습니다.');
          setLocalPermissions(new Map());
        },
        onError: () => {
          toast.error('권한 저장에 실패했습니다.');
        },
      },
    );
  }, [selectedRole, localPermissions, updateMutation]);

  if (rolesLoading) {
    return <LoadingState message="역할 목록을 불러오는 중..." fullHeight />;
  }

  if (rolesError) {
    return <ErrorState error={rolesError.message} onRetry={() => refetchRoles()} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">역할 관리</h1>
        </div>
        {selectedRole && isDirty && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {updateMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        )}
      </div>

      {/* Content: 2-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Role List */}
        <div className="w-72 border-r bg-gray-50 flex flex-col">
          <div className="px-4 py-3 border-b bg-white">
            <h2 className="text-sm font-medium text-muted-foreground">역할 목록</h2>
          </div>
          <div className="flex-1 overflow-auto">
            {roles.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">등록된 역할이 없습니다.</p>
            ) : (
              <ul className="py-1">
                {roles.map((role) => (
                  <li key={role.codeValue}>
                    <button
                      onClick={() => handleRoleClick(role.codeValue)}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors',
                        selectedRole === role.codeValue
                          ? 'bg-ssoo-primary/10 text-ssoo-primary font-medium'
                          : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="truncate">{role.displayNameKo}</span>
                        <span className={cn(
                          'text-xs mt-0.5',
                          selectedRole === role.codeValue
                            ? 'text-ssoo-primary/70'
                            : 'text-gray-400',
                        )}>
                          {role.codeValue}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Panel: Menu Permissions */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedRole ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">좌측에서 역할을 선택하세요.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
                <h2 className="text-sm font-semibold">
                  {roles.find((r) => r.codeValue === selectedRole)?.displayNameKo ?? selectedRole}
                  {' '}메뉴 권한
                </h2>
                {isDirty && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    {localPermissions.size}건 변경됨
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto">
                {permissionsLoading ? (
                  <LoadingState message="메뉴 권한을 불러오는 중..." />
                ) : permissions.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">등록된 메뉴가 없습니다.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          메뉴명
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          경로
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36">
                          접근 권한
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuTree.map((node) => (
                        <MenuRow
                          key={node.menuId}
                          node={node}
                          localPermissions={localPermissions}
                          onChangeAccess={handleChangeAccess}
                          depth={0}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
