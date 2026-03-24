import type { DocumentComment } from '@/types';

export function formatCommentDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const resolved = typeof date === 'string' ? new Date(date) : date;
  return resolved.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface CommentThread {
  root: DocumentComment;
  replies: DocumentComment[];
}

export function findThreadRoot(commentId: string, commentMap: Map<string, DocumentComment>): string {
  const comment = commentMap.get(commentId);
  if (!comment) return commentId;
  if (!comment.parentId) return commentId;
  if (!commentMap.has(comment.parentId)) return commentId;
  return findThreadRoot(comment.parentId, commentMap);
}

export function buildCommentThreads(comments: DocumentComment[]): CommentThread[] {
  const commentMap = new Map(comments.map((comment) => [comment.id, comment]));
  const rootComments: DocumentComment[] = [];
  const replyMap = new Map<string, DocumentComment[]>();

  for (const comment of comments) {
    const rootId = findThreadRoot(comment.id, commentMap);
    if (rootId === comment.id) {
      rootComments.push(comment);
    } else {
      const list = replyMap.get(rootId) ?? [];
      list.push(comment);
      replyMap.set(rootId, list);
    }
  }

  return rootComments.map((root) => ({
    root,
    replies: (replyMap.get(root.id) ?? []).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  }));
}
