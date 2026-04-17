import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { postsApi } from '@/lib/api/endpoints/posts';

const postKeys = {
  all: ['cms', 'posts'] as const,
  feed: (feedType?: string) => [...postKeys.all, 'feed', feedType] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
};

export function useFeed(feedType?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: postKeys.feed(feedType),
    queryFn: ({ pageParam }) => postsApi.feed({ cursor: pageParam as string | undefined, limit: 10, feedType }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data?.data?.nextCursor ?? undefined,
    enabled,
  });
}

export function usePostDetail(id: string) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => postsApi.detail(id),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: postKeys.all }); },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: postKeys.all }); },
  });
}

export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) =>
      isLiked ? postsApi.removeReaction(postId) : postsApi.addReaction(postId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: postKeys.all }); },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, isBookmarked }: { postId: string; isBookmarked: boolean }) =>
      isBookmarked ? postsApi.removeBookmark(postId) : postsApi.addBookmark(postId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: postKeys.all }); },
  });
}
