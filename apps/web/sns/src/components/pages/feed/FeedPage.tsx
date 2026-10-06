'use client';

import { SsooErrorPanel } from '@ssoo/web-shell';

import { FeedContextRail } from './FeedContextRail';
import { FeedIdentityRail } from './FeedIdentityRail';
import { FeedTimeline } from './FeedTimeline';
import { useAccessStore } from '@/stores';

export function FeedPage() {
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const canReadFeed = accessSnapshot?.features.canReadFeed ?? false;

  if (!canReadFeed) {
    return (
      <div className="mx-auto max-w-2xl">
        <SsooErrorPanel kind="forbidden" title="피드 접근 권한이 없습니다" description="현재 계정에는 SNS 피드를 조회할 권한이 없습니다."
          actions={[{ label: '다른 서비스·계정으로 이동', href: '/recovery' }]} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      <aside className="hidden self-start lg:sticky lg:top-6 lg:block">
        <FeedIdentityRail />
      </aside>
      <FeedTimeline />
      <aside className="hidden self-start xl:sticky xl:top-6 xl:block">
        <FeedContextRail />
      </aside>
    </div>
  );
}
