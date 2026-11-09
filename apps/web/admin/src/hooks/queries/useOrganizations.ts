'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlatformAccess } from '@ssoo/web-auth';
import {
  organizationsApi,
  type CreateOrganizationRequest,
  type UpdateOrganizationRequest,
} from '@/lib/api/endpoints/organizations';

export const organizationKeys = {
  all: ['organizations'] as const,
  list: (includeInactive: boolean) => [...organizationKeys.all, 'list', includeInactive] as const,
};

export function useOrganizationList(includeInactive: boolean) {
  return useQuery({
    queryKey: organizationKeys.list(includeInactive),
    queryFn: () => organizationsApi.list(includeInactive),
    staleTime: 30 * 1000,
  });
}

function useOrganizationMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  const access = usePlatformAccess();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
        access?.refresh(),
      ]);
    },
  });
}

export function useCreateOrganization() {
  return useOrganizationMutation((data: CreateOrganizationRequest) => organizationsApi.create(data));
}

export function useUpdateOrganization() {
  return useOrganizationMutation(({ id, data }: { id: string; data: UpdateOrganizationRequest }) => (
    organizationsApi.update(id, data)
  ));
}

export function useDeactivateOrganization() {
  return useOrganizationMutation((id: string) => organizationsApi.deactivate(id));
}

export function useOrganizationImpact(id: string) {
  return useQuery({ queryKey: [...organizationKeys.all, 'impact', id], queryFn: () => organizationsApi.impact(id), staleTime: 0 });
}
