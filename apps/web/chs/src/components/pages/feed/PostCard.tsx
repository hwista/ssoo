'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn, getTimeAgo } from '@/lib/utils';
import { useToggleReaction, useToggleBookmark } from '@/hooks/queries/usePosts';
import type { FeedItem } from '@/lib/api/endpoints/posts';
import { CommentSection } from './CommentSection';
import { EditPostDialog } from './EditPostDialog';
import { PostMenu } from './PostMenu';

interface PostCardProps {
  item: FeedItem;
}

export function PostCard({ item }: PostCardProps) {
  const { post, author, reactionCount, commentCount, isLiked, isBookmarked, tags } = item;
  const [showComments, setShowComments] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const toggleReaction = useToggleReaction();
  const toggleBookmark = useToggleBookmark();

  const initials = author.displayName?.slice(0, 2) || author.userName.slice(0, 2);
  const timeAgo = getTimeAgo(post.createdAt);
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/post/${post.id}`
      );
      toast.success('링크가 복사되었습니다.');
    } catch {
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Author Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={author.avatarUrl || undefined} />
            <AvatarFallback className="bg-ssoo-primary text-white text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{author.displayName || author.userName}</span>
              {author.positionCode && (
                <span className="text-xs text-muted-foreground">· {author.positionCode}</span>
              )}
            </div>
            {author.departmentCode && (
              <p className="text-xs text-muted-foreground">{author.departmentCode}</p>
            )}
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
          <PostMenu
            postId={post.id}
            authorUserId={post.authorUserId}
            onEdit={() => setEditDialogOpen(true)}
          />
        </div>

        {/* Content */}
        <div className="mb-3 space-y-2">
          {post.title && (
            <Link href={`/post/${post.id}`} className="block">
              <h3 className="font-semibold hover:underline">{post.title}</h3>
            </Link>
          )}
          <Link href={`/post/${post.id}`} className="block">
            <p className="text-sm text-foreground whitespace-pre-wrap hover:text-ssoo-primary transition-colors">
              {post.content}
            </p>
          </Link>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        {(reactionCount > 0 || commentCount > 0) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
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
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => void handleShare()}>
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

        {showComments && <CommentSection postId={post.id} />}
        <EditPostDialog
          postId={post.id}
          initialTitle={post.title}
          initialContent={post.content}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      </CardContent>
    </Card>
  );
}
