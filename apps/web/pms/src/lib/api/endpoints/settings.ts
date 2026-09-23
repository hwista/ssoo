import type { PmsUserSettings, PmsTaskAssignee } from '@ssoo/types';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export const pmsSettingsApi = {
  read: async () => (await apiClient.get<ApiResponse<PmsUserSettings>>('/pms/settings')).data.data!,
  update: async (patch: Partial<PmsUserSettings>) => (
    await apiClient.patch<ApiResponse<PmsUserSettings>>('/pms/settings', patch)
  ).data.data!,
  assignees: async (projectId: string) => (
    await apiClient.get<ApiResponse<PmsTaskAssignee[]>>(`/projects/${projectId}/tasks/assignees`)
  ).data.data ?? [],
};
