'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, LoadingState } from '@/components/common/StateDisplay';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CommentSection } from '@/components/pages/feed/CommentSection';
import { EditPostDialog } from '@/components/pages/feed/EditPostDialog';
import { PostMenu } from '@/components/pages/feed/PostMenu';
import {
  usePostDetail,
  useToggleBookmark,
  useToggleReaction,
} from '@/hooks/queries/usePosts';
import { cn, getTimeAgo } from '@/lib/utils';

interface PostDetailPageProps {
  postId: string;
}

export function PostDetailPage({ postId }: PostDetailPageProps) {
  const router = useRouter();
  const postQuery = usePostDetail(postId);
  const toggleReaction = useToggleReaction();
  const toggleBookmark = useToggleBookmark();
  const commentSectionRef = useRef<HTMLDivElement | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const post = postQuery.data?.data?.data;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/post/${postId}`
      );
      toast.success('게시물 링크가 복사되었습니다.');
    } catch {
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  if (postQuery.isLoading) {
    return <LoadingState fullHeight message="게시물을 불러오는 중..." />;
  }

  if (!post) {
    return (
      <EmptyState
        className="min-h-[400px]"
        title="게시물을 찾을 수 없습니다"
        description="삭제되었거나 접근할 수 없는 게시물입니다."
        action={
          <Button variant="outline" onClick={() => router.push('/')}>
            피드로 이동
          </Button>
        }
      />
    );
  }

  const authorName = post.author?.displayName || post.author?.userName || '알 수 없는 사용자';
  const initials =
    post.author?.displayName?.slice(0, 2) ||
    post.author?.userName?.slice(0, 2) ||
    '??';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          뒤로가기
        </Button>
        {post.board && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/board/${post.board.id}`}>{post.board.boardName}</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={post.author?.avatarUrl || undefined} />
              <AvatarFallback className="bg-ssoo-primary text-sm text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{authorName}</span>
                {post.author?.positionCode && (
                  <span className="text-sm text-muted-foreground">
                    · {post.author.positionCode}
                  </span>
                )}
              </div>
              {post.author?.departmentCode && (
                <p className="text-sm text-muted-foreground">
                  {post.author.departmentCode}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {getTimeAgo(post.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void handleShare()}>
                <Share2 className="mr-1 h-4 w-4" />
                공유
              </Button>
              <PostMenu
                postId={post.id}
                authorUserId={post.authorUserId}
                onEdit={() => setEditDialogOpen(true)}
                onDeleteSuccess={() => router.push('/')}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-3">
            {post.title && <h1 className="text-2xl font-semibold">{post.title}</h1>}
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {post.content}
            </p>
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" />
              조회 {post.viewCount}
            </span>
            <span>좋아요 {post.reactionCount}</span>
            <span>댓글 {post.commentCount}</span>
            <span>저장 {post.bookmarkCount}</span>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(post.isLiked && 'text-red-500')}
              onClick={() =>
                toggleReaction.mutate({
                  postId: post.id,
                  isLiked: post.isLiked,
                })
              }
            >
              <Heart className={cn('mr-1 h-4 w-4', post.isLiked && 'fill-current')} />
              좋아요
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                commentSectionRef.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }
            >
              <MessageCircle className="mr-1 h-4 w-4" />
              댓글
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleShare()}>
              <Share2 className="mr-1 h-4 w-4" />
              공유
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(post.isBookmarked && 'text-ssoo-primary')}
              onClick={() =>
                toggleBookmark.mutate({
                  postId: post.id,
                  isBookmarked: post.isBookmarked,
                })
              }
            >
              <Bookmark
                className={cn(
                  'mr-1 h-4 w-4',
                  post.isBookmarked && 'fill-current'
                )}
              />
              저장
            </Button>
          </div>

          <CommentSection ref={commentSectionRef} postId={postId} />
          <EditPostDialog
            postId={post.id}
            initialTitle={post.title}
            initialContent={post.content}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        </CardContent>
      </Card>
    </div>
  );
}
