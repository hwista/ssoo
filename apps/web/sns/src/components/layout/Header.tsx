'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SsooAppHeader, useSsooGlobalHeaderSearch } from '@ssoo/web-shell';
import { APP_HOME_PATH } from '@/lib/constants/routes';
import { useAccessStore, useTabStore } from '@/stores';
import { UserMenu } from './UserMenu';
import { HeaderNotifications } from './HeaderNotifications';

export function Header() {
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const openTab = useTabStore((state) => state.openTab);
  const router = useRouter();
  const canReadFeed = accessSnapshot?.features.canReadFeed ?? false;
  const canCreatePost = accessSnapshot?.features.canCreatePost ?? false;

  const globalHeaderSearch = useSsooGlobalHeaderSearch({
    disabled: !canReadFeed,
    onOpenSearch: ({ query, encodedQuery, path, title }) => {
      openTab({
        id: query ? `sns-global-search-${encodedQuery}` : 'sns-global-search',
        title,
        path,
        closable: true,
        activate: true,
      });
    },
  });

  return (
    <SsooAppHeader
      mode="primary"
      search={globalHeaderSearch.search}
      primaryAction={{
        label: '새 게시물',
        iconSlot: <Plus />,
        type: 'button',
        onClick: () => {
          if (!canCreatePost) {
            return;
          }
          router.push(`${APP_HOME_PATH}?compose=1`);
        },
        disabled: !canCreatePost,
        tone: 'primary-on-color',
        title: '새 게시물 작성',
      }}
      notificationSlot={<HeaderNotifications />}
      userMenuSlot={({ dropdownWidth }) => <UserMenu dropdownWidth={dropdownWidth} />}
    />
  );
}
