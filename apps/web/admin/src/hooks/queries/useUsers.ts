'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/endpoints/users';
import type {
  UserListParams,
  CreateUserRequest,
  UpdateUserRequest,
} from '@/lib/api/endpoints/users';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: UserListParams) => [...userKeys.lists(), params] as const,
};

export function useUserList(params?: UserListParams, allPages = false) {
  return useQuery({
    queryKey: [...userKeys.list(params), { allPages }],
    queryFn: async ({ signal }) => {
      const first = await usersApi.list(params, signal);
      if (!allPages) return first;
      const users = [...first.data];
      let nextPage = first.meta.page + 1;
      while (users.length < first.meta.total) {
        const next = await usersApi.list({ ...params, page: nextPage++ }, signal);
        if (!next.data.length) throw new Error('사용자 전체 목록을 불러오지 못했습니다. 다시 조회해 주세요.');
        users.push(...next.data);
      }
      return { ...first, data: users };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
