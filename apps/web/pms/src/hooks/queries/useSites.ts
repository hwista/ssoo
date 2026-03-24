import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sitesApi } from '@/lib/api/endpoints/sites';
import type { CreateSiteRequest, SiteFilters, UpdateSiteRequest } from '@/lib/api/endpoints/sites';

export const siteKeys = {
  all: ['sites'] as const,
  lists: () => [...siteKeys.all, 'list'] as const,
  list: (filters?: SiteFilters) => [...siteKeys.lists(), filters] as const,
  tree: (customerId?: string) => [...siteKeys.all, 'tree', customerId ?? 'all'] as const,
  details: () => [...siteKeys.all, 'detail'] as const,
  detail: (id: string) => [...siteKeys.details(), id] as const,
};

export function useSiteList(filters?: SiteFilters) {
  return useQuery({
    queryKey: siteKeys.list(filters),
    queryFn: () => sitesApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSiteTree(customerId?: string) {
  return useQuery({
    queryKey: siteKeys.tree(customerId),
    queryFn: () => sitesApi.tree(customerId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSiteDetail(id: string) {
  return useQuery({
    queryKey: siteKeys.detail(id),
    queryFn: () => sitesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSiteRequest) => sitesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSiteRequest }) =>
      sitesApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });
}

export function useDeactivateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sitesApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });
}
