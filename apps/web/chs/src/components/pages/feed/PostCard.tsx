'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToggleReaction, useToggleBookmark } from '@/hooks/queries/usePosts';
import type { FeedItem } from '@/lib/api/endpoints/posts';

interface PostCardProps {
  item: FeedItem;
}

export function PostCard({ item }: PostCardProps) {
  const { post, author, reactionCount, commentCount, isLiked, isBookmarked, tags } = item;
  const [showComments, setShowComments] = useState(false);
  const toggleReaction = useToggleReaction();
  const toggleBookmark = useToggleBookmark();

  const initials = author.displayName?.slice(0, 2) || author.userName.slice(0, 2);
  const timeAgo = getTimeAgo(post.createdAt);

  return (
    <Card>
      <CardContent className="p-4">
        {/* Author Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={author.avatarUrl || undefined} />
            <AvatarFallback className="bg-ssoo-primary text-white text-body-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-label-strong truncate">{author.displayName || author.userName}</span>
              {author.positionCode && (
                <span className="text-caption text-muted-foreground">· {author.positionCode}</span>
              )}
            </div>
            {author.departmentCode && (
              <p className="text-caption text-muted-foreground">{author.departmentCode}</p>
            )}
            <p className="text-caption text-muted-foreground">{timeAgo}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        {post.title && <h3 className="text-title-card mb-2">{post.title}</h3>}
        <p className="text-body-sm text-foreground whitespace-pre-wrap mb-3">{post.content}</p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-caption">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        {(reactionCount > 0 || commentCount > 0) && (
          <div className="flex items-center gap-4 text-caption text-muted-foreground mb-2">
            {reactionCount > 0 && <span>좋아요 {reactionCount}</span>}
            {commentCount > 0 && (
              <button className="hover:underline" onClick={() => setShowComments(!showComments)}>
                댓글 {commentCount}
              </button>
            )}
          </div>
        )}

        <Separator className="my-2" />

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-1', isLiked && 'text-red-500')}
            onClick={() => toggleReaction.mutate({ postId: post.id, isLiked })}
          >
            <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
            좋아요
          </Button>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setShowComments(!showComments)}>
            <MessageCircle className="h-4 w-4" />
            댓글
          </Button>
          <Button variant="ghost" size="sm" className="gap-1">
            <Share2 className="h-4 w-4" />
            공유
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-1', isBookmarked && 'text-ssoo-primary')}
            onClick={() => toggleBookmark.mutate({ postId: post.id, isBookmarked })}
          >
            <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current')} />
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diffMs = now - past;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}
