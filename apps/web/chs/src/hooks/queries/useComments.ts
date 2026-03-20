import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '@/lib/api/endpoints/comments';

const commentKeys = {
  all: ['chs', 'comments'] as const,
  byPost: (postId: string) => [...commentKeys.all, postId] as const,
};

export function useComments(postId: string) {
  return useQuery({
    queryKey: commentKeys.byPost(postId),
    queryFn: () => commentsApi.list(postId),
    enabled: !!postId,
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: { content: string; parentCommentId?: string } }) =>
      commentsApi.create(postId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: commentKeys.all }); },
  });
}
