import { useQuery } from '@tanstack/react-query';
import { boardsApi } from '@/lib/api/endpoints/boards';

const boardKeys = {
  all: ['chs', 'boards'] as const,
  detail: (id: string) => [...boardKeys.all, id] as const,
};

export function useBoards() {
  return useQuery({
    queryKey: boardKeys.all,
    queryFn: () => boardsApi.list(),
  });
}

export function useBoardDetail(id: string) {
  return useQuery({
    queryKey: boardKeys.detail(id),
    queryFn: () => boardsApi.detail(id),
    enabled: !!id,
  });
}
