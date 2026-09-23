'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PmsUserSettings } from '@ssoo/types';
import { useAuthStore } from '@/stores/auth.store';
import { pmsSettingsApi } from '@/lib/api/endpoints/settings';

export function usePmsSettings() {
  const userId = useAuthStore((state) => state.user?.userId);
  return useQuery({
    queryKey: ['pms-settings', userId],
    queryFn: pmsSettingsApi.read,
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    refetchInterval: 30_000,
  });
}

export function useUpdatePmsSettings() {
  const userId = useAuthStore((state) => state.user?.userId);
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['pms-settings', userId],
    mutationFn: (patch: Partial<PmsUserSettings>) => pmsSettingsApi.update(patch),
    onMutate: () => client.cancelQueries({ queryKey: ['pms-settings', userId] }),
    onSuccess: (settings) => {
      if (useAuthStore.getState().user?.userId === userId) client.setQueryData(['pms-settings', userId], settings);
    },
  });
}

export function useTaskAssignees(projectId: string) {
  const userId = useAuthStore((state) => state.user?.userId);
  return useQuery({
    queryKey: ['task-assignees', userId, projectId],
    queryFn: () => pmsSettingsApi.assignees(projectId),
    enabled: !!userId && !!projectId,
    staleTime: 0,
  });
}
