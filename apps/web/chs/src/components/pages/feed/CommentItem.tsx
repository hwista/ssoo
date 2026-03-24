'use client';

import { useState } from 'react';
import { MessageCircleReply } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getTimeAgo } from '@/lib/utils';
import type { CommentItem as CommentEntity } from '@/lib/api/endpoints/comments';
import { CommentInput } from './CommentInput';

interface CommentTreeItem extends CommentEntity {
  children: CommentTreeItem[];
}

interface CommentItemProps {
  comment: CommentTreeItem;
  postId: string;
  depth?: number;
}

export function CommentItem({
  comment,
  postId,
  depth = 0,
}: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const initials =
    comment.author?.displayName?.slice(0, 2) ||
    comment.author?.userName?.slice(0, 2) ||
    '??';
  const indent = Math.min(depth, 4) * 20;

  return (
    <div className="space-y-3" style={{ marginLeft: `${indent}px` }}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author?.avatarUrl || undefined} />
          <AvatarFallback className="bg-ssoo-primary text-xs text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 rounded-lg bg-muted/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {comment.author?.displayName || comment.author?.userName || '알 수 없는 사용자'}
            </span>
            <span className="text-xs text-muted-foreground">
              {getTimeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{comment.content}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-auto px-0 py-0 text-xs text-muted-foreground"
            onClick={() => setShowReplyInput((prev) => !prev)}
          >
            <MessageCircleReply className="mr-1 h-3.5 w-3.5" />
            답글
          </Button>
        </div>
      </div>

      {showReplyInput && (
        <div style={{ marginLeft: `${Math.min(depth + 1, 4) * 20}px` }}>
          <CommentInput
            postId={postId}
            parentCommentId={comment.id}
            compact
            autoFocus
            onCancel={() => setShowReplyInput(false)}
            onSuccess={() => setShowReplyInput(false)}
          />
        </div>
      )}

      {comment.children.length > 0 && (
        <div className="space-y-3">
          {comment.children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              postId={postId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
