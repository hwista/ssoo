'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { codesApi } from '@/lib/api/endpoints/codes';
import type { CodeMutationRequest, CreateCodeRequest, UpdateCodeRequest } from '@/lib/api/endpoints/codes';

export const codeKeys = {
  all: ['codes'] as const,
  groups: () => [...codeKeys.all, 'groups'] as const,
  byGroup: (codeGroup: string) => [...codeKeys.all, 'group', codeGroup] as const,
};

export function useCodeGroups() {
  return useQuery({
    queryKey: codeKeys.groups(),
    queryFn: () => codesApi.getGroups(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCodesByGroup(codeGroup: string) {
  return useQuery({
    queryKey: codeKeys.byGroup(codeGroup),
    queryFn: () => codesApi.getByGroup(codeGroup),
    enabled: !!codeGroup,
    staleTime: 5 * 60 * 1000,
  });
}

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

export function useDeactivateCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CodeMutationRequest }) => codesApi.deactivate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: codeKeys.all });
    },
  });
}

export function useRemoveCodePermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CodeMutationRequest }) => codesApi.removePermanently(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: codeKeys.all });
    },
  });
}

export function useCodeUsage(id?: string) {
  return useQuery({ queryKey: [...codeKeys.all, 'usage', id], queryFn: () => codesApi.usage(id!), enabled: !!id });
}
