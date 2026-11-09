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
  userAccount: (userId: string) => [...authAdminKeys.all, 'user-account', userId] as const,
  emailDelivery: () => [...authAdminKeys.all, 'email-delivery'] as const,
};

export function useAuthProviderSettings() {
  return useQuery({
    queryKey: authAdminKeys.settings(),
    queryFn: () => authAdminApi.getSettings(),
    staleTime: 60 * 1000,
  });
}

export function useUserAccountOperations(userId: string | null) {
  return useQuery({
    queryKey: authAdminKeys.userAccount(userId ?? ''),
    queryFn: () => authAdminApi.getUserAccount(userId!),
    enabled: Boolean(userId),
    staleTime: 0,
  });
}

function useAccountOperationMutation<TResult>(
  operation: (userId: string) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: operation,
    onSuccess: (_result, userId) => {
      queryClient.invalidateQueries({ queryKey: authAdminKeys.userAccount(userId) });
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
}

export function useRevokeUserSessions() {
  return useAccountOperationMutation((userId) => authAdminApi.revokeUserSessions(userId));
}

export function useUnlockUserAccount() {
  return useAccountOperationMutation((userId) => authAdminApi.unlockUser(userId));
}

export function useRequestUserPasswordReset() {
  return useAccountOperationMutation((userId) => authAdminApi.requestUserPasswordReset(userId));
}

export function useUpdateAuthProviderSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAuthProviderSettingsRequest) => authAdminApi.updateSettings(data),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: authAdminKeys.settings() });
    },
  });
}

export function useEmailDeliveryStatus() {
  return useQuery({
    queryKey: authAdminKeys.emailDelivery(),
    queryFn: () => authAdminApi.getEmailDeliveryStatus(),
    refetchInterval: 30_000,
  });
}

function useEmailDeliveryMutation(operation: () => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: operation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authAdminKeys.emailDelivery() });
      queryClient.invalidateQueries({ queryKey: [...authAdminKeys.all, 'email-messages'] });
    },
  });
}

export function useRunEmailDelivery() {
  return useEmailDeliveryMutation(() => authAdminApi.runEmailDelivery());
}

export function useRetryEmailDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, reason, expectedUpdatedAt }: { messageId: string; reason: string; expectedUpdatedAt: string }) => authAdminApi.retryEmailDelivery(messageId, reason, expectedUpdatedAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authAdminKeys.emailDelivery() });
      queryClient.invalidateQueries({ queryKey: [...authAdminKeys.all, 'email-messages'] });
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

export function useEmailMessages(params: { page: number; pageSize: number; status?: string }) {
  return useQuery({ queryKey: [...authAdminKeys.all, 'email-messages', params], queryFn: () => authAdminApi.listEmailMessages(params), staleTime: 0 });
}
