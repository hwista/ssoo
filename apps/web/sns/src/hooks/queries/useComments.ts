import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '@/lib/api/endpoints/comments';

const commentKeys = {
  all: ['sns', 'comments'] as const,
  byPost: (postId: string) => [...commentKeys.all, postId] as const,
};

export function useComments(postId: string, enabled = true) {
  return useQuery({
    queryKey: commentKeys.byPost(postId),
    queryFn: async () => {
      const response = await commentsApi.list(postId);
      if (!response.data.success || !response.data.data) throw new Error('댓글을 불러오지 못했습니다.');
      return response.data.data;
    },
    enabled: !!postId && enabled,
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: { content: string; parentCommentId?: string } }) => {
      const response = await commentsApi.create(postId, data);
      if (!response.data.success || !response.data.data?.id) throw new Error('댓글 등록을 확인하지 못했습니다.');
      return response.data.data;
    },
    onSuccess: (_comment, { postId }) => {
      void qc.invalidateQueries({ queryKey: commentKeys.byPost(postId) });
      void qc.invalidateQueries({ queryKey: ['sns', 'posts'] });
    },
  });
}
