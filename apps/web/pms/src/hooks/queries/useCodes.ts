'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { codesApi } from '@/lib/api/endpoints/codes';
import type { CreateCodeRequest, UpdateCodeRequest } from '@/lib/api/endpoints/codes';

/**
 * Query Keys
 */
export const codeKeys = {
  all: ['codes'] as const,
  groups: () => [...codeKeys.all, 'groups'] as const,
  byGroup: (codeGroup: string) => [...codeKeys.all, 'group', codeGroup] as const,
};

/**
 * 코드 그룹 목록 조회
 */
export function useCodeGroups() {
  return useQuery({
    queryKey: codeKeys.groups(),
    queryFn: () => codesApi.getGroups(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 그룹별 코드 목록 조회
 */
export function useCodesByGroup(codeGroup: string) {
  return useQuery({
    queryKey: codeKeys.byGroup(codeGroup),
    queryFn: () => codesApi.getByGroup(codeGroup),
    enabled: !!codeGroup,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 코드 생성
 */
export function useCreateCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCodeRequest) => codesApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: codeKeys.groups() });
      queryClient.invalidateQueries({ queryKey: codeKeys.byGroup(variables.codeGroup) });
    },
  });
}

/**
 * 코드 수정
 */
export function useUpdateCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCodeRequest }) =>
      codesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: codeKeys.all });
    },
  });
}

/**
 * 코드 비활성화
 */
export function useDeactivateCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => codesApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: codeKeys.all });
    },
  });
}
