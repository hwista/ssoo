'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CommonPermissionRevision, CommonPermissionTarget, CommonPermissionWrite } from '@ssoo/types/common';
import { commonPermissionsApi, type CommonPermissionParams } from '@/lib/api/endpoints/commonPermissions';

export function useCommonPermissions(kind: CommonPermissionTarget, params: CommonPermissionParams) {
  return useQuery({ queryKey: ['access-ops', 'common-permissions', kind, params], queryFn: () => commonPermissionsApi.list(kind, params) });
}

type Change = { mode: 'create'; value: CommonPermissionWrite }
  | { mode: 'update'; id: string; value: CommonPermissionRevision }
  | { mode: 'revoke'; id: string; value: { reason: string; expectedUpdatedAt: string } };

export function useChangeCommonPermission(kind: CommonPermissionTarget) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (change: Change) => change.mode === 'create' ? commonPermissionsApi.create(kind, change.value)
      : change.mode === 'update' ? commonPermissionsApi.update(kind, change.id, change.value) : commonPermissionsApi.revoke(kind, change.id, change.value),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['access-ops'] }); },
  });
}
