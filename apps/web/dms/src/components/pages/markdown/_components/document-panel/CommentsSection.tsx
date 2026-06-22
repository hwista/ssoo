'use client';

import * as React from 'react';
import { Eye, EyeOff, MessageSquare, Reply, X } from 'lucide-react';
import type { DocumentComment } from '@/types';
import { UserAvatar } from '@/components/common';
import { CollapsibleSection } from '@/components/templates/page-frame/panel/CollapsibleSection';
import { cn } from '@/lib/utils';
import { Button } from '@ssoo/web-ui';

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

function resolveMentionAuthor(comment: DocumentComment, commentMap: Map<string, DocumentComment>): string | undefined {
  if (!comment.parentId) {
    return undefined;
  }

  const parent = commentMap.get(comment.parentId);
  return parent?.author || 'Unknown';
}

function CommentItem({
  comment,
  isReply,
  canDelete,
  canRestore,
  canViewDeletedDetails,
  canReply,
  mentionAuthor,
  onDelete,
  onRestore,
  onReply,
}: {
  comment: DocumentComment;
  isReply?: boolean;
  canDelete?: boolean;
  canRestore?: boolean;
  canViewDeletedDetails?: boolean;
  canReply?: boolean;
  mentionAuthor?: string;
  onDelete?: (id: string) => void | Promise<void>;
  onRestore?: (comment: DocumentComment) => void | Promise<void>;
  onReply?: (comment: DocumentComment) => void;
}) {
  const isTombstone = !!comment.deletedAt;
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  if (isTombstone && canViewDeletedDetails && detailsOpen) {
    return (
      <div
        className={cn(
          'flex gap-2 rounded-md px-1.5 py-1.5 text-caption transition-colors hover:bg-ssoo-content-bg/60',
          isReply && 'ml-6',
        )}
      >
        <div className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-gray-100">
          <X className="h-3 w-3 text-gray-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 italic text-ssoo-primary/60">
            <span className="text-label-sm">
              {comment.author || 'Unknown'}
            </span>
            <span>{formatDate(comment.createdAt)}</span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap italic text-ssoo-primary/65">
            {mentionAuthor && (
              <span className="mr-1 text-label-sm text-blue-500/70">@{mentionAuthor}</span>
            )}
            {comment.content}
          </p>
          <p className="mt-1 text-ssoo-primary/50">
            삭제됨
            {' · '}
            {formatDate(comment.deletedAt)}
            {comment.deletedByName ? ` · ${comment.deletedByName}` : ''}
          </p>
        </div>
        <div className="mt-0.5 flex shrink-0 items-center gap-1">
          <Button variant="plain" size="plain"
            type="button"
            onClick={() => setDetailsOpen(false)}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-ssoo-primary/50 hover:text-ssoo-primary"
            title="삭제된 댓글 숨기기"
          >
            <EyeOff className="h-3 w-3" />
          </Button>
          {canRestore && onRestore ? (
            <Button variant="plain" size="plain"
              type="button"
              onClick={() => { void onRestore(comment); }}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-ssoo-primary/50 hover:text-ssoo-primary"
              title="되돌리기"
            >
              ↩
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (isTombstone) {
    return (
      <div className={cn(
        'flex gap-2 rounded-md px-1.5 py-1.5 text-caption text-ssoo-primary/40',
        isReply && 'ml-6',
      )}>
        <div className="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-gray-100">
          <X className="h-3 w-3 text-gray-400" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block py-1 italic">삭제된 댓글입니다.</span>
        </div>
        <div className="mt-0.5 flex shrink-0 items-center gap-1">
          {canViewDeletedDetails ? (
            <Button variant="plain" size="plain"
              type="button"
              onClick={() => setDetailsOpen((value) => !value)}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-ssoo-primary/50 hover:text-ssoo-primary"
              title="삭제된 댓글 보기"
            >
              <Eye className="h-3 w-3" />
            </Button>
          ) : null}
          {canRestore && onRestore ? (
            <Button variant="plain" size="plain"
              type="button"
              onClick={() => { void onRestore(comment); }}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-ssoo-primary/50 hover:text-ssoo-primary"
              title="되돌리기"
            >
              ↩
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2 rounded-md px-1.5 py-1.5 text-caption transition-colors',
        isReply && 'ml-6',
        'hover:bg-ssoo-content-bg/60',
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
          <span className="text-label-sm text-ssoo-primary">
            {comment.author || 'Unknown'}
          </span>
          <span className="text-ssoo-primary/50">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-ssoo-primary/80">
          {mentionAuthor && (
            <span className="mr-1 text-label-sm text-blue-500">@{mentionAuthor}</span>
          )}
          {comment.content}
        </p>
        {canReply && onReply && (
          <Button variant="plain" size="plain"
            type="button"
            onClick={() => onReply(comment)}
            className="mt-1 inline-flex items-center gap-0.5 text-ssoo-primary/50 hover:text-ssoo-primary"
          >
            <Reply className="h-3 w-3" />
            <span>답글</span>
          </Button>
        )}
      </div>
      <div className="mt-0.5 flex shrink-0 items-center gap-1">
        {canDelete && onDelete ? (
          <Button variant="plain" size="plain"
            type="button"
            onClick={() => { void onDelete(comment.id); }}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-red-400 hover:text-red-600"
            title="댓글 삭제"
          >
            <X className="h-3 w-3" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export interface CommentsSectionProps {
  comments: DocumentComment[];
  currentUserId?: string;
  canManageComments?: boolean;
  canReply?: boolean;
  onDelete: (commentId: string) => void | Promise<void>;
  onRestore?: (comment: DocumentComment) => void | Promise<void>;
  onReply?: (comment: DocumentComment) => void;
  locked?: boolean;
}

export function CommentsSection({
  comments,
  currentUserId,
  canManageComments = false,
  canReply = false,
  onDelete,
  onRestore,
  onReply,
  locked = false,
}: CommentsSectionProps) {
  const threads = React.useMemo(() => buildThreads(comments), [comments]);
  const commentMap = React.useMemo(() => new Map(comments.map((comment) => [comment.id, comment])), [comments]);
  const totalCount = comments.filter((c) => !c.deletedAt).length;

  const canDeleteComment = React.useCallback((comment: DocumentComment) => (
    canManageComments || Boolean(currentUserId && comment.authorUserId === currentUserId)
  ), [canManageComments, currentUserId]);
  const canRestoreComment = React.useCallback((comment: DocumentComment) => (
    Boolean(currentUserId && comment.deletedByUserId === currentUserId)
  ), [currentUserId]);
  const canViewDeletedDetails = React.useCallback((comment: DocumentComment) => (
    canManageComments || Boolean(currentUserId && comment.deletedByUserId === currentUserId)
  ), [canManageComments, currentUserId]);

  return (
    <CollapsibleSection
      title="댓글"
      icon={<MessageSquare className="mr-1.5 h-4 w-4 shrink-0" />}
      badge={!locked && totalCount > 0 ? <span className="mr-1 text-caption text-gray-400">({totalCount})</span> : undefined}
      defaultOpen
      locked={locked}
    >
      {threads.length === 0 ? (
        <p className="py-1 text-caption text-gray-400">댓글없음</p>
      ) : (
        <div className="space-y-1">
          {threads.map((thread) => {
            return (
              <div key={thread.root.id}>
                <CommentItem
                  comment={thread.root}
                  canDelete={canDeleteComment(thread.root)}
                  canRestore={canRestoreComment(thread.root)}
                  canViewDeletedDetails={canViewDeletedDetails(thread.root)}
                  canReply={canReply && !thread.root.deletedAt}
                  onDelete={onDelete}
                  onRestore={onRestore}
                  onReply={onReply}
                />
                {thread.replies.length > 0 && (
                  <RepliesGroup
                    replies={thread.replies}
                    commentMap={commentMap}
                    currentUserId={currentUserId}
                    canManageComments={canManageComments}
                    canRestoreComment={canRestoreComment}
                    canViewDeletedDetails={canViewDeletedDetails}
                    canReply={canReply}
                    onDelete={onDelete}
                    onRestore={onRestore}
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
  commentMap,
  currentUserId,
  canManageComments,
  canRestoreComment,
  canViewDeletedDetails,
  canReply,
  onDelete,
  onRestore,
  onReply,
}: {
  replies: DocumentComment[];
  commentMap: Map<string, DocumentComment>;
  currentUserId?: string;
  canManageComments: boolean;
  canRestoreComment: (comment: DocumentComment) => boolean;
  canViewDeletedDetails: (comment: DocumentComment) => boolean;
  canReply: boolean;
  onDelete: (id: string) => void | Promise<void>;
  onRestore?: (comment: DocumentComment) => void | Promise<void>;
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
          canDelete={canManageComments || Boolean(currentUserId && reply.authorUserId === currentUserId)}
          canRestore={canRestoreComment(reply)}
          canViewDeletedDetails={canViewDeletedDetails(reply)}
          canReply={canReply && !reply.deletedAt}
          mentionAuthor={resolveMentionAuthor(reply, commentMap)}
          onDelete={onDelete}
          onRestore={onRestore}
          onReply={onReply}
        />
      ))}
      {hiddenCount > 0 && !expanded && (
        <Button variant="plain" size="plain"
          type="button"
          onClick={() => setExpanded(true)}
          className="ml-6 mt-0.5 text-caption text-blue-500 hover:text-blue-700"
        >
          답글 {hiddenCount}개 더 보기
        </Button>
      )}
    </div>
  );
}
