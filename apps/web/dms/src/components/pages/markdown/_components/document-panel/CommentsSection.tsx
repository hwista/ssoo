'use client';

import * as React from 'react';
import { MessageSquare, Reply, X } from 'lucide-react';
import type { DocumentComment } from '@/types';
import { UserAvatar } from '@/components/common';
import { CollapsibleSection } from '@/components/templates/page-frame/panel/CollapsibleSection';
import { cn } from '@/lib/utils';

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

interface CommentThread {
  root: DocumentComment;
  replies: DocumentComment[];
}

/** parentId 체인을 따라가 스레드 루트(최상위) ID를 반환 */
function findThreadRoot(commentId: string, commentMap: Map<string, DocumentComment>): string {
  const comment = commentMap.get(commentId);
  if (!comment) return commentId;
  if (!comment.parentId) return commentId;
  if (!commentMap.has(comment.parentId)) return commentId; // orphan → 자기가 루트
  return findThreadRoot(comment.parentId, commentMap);
}

function buildThreads(comments: DocumentComment[]): CommentThread[] {
  const commentMap = new Map(comments.map((c) => [c.id, c]));
  const rootComments: DocumentComment[] = [];
  const replyMap = new Map<string, DocumentComment[]>();
  const rootIds = new Set<string>();

  for (const c of comments) {
    const rootId = findThreadRoot(c.id, commentMap);
    if (rootId === c.id) {
      rootComments.push(c);
      rootIds.add(c.id);
    } else {
      const list = replyMap.get(rootId) ?? [];
      list.push(c);
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

function CommentItem({
  comment,
  isReply,
  isNew,
  isDeleted,
  editable,
  mentionAuthor,
  onDelete,
  onRestore,
  onReply,
}: {
  comment: DocumentComment;
  isReply?: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
  editable?: boolean;
  mentionAuthor?: string;
  onDelete?: (id: string) => void;
  onRestore?: (comment: DocumentComment) => void;
  onReply?: (comment: DocumentComment) => void;
}) {
  // 방금 삭제 (pendingDeletes) → soft-delete UI 우선
  // 이미 저장된 삭제 (deletedAt) → 톰스톤
  const isTombstone = !!comment.deletedAt && !isDeleted;

  if (isTombstone) {
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-md px-1.5 py-1.5 text-caption text-ssoo-primary/40',
        isReply && 'ml-6',
      )}>
        <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-gray-100">
          <X className="h-3 w-3 text-gray-400" />
        </div>
        <span className="italic">삭제된 댓글입니다.</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2 rounded-md px-1.5 py-1.5 text-caption transition-colors',
        isReply && 'ml-6',
        isDeleted
          ? 'border border-destructive/30 bg-destructive/5'
          : isNew
            ? 'border border-destructive/30 bg-destructive/5'
            : 'hover:bg-ssoo-content-bg/60',
      )}
    >
      <UserAvatar
        name={comment.author || 'Unknown'}
        email={comment.email}
        avatarUrl={comment.avatarUrl}
        size={isReply ? 22 : 26}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-label-sm text-ssoo-primary', isDeleted && 'line-through text-destructive/60')}>
            {comment.author || 'Unknown'}
          </span>
          <span className="text-ssoo-primary/50">{formatDate(comment.createdAt)}</span>
        </div>
        <p className={cn(
          'mt-0.5 whitespace-pre-wrap text-ssoo-primary/80',
          isDeleted && 'line-through text-destructive/50',
        )}>
          {mentionAuthor && (
            <span className="mr-1 text-label-sm text-blue-500">@{mentionAuthor}</span>
          )}
          {comment.content}
        </p>
        {!isDeleted && !editable && onReply && (
          <button
            type="button"
            onClick={() => onReply(comment)}
            className="mt-1 inline-flex items-center gap-0.5 text-ssoo-primary/50 hover:text-ssoo-primary"
          >
            <Reply className="h-3 w-3" />
            <span>답글</span>
          </button>
        )}
      </div>
      <div className="mt-0.5 flex shrink-0 items-center gap-1">
        {isDeleted && onRestore ? (
          <button
            type="button"
            onClick={() => onRestore(comment)}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-destructive/50 hover:text-ssoo-primary"
            title="되돌리기"
          >
            ↩
          </button>
        ) : editable && onDelete && !isDeleted ? (
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-red-400 hover:text-red-600"
            title="댓글 삭제"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface CommentsSectionProps {
  comments: DocumentComment[];
  editable?: boolean;
  onDelete: (commentId: string) => void;
  onRestore?: (comment: DocumentComment) => void;
  originalCommentIds?: string[];
  onReply?: (comment: DocumentComment) => void;
}

export function CommentsSection({
  comments,
  editable,
  onDelete,
  onRestore,
  originalCommentIds,
  onReply,
}: CommentsSectionProps) {
  const [pendingDeletes, setPendingDeletes] = React.useState<Set<string>>(new Set());

  const newCommentIds = React.useMemo(() => {
    if (!originalCommentIds || !editable) return undefined;
    const originalSet = new Set(originalCommentIds);
    const ids = new Set<string>();
    for (const c of comments) {
      if (!originalSet.has(c.id) && !pendingDeletes.has(c.id) && !c.deletedAt) ids.add(c.id);
    }
    return ids.size > 0 ? ids : undefined;
  }, [comments, originalCommentIds, editable, pendingDeletes]);

  const handleSoftDelete = (commentId: string) => {
    setPendingDeletes((prev) => new Set(prev).add(commentId));
    onDelete(commentId);
  };

  const handleRestore = (comment: DocumentComment) => {
    setPendingDeletes((prev) => { const next = new Set(prev); next.delete(comment.id); return next; });
    onRestore?.(comment);
  };

  const threads = React.useMemo(() => buildThreads(comments), [comments]);
  const totalCount = comments.filter((c) => !c.deletedAt && !pendingDeletes.has(c.id)).length;

  return (
    <CollapsibleSection
      title="댓글"
      icon={<MessageSquare className="mr-1.5 h-4 w-4 shrink-0" />}
      badge={totalCount > 0 ? <span className="mr-1 text-caption text-gray-400">({totalCount})</span> : undefined}
      defaultOpen
    >
      {threads.length === 0 ? (
        <p className="py-1 text-caption text-gray-400">댓글없음</p>
      ) : (
        <div className="space-y-1">
          {threads.map((thread) => {
            const isRootDeleted = pendingDeletes.has(thread.root.id);
            return (
              <div key={thread.root.id}>
                <CommentItem
                  comment={thread.root}
                  isNew={newCommentIds?.has(thread.root.id)}
                  isDeleted={isRootDeleted}
                  editable={editable}
                  onDelete={handleSoftDelete}
                  onRestore={handleRestore}
                  onReply={onReply}
                />
                {thread.replies.length > 0 && (
                  <RepliesGroup
                    replies={thread.replies}
                    rootAuthor={thread.root.author || 'Unknown'}
                    pendingDeletes={pendingDeletes}
                    newCommentIds={newCommentIds}
                    editable={editable}
                    onDelete={handleSoftDelete}
                    onRestore={handleRestore}
                    onReply={onReply}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
}

function RepliesGroup({
  replies,
  rootAuthor,
  pendingDeletes,
  newCommentIds,
  editable,
  onDelete,
  onRestore,
  onReply,
}: {
  replies: DocumentComment[];
  rootAuthor: string;
  pendingDeletes: Set<string>;
  newCommentIds?: Set<string>;
  editable?: boolean;
  onDelete: (id: string) => void;
  onRestore: (comment: DocumentComment) => void;
  onReply?: (comment: DocumentComment) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const visibleReplies = expanded ? replies : replies.slice(0, 1);
  const hiddenCount = replies.length - 1;

  return (
    <div className="mt-0.5">
      {visibleReplies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          isReply
          isNew={newCommentIds?.has(reply.id)}
          isDeleted={pendingDeletes.has(reply.id)}
          editable={editable}
          mentionAuthor={rootAuthor}
          onDelete={onDelete}
          onRestore={onRestore}
          onReply={onReply}
        />
      ))}
      {hiddenCount > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="ml-6 mt-0.5 text-caption text-blue-500 hover:text-blue-700"
        >
          답글 {hiddenCount}개 더 보기
        </button>
      )}
    </div>
  );
}
