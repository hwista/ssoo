'use client';

import { FileText } from 'lucide-react';
import { ComposeBox } from './ComposeBox';
import { PostCard } from './PostCard';
import { EmptyState } from '@/components/common/StateDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeed } from '@/hooks/queries/usePosts';

export function FeedPage() {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useFeed();
  const feedItems = data?.pages.flatMap((p) => p.data?.data?.items || []) || [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <ComposeBox />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
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
            <div className="text-center py-4">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-sm text-ssoo-primary hover:underline"
              >
                {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
