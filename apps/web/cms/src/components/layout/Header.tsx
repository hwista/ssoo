'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { APP_HOME_PATH } from '@/lib/constants/routes';
import { useUnreadCount } from '@/hooks/queries/useNotifications';
import { useAccessStore } from '@/stores';
import { UserMenu } from './UserMenu';

export function Header() {
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsWidth, setActionsWidth] = useState(0);
  const canReadFeed = accessSnapshot?.features.canReadFeed ?? false;
  const canCreatePost = accessSnapshot?.features.canCreatePost ?? false;
  const unreadCount = useUnreadCount().data?.data?.data?.count ?? 0;

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const update = () => setActionsWidth(el.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header className="flex h-header-h items-center justify-between bg-ssoo-primary px-4">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <Input
            placeholder={canReadFeed ? '사람, 게시물, 스킬 검색...' : 'CMS 접근 권한이 없습니다.'}
            className="h-control-h border-white/20 bg-white/10 pl-9 text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-0"
            onFocus={() => {
              if (!canReadFeed) {
                return;
              }
              router.push('/search');
            }}
            disabled={!canReadFeed}
            readOnly
          />
        </div>
      </div>

      <div ref={actionsRef} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!canCreatePost) {
              return;
            }
            router.push(`${APP_HOME_PATH}?compose=1`);
          }}
          disabled={!canCreatePost}
          className="flex h-control-h items-center gap-1 rounded-md bg-white px-3 text-label-md text-ssoo-primary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-white/70 disabled:text-ssoo-primary/60"
        >
          <Plus className="h-4 w-4" />
          <span>새 게시물</span>
        </button>

        <button
          type="button"
          className="relative flex h-control-h w-control-h items-center justify-center rounded-md transition-colors hover:bg-white/10"
          title="알림"
        >
          <Bell className="h-5 w-5 text-white" />
          {unreadCount > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-ls-red" /> : null}
        </button>

        <UserMenu dropdownWidth={actionsWidth} />
      </div>
    </header>
  );
}
