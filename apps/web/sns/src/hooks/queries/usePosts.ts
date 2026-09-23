import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { postsApi } from '@/lib/api/endpoints/posts';
import { useAuthStore } from '@/stores/auth.store';

interface UseFeedOptions {
  feedType?: string;
  authorUserId?: string;
  limit?: number;
}

const postKeys = {
  all: ['sns', 'posts'] as const,
  feed: (params: UseFeedOptions) => [
    ...postKeys.all,
    'feed',
    params.feedType ?? 'all',
    params.authorUserId ?? 'all-authors',
    params.limit ?? 10,
  ] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
};

function normalizeFeedOptions(feedTypeOrOptions?: string | UseFeedOptions): UseFeedOptions {
  if (typeof feedTypeOrOptions === 'string') {
    return { feedType: feedTypeOrOptions };
  }

  return feedTypeOrOptions ?? {};
}

export function useFeed(feedTypeOrOptions?: string | UseFeedOptions, enabled = true) {
  const params = normalizeFeedOptions(feedTypeOrOptions);

  return useInfiniteQuery({
    queryKey: postKeys.feed(params),
    queryFn: ({ pageParam }) => postsApi.feed({
      cursor: pageParam as string | undefined,
      limit: params.limit ?? 10,
      feedType: params.feedType,
      authorUserId: params.authorUserId,
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data?.data?.nextCursor ?? undefined,
    enabled,
  });
}

export function useProfileFeed(userId: string, enabled = true) {
  return useFeed({ authorUserId: userId }, enabled && Boolean(userId));
}

export function usePostDetail(id: string) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => postsApi.detail(id),
    enabled: !!id,
  });
}

export function useSharedPost(id: string, enabled: boolean) {
  const userId = useAuthStore((state) => state.user?.userId);
  return useQuery({
    queryKey: [...postKeys.all, 'shared', userId, id],
    queryFn: async ({ signal }) => {
      const response = await postsApi.sharedPost(id, signal);
      if (!response.data.success || !response.data.data) throw new Error('게시물을 불러오지 못했습니다.');
      return response.data.data;
    },
    enabled: enabled && Boolean(userId) && Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export function usePostList(
  params?: Parameters<typeof postsApi.list>[0],
  enabled = true,
) {
  return useQuery({
    queryKey: postKeys.list({
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      boardId: params?.boardId ?? '',
      search: params?.search ?? '',
    }),
    queryFn: () => postsApi.list(params),
    enabled,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: postKeys.all }); },
  });
}

export function useCreateImagePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postsApi.createWithImages,
    onSuccess: () => { qc.invalidateQueries({ queryKey: postKeys.all }); },
  });
}

export function usePostImage(postId: string, imageId: string) {
  const userId = useAuthStore((state) => state.user?.userId);
  return useQuery({
    queryKey: [...postKeys.all, 'image', userId, postId, imageId],
    queryFn: async ({ signal }) => (await postsApi.image(postId, imageId, signal)).data,
    enabled: Boolean(userId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
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
