'use client';

import Link from 'next/link';
import { SsooErrorPanel } from '@ssoo/web-shell';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/common/StateDisplay';
import { useSharedPost } from '@/hooks/queries/usePosts';
import { ApiError } from '@/lib/api/client';
import { useAccessStore, useAuthStore, useTabStore } from '@/stores';
import { PostCard } from './PostCard';
import { PostAccessPanel } from './PostAccessPanel';

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
        <SsooErrorPanel kind="forbidden" title="게시물을 볼 수 없습니다."
          description="게시물이 없거나 열람할 수 없습니다." actions={[{ label: '피드로 이동', href: '/' }]} />
      ) : query.isError ? (
        <SsooErrorPanel error={query.error} title="게시물을 불러오지 못했습니다."
          onRetry={() => query.refetch()} retrying={query.isFetching} />
      ) : !query.data ? (
        <LoadingState message="게시물을 불러오는 중입니다." />
      ) : (
        <PostCard key={`post:${userId}:${postId}`} item={query.data} />
      )}
      {canRead && active ? <PostAccessPanel key={`access:${userId}:${postId}`} postId={postId} onChanged={() => void query.refetch()} /> : null}
    </div>
  );
}
