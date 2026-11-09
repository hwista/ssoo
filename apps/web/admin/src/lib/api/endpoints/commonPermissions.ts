import type { CommonPermissionRevision, CommonPermissionTarget, CommonPermissionWrite, ManagedCommonPermission, ParticipationPage } from '@ssoo/types/common';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface CommonPermissionParams { targetId?: string; page: number; status: 'all' | 'active' | 'inactive' }
const path = (kind: CommonPermissionTarget) => `/access/ops/common-permissions/${kind}`;
export const commonPermissionsApi = {
  async list(kind: CommonPermissionTarget, params: CommonPermissionParams) {
    const response = await apiClient.get<ApiResponse<ParticipationPage<ManagedCommonPermission>>>(path(kind), { params });
    if (!response.data.data) throw new Error('공통 권한 응답이 비어 있습니다.');
    return response.data.data;
  },
  async create(kind: CommonPermissionTarget, value: CommonPermissionWrite) {
    await apiClient.post(path(kind), value);
  },
  async update(kind: CommonPermissionTarget, id: string, value: CommonPermissionRevision) {
    await apiClient.put(`${path(kind)}/${id}`, value);
  },
  async revoke(kind: CommonPermissionTarget, id: string, value: { reason: string; expectedUpdatedAt: string }) {
    await apiClient.post(`${path(kind)}/${id}/revoke`, value);
  },
};
