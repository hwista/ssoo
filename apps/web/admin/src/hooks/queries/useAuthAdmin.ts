'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAdminApi, type RegistrationRequestListParams } from '@/lib/api/endpoints/authAdmin';
import type { DecideAuthRegistrationRequest, UpdateAuthProviderSettingsRequest } from '@ssoo/types/common';

export const authAdminKeys = {
  all: ['auth-admin'] as const,
  settings: () => [...authAdminKeys.all, 'settings'] as const,
  roles: () => [...authAdminKeys.all, 'roles'] as const,
  registrationRequests: (params?: RegistrationRequestListParams) =>
    [...authAdminKeys.all, 'registration-requests', params] as const,
};

export function useAuthProviderSettings() {
  return useQuery({
    queryKey: authAdminKeys.settings(),
    queryFn: () => authAdminApi.getSettings(),
    staleTime: 60 * 1000,
  });
}

export function useUpdateAuthProviderSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAuthProviderSettingsRequest) => authAdminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authAdminKeys.settings() });
    },
  });
}

export function useRegistrationRequests(params?: RegistrationRequestListParams) {
  return useQuery({
    queryKey: authAdminKeys.registrationRequests(params),
    queryFn: () => authAdminApi.listRegistrationRequests(params),
    staleTime: 30 * 1000,
  });
}

export function useAssignableRoles() {
  return useQuery({
    queryKey: authAdminKeys.roles(),
    queryFn: () => authAdminApi.listAssignableRoles(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useApproveRegistrationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DecideAuthRegistrationRequest }) =>
      authAdminApi.approveRegistrationRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authAdminKeys.all });
    },
  });
}

export function useRejectRegistrationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DecideAuthRegistrationRequest }) =>
      authAdminApi.rejectRegistrationRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authAdminKeys.all });
    },
  });
}
