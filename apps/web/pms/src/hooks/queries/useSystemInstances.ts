'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemInstancesApi } from '@/lib/api/endpoints/systemInstances';
import type {
  CreateSystemInstanceRequest,
  SystemInstanceFilters,
  UpdateSystemInstanceRequest,
} from '@/lib/api/endpoints/systemInstances';

export const systemInstanceKeys = {
  all: ['system-instances'] as const,
  lists: () => [...systemInstanceKeys.all, 'list'] as const,
  list: (filters?: SystemInstanceFilters) => [...systemInstanceKeys.lists(), filters] as const,
  tree: (customerId?: string, siteId?: string) => [...systemInstanceKeys.all, 'tree', customerId ?? 'all', siteId ?? 'all'] as const,
  details: () => [...systemInstanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...systemInstanceKeys.details(), id] as const,
};

export function useSystemInstanceList(filters?: SystemInstanceFilters) {
  return useQuery({
    queryKey: systemInstanceKeys.list(filters),
    queryFn: () => systemInstancesApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSystemInstanceTree(customerId?: string, siteId?: string) {
  return useQuery({
    queryKey: systemInstanceKeys.tree(customerId, siteId),
    queryFn: () => systemInstancesApi.tree(customerId, siteId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSystemInstanceDetail(id: string) {
  return useQuery({
    queryKey: systemInstanceKeys.detail(id),
    queryFn: () => systemInstancesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSystemInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSystemInstanceRequest) => systemInstancesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemInstanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: systemInstanceKeys.all });
    },
  });
}

export function useUpdateSystemInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSystemInstanceRequest }) =>
      systemInstancesApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: systemInstanceKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: systemInstanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: systemInstanceKeys.all });
    },
  });
}

export function useDeactivateSystemInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => systemInstancesApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemInstanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: systemInstanceKeys.all });
    },
  });
}
