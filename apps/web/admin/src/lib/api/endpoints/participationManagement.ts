import type { CreateMembership, CreateServiceGrant, ManagedMembership, ManagedServiceGrant, ParticipationFilter, ParticipationPage, ParticipationRevision, TransferMembership, UpdateMembership, UpdateServiceGrant } from '@ssoo/types/common';
import { apiClient } from '../client';
import type { PlatformAccessDiagnosis } from '@ssoo/types/common';
import type { ApiResponse } from '../types';

const root = '/access/participation';
export const participationManagementApi = {
  diagnose: (id: string) => apiClient.get<ApiResponse<PlatformAccessDiagnosis>>(`${root}/diagnose/${id}`).then((r) => r.data.data!),
  memberships: (params: ParticipationFilter) => apiClient.get<ApiResponse<ParticipationPage<ManagedMembership>>>(`${root}/memberships`, { params }).then((r) => r.data.data!),
  createMembership: (data: CreateMembership) => apiClient.post(`${root}/memberships`, data),
  updateMembership: (id: string, data: UpdateMembership) => apiClient.put(`${root}/memberships/${id}`, data),
  endMembership: (id: string, data: ParticipationRevision) => apiClient.post(`${root}/memberships/${id}/end`, data),
  transferMembership: (id: string, data: TransferMembership) => apiClient.post(`${root}/memberships/${id}/transfer`, data),
  grants: (params: ParticipationFilter) => apiClient.get<ApiResponse<ParticipationPage<ManagedServiceGrant>>>(`${root}/grants`, { params }).then((r) => r.data.data!),
  createGrant: (data: CreateServiceGrant) => apiClient.post(`${root}/grants`, data),
  updateGrant: (id: string, data: UpdateServiceGrant) => apiClient.put(`${root}/grants/${id}`, data),
  revokeGrant: (id: string, data: ParticipationRevision) => apiClient.post(`${root}/grants/${id}/revoke`, data),
};
