'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  SsooHeader,
  SsooHeaderActionButton,
  SsooHeaderIconButton,
  SsooHeaderSearchBox,
} from '@ssoo/web-shell';
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
    <SsooHeader
      mode="primary"
      searchSlot={
        <SsooHeaderSearchBox
          placeholder={canReadFeed ? '사람, 게시물, 스킬 검색...' : 'SNS 접근 권한이 없습니다.'}
          iconSlot={<Search className="h-4 w-4 text-white/50" />}
          onFocus={() => {
            if (!canReadFeed) {
              return;
            }
            router.push('/search');
          }}
          disabled={!canReadFeed}
          readOnly
        />
      }
      actionsSlot={
        <div ref={actionsRef} className="flex items-center gap-2">
          <SsooHeaderActionButton
            type="button"
            onClick={() => {
              if (!canCreatePost) {
                return;
              }
              router.push(`${APP_HOME_PATH}?compose=1`);
            }}
            disabled={!canCreatePost}
            tone="primary-on-color"
            title="새 게시물 작성"
          >
            <Plus className="h-4 w-4" />
            <span>새 게시물</span>
          </SsooHeaderActionButton>

          <SsooHeaderIconButton type="button" title="알림">
            <Bell className="h-5 w-5 text-white" />
            {unreadCount > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-ls-red" /> : null}
          </SsooHeaderIconButton>

          <UserMenu dropdownWidth={actionsWidth} />
        </div>
      }
      actionsClassName="gap-0"
    />
  );
}
