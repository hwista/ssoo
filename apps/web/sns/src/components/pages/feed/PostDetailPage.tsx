'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/common/StateDisplay';
import { useSharedPost } from '@/hooks/queries/usePosts';
import { ApiError } from '@/lib/api/client';
import { useAccessStore, useAuthStore, useTabStore } from '@/stores';
import { PostCard } from './PostCard';

export function PostDetailPage({ postId }: { postId: string }) {
  const canRead = useAccessStore((state) => state.snapshot?.features.canReadFeed ?? false);
  const userId = useAuthStore((state) => state.user?.userId);
  const active = useTabStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId)?.path === `/post/${postId}`);
  const query = useSharedPost(postId, canRead && active);
  const unavailable = !canRead || (query.error instanceof ApiError && [403, 404].includes(query.error.status ?? 0));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-heading-sm">게시물</h1>
        <Button asChild variant="outline" size="sm"><Link href="/">피드로 이동</Link></Button>
      </div>
      {unavailable ? (
        <EmptyState icon={<FileText className="h-12 w-12" />} title="게시물을 볼 수 없습니다."
          description="게시물이 없거나 열람할 수 없습니다." />
      ) : query.isError ? (
        <EmptyState title="게시물을 불러오지 못했습니다."
          action={<Button onClick={() => void query.refetch()} disabled={query.isFetching}>다시 시도</Button>} />
      ) : !query.data ? (
        <LoadingState message="게시물을 불러오는 중입니다." />
      ) : (
        <PostCard key={`${userId}:${postId}`} item={query.data} />
      )}
    </div>
  );
}
