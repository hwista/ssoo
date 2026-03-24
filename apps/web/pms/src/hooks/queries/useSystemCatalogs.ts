import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemCatalogsApi } from '@/lib/api/endpoints/systemCatalogs';
import type {
  CreateSystemCatalogRequest,
  SystemCatalogFilters,
  UpdateSystemCatalogRequest,
} from '@/lib/api/endpoints/systemCatalogs';

export const systemCatalogKeys = {
  all: ['system-catalogs'] as const,
  lists: () => [...systemCatalogKeys.all, 'list'] as const,
  list: (filters?: SystemCatalogFilters) => [...systemCatalogKeys.lists(), filters] as const,
  tree: () => [...systemCatalogKeys.all, 'tree'] as const,
  details: () => [...systemCatalogKeys.all, 'detail'] as const,
  detail: (id: string) => [...systemCatalogKeys.details(), id] as const,
};

export function useSystemCatalogList(filters?: SystemCatalogFilters) {
  return useQuery({
    queryKey: systemCatalogKeys.list(filters),
    queryFn: () => systemCatalogsApi.list(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSystemCatalogTree() {
  return useQuery({
    queryKey: systemCatalogKeys.tree(),
    queryFn: () => systemCatalogsApi.tree(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSystemCatalogDetail(id: string) {
  return useQuery({
    queryKey: systemCatalogKeys.detail(id),
    queryFn: () => systemCatalogsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSystemCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSystemCatalogRequest) => systemCatalogsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemCatalogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: systemCatalogKeys.tree() });
    },
  });
}

export function useUpdateSystemCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSystemCatalogRequest }) =>
      systemCatalogsApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: systemCatalogKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: systemCatalogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: systemCatalogKeys.tree() });
    },
  });
}

export function useDeactivateSystemCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => systemCatalogsApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemCatalogKeys.lists() });
      queryClient.invalidateQueries({ queryKey: systemCatalogKeys.tree() });
    },
  });
}
