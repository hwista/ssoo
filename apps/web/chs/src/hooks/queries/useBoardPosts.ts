import { useQuery } from '@tanstack/react-query';
import { postsApi } from '@/lib/api/endpoints/posts';

const boardPostKeys = {
  all: ['chs', 'board-posts'] as const,
  list: (boardId: string, page: number, pageSize: number) =>
    [...boardPostKeys.all, boardId, page, pageSize] as const,
};

export function useBoardPosts(
  boardId: string,
  page = 1,
  pageSize = 10,
  search?: string
) {
  return useQuery({
    queryKey: [...boardPostKeys.list(boardId, page, pageSize), search ?? ''],
    queryFn: () => postsApi.list({ boardId, page, pageSize, search }),
    enabled: !!boardId,
  });
}
