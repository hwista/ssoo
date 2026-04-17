import { useQuery } from '@tanstack/react-query';
import { boardsApi } from '@/lib/api/endpoints/boards';

const boardKeys = {
  all: ['cms', 'boards'] as const,
  detail: (id: string) => [...boardKeys.all, id] as const,
};

export function useBoards(enabled = true) {
  return useQuery({
    queryKey: boardKeys.all,
    queryFn: () => boardsApi.list(),
    enabled,
  });
}

export function useBoardDetail(id: string) {
  return useQuery({
    queryKey: boardKeys.detail(id),
    queryFn: () => boardsApi.detail(id),
    enabled: !!id,
  });
}
