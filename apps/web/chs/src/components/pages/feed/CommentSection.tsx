'use client';

import { forwardRef, useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/common/StateDisplay';
import { useComments } from '@/hooks/queries/useComments';
import type { CommentItem as CommentEntity } from '@/lib/api/endpoints/comments';
import { CommentInput } from './CommentInput';
import { CommentItem } from './CommentItem';

interface CommentTreeItem extends CommentEntity {
  children: CommentTreeItem[];
}

interface CommentSectionProps {
  postId: string;
}

function buildCommentTree(comments: CommentEntity[]): CommentTreeItem[] {
  const treeMap = new Map<string | null, CommentEntity[]>();

  for (const comment of comments) {
    const key = comment.parentCommentId ?? null;
    const siblings = treeMap.get(key) ?? [];
    siblings.push(comment);
    treeMap.set(key, siblings);
  }

  const buildChildren = (parentId: string | null): CommentTreeItem[] => {
    const siblings = treeMap.get(parentId) ?? [];
    return siblings.map((comment) => ({
      ...comment,
      children: buildChildren(comment.id),
    }));
  };

  return buildChildren(null);
}

export const CommentSection = forwardRef<HTMLDivElement, CommentSectionProps>(function CommentSection(
  { postId },
  ref,
) {
  const commentsQuery = useComments(postId);
  const commentTree = useMemo(
    () => buildCommentTree(commentsQuery.data?.data?.data ?? []),
    [commentsQuery.data?.data?.data]
  );

  return (
    <div ref={ref} className="mt-4 space-y-4 border-t pt-4">
      <CommentInput postId={postId} />

      {commentsQuery.isLoading ? (
        <LoadingState message="댓글을 불러오는 중..." />
      ) : commentTree.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<MessageCircle className="h-10 w-10" />}
          title="댓글이 없습니다"
          description="첫 댓글을 남겨 보세요."
        />
      ) : (
        <div className="space-y-4">
          {commentTree.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postId={postId} />
          ))}
        </div>
      )}
    </div>
  );
});

CommentSection.displayName = 'CommentSection';
