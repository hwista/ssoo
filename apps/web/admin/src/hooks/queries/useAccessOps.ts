'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accessOpsApi } from '@/lib/api/endpoints/accessOps';
import type { InspectAccessParams, ListExceptionsParams } from '@/lib/api/endpoints/accessOps';

const ACCESS_OPS_ALL = ['access-ops'] as const;

export const accessOpsKeys = {
  all: ACCESS_OPS_ALL,
  catalog: () => [...ACCESS_OPS_ALL, 'catalog'] as const,
  inspect: (params?: InspectAccessParams | null) =>
    [...ACCESS_OPS_ALL, 'inspect', params] as const,
  exceptions: (params?: ListExceptionsParams | null) =>
    [...ACCESS_OPS_ALL, 'exceptions', params] as const,
  roles: () => [...ACCESS_OPS_ALL, 'roles'] as const,
  audit: (limit: number) => [...ACCESS_OPS_ALL, 'audit', limit] as const,
};

export function usePermissionCatalog(enabled: boolean = true) {
  return useQuery({
    queryKey: accessOpsKeys.catalog(),
    queryFn: () => accessOpsApi.catalog(),
    enabled,
  });
}

export function useInspectAccess(
  params?: InspectAccessParams | null,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: accessOpsKeys.inspect(params),
    queryFn: () => accessOpsApi.inspect(params ?? {}),
    enabled: enabled && !!(params?.userId || params?.loginId),
  });
}

export function useListExceptions(
  params?: ListExceptionsParams | null,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: accessOpsKeys.exceptions(params),
    queryFn: () => accessOpsApi.listExceptions(params ?? {}),
    enabled,
  });
}

export function useRolePermissions(enabled: boolean = true) {
  return useQuery({
    queryKey: accessOpsKeys.roles(),
    queryFn: () => accessOpsApi.listRoles(),
    enabled,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleCode, permissionCodes, reason, expectedRevision }: { roleCode: string; permissionCodes: string[]; reason: string; expectedRevision: string }) =>
      accessOpsApi.updateRolePermissions(roleCode, permissionCodes, reason, expectedRevision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessOpsKeys.all });
      queryClient.invalidateQueries({ queryKey: accessOpsKeys.audit(100) });
    },
  });
}

export function useAccessAudit(limit = 100, enabled: boolean = true) {
  return useQuery({
    queryKey: accessOpsKeys.audit(limit),
    queryFn: () => accessOpsApi.listAudit(limit),
    enabled,
  });
}
