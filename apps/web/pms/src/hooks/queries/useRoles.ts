'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/lib/api/endpoints/roles';
import type { UpdateRolePermissionsRequest } from '@/lib/api/endpoints/roles';

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  permissions: (roleCode: string) =>
    [...roleKeys.all, 'permissions', roleCode] as const,
};

export function useRoleList() {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: () => rolesApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoleMenuPermissions(roleCode: string) {
  return useQuery({
    queryKey: roleKeys.permissions(roleCode),
    queryFn: () => rolesApi.getMenuPermissions(roleCode),
    enabled: !!roleCode,
    staleTime: 60 * 1000,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleCode,
      data,
    }: {
      roleCode: string;
      data: UpdateRolePermissionsRequest;
    }) => rolesApi.updateMenuPermissions(roleCode, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: roleKeys.permissions(variables.roleCode),
      });
    },
  });
}
