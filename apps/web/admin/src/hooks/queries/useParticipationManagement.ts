'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlatformAccess } from '@ssoo/web-auth';
import type { CreateMembership, CreateServiceGrant, ParticipationFilter, ParticipationRevision, TransferMembership, UpdateMembership, UpdateServiceGrant } from '@ssoo/types/common';
import { participationManagementApi as api } from '@/lib/api/endpoints/participationManagement';

export function usePlatformAccessDiagnosis(userId: string) {
  return useQuery({ queryKey: ['participation-management', 'diagnose', userId], queryFn: () => api.diagnose(userId), enabled: !!userId });
}

export function useManagedMemberships(filter: ParticipationFilter) {
  return useQuery({ queryKey: ['participation-management', 'memberships', filter], queryFn: () => api.memberships(filter) });
}

export function useManagedServiceGrants(filter: ParticipationFilter) {
  return useQuery({ queryKey: ['participation-management', 'grants', filter], queryFn: () => api.grants(filter) });
}

export type ParticipationCommand =
  | { kind: 'membership.create'; data: CreateMembership }
  | { kind: 'membership.update'; id: string; data: UpdateMembership }
  | { kind: 'membership.end'; id: string; data: ParticipationRevision }
  | { kind: 'membership.transfer'; id: string; data: TransferMembership }
  | { kind: 'grant.create'; data: CreateServiceGrant }
  | { kind: 'grant.update'; id: string; data: UpdateServiceGrant }
  | { kind: 'grant.revoke'; id: string; data: ParticipationRevision };

export function useParticipationCommand() {
  const queries = useQueryClient();
  const access = usePlatformAccess();
  return useMutation({ mutationFn: async (command: ParticipationCommand) => {
    switch (command.kind) {
      case 'membership.create': return api.createMembership(command.data);
      case 'membership.update': return api.updateMembership(command.id, command.data);
      case 'membership.end': return api.endMembership(command.id, command.data);
      case 'membership.transfer': return api.transferMembership(command.id, command.data);
      case 'grant.create': return api.createGrant(command.data);
      case 'grant.update': return api.updateGrant(command.id, command.data);
      case 'grant.revoke': return api.revokeGrant(command.id, command.data);
    }
  }, onSuccess: async () => {
    await Promise.all([
      ...['participation-management', 'organizations', 'users', 'participation', 'access', 'access-ops'].map((key) => queries.invalidateQueries({ queryKey: [key] })),
      access?.refresh(),
    ]);
  } });
}
