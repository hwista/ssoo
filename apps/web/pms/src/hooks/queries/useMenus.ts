'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { menusApi } from '@/lib/api';
import type { MyMenuResponse } from '@/lib/api/endpoints/menus';
import type { ApiResponse } from '@/lib/api/types';

/**
 * Query Keys
 */
export const menuKeys = {
  all: ['menus'] as const,
  my: () => [...menuKeys.all, 'my'] as const,
  favorites: () => [...menuKeys.all, 'favorites'] as const,
};

/**
 * 내 메뉴 조회 (트리 + 즐겨찾기)
 */
export function useMyMenus(
  options?: Omit<UseQueryOptions<ApiResponse<MyMenuResponse>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: menuKeys.my(),
    queryFn: () => menusApi.getMyMenus(),
    staleTime: 10 * 60 * 1000, // 10분 (메뉴는 자주 안 변함)
    ...options,
  });
}

/**
 * 즐겨찾기 추가
 */
export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (menuId: string) => menusApi.addFavorite(menuId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.my() });
    },
  });
}

/**
 * 즐겨찾기 삭제
 */
export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (menuId: string) => menusApi.removeFavorite(menuId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.my() });
    },
  });
}
