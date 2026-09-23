import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boardsApi } from '@/lib/api/endpoints/boards';

const boardKeys = {
  all: ['sns', 'boards'] as const,
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

export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof boardsApi.create>[0]) => {
      const response = await boardsApi.create(input);
      const board = response.data.data;
      if (!response.data.success || !board?.id) {
        throw new Error('생성 결과를 확인하지 못했습니다. 게시판 목록을 확인해 주세요.');
      }
      return board;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}
