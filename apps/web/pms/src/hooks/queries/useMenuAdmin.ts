'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menusAdminApi } from '@/lib/api/endpoints/menusAdmin';
import type { CreateMenuAdminRequest, UpdateMenuAdminRequest } from '@/lib/api/endpoints/menusAdmin';

export const menuAdminKeys = {
  all: ['menuAdmin'] as const,
  lists: () => [...menuAdminKeys.all, 'list'] as const,
};

export function useMenuAdminList() {
  return useQuery({
    queryKey: menuAdminKeys.lists(),
    queryFn: () => menusAdminApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMenuAdminRequest) => menusAdminApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuAdminKeys.lists() });
    },
  });
}

export function useUpdateMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMenuAdminRequest }) =>
      menusAdminApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuAdminKeys.lists() });
    },
  });
}

export function useDeactivateMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menusAdminApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuAdminKeys.lists() });
    },
  });
}
