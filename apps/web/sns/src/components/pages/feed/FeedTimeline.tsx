'use client';

import { SsooErrorPanel, SsooErrorNotice } from '@ssoo/web-shell';

import { FileText } from 'lucide-react';
import { ComposeBox } from './ComposeBox';
import { PostCard } from './PostCard';
import { EmptyState } from '@/components/common/StateDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeed } from '@/hooks/queries/usePosts';
import { useAccessStore } from '@/stores';
import { Button } from '@ssoo/web-ui';

export function FeedTimeline() {
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const canReadFeed = accessSnapshot?.features.canReadFeed ?? false;
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage, isError, error, refetch } = useFeed(undefined, canReadFeed);
  const feedItems = data?.pages.flatMap((page) => page.data?.data?.items || []) || [];

  if (!canReadFeed) {
    return (
      <SsooErrorPanel kind="forbidden" title="피드 접근 권한이 없습니다" description="현재 계정에는 SNS 피드를 조회할 권한이 없습니다."
          actions={[{ label: '다른 서비스·계정으로 이동', href: '/recovery' }]} />
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <ComposeBox />
      {isError && feedItems.length > 0 ? <SsooErrorNotice error={error}
        actions={[{ label: '다시 불러오기', onClick: () => refetch() }]} /> : null}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : isError && feedItems.length === 0 ? (
        <SsooErrorPanel error={error} title="피드를 불러오지 못했습니다" onRetry={() => refetch()}
          actions={[{ label: '다른 서비스·계정으로 이동', href: '/recovery' }]} />
      ) : feedItems.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="아직 게시물이 없습니다"
          description="첫 번째 게시물을 작성해 보세요!"
        />
      ) : (
        <>
          <div className="space-y-4">
            {feedItems.map((item) => (
              <PostCard key={item.post.id} item={item} />
            ))}
          </div>
          {hasNextPage && (
            <div className="py-4 text-center">
              <Button variant="plain" size="plain"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-sm text-ssoo-primary hover:underline"
              >
                {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
